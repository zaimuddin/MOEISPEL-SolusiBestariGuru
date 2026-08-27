// ==UserScript==
// @name         MOEISPEL–SolusiBestariGuru
// @namespace    SolusiBestariGuru-t.me-solusibestariguru
// @description  SolusiBestariGuru untuk pengurusan kehadiran harian/mingguan, pengekstrakan maklumat profil murid dan muat turun senarai nama di sistem MOEISPEL KPM.
// @icon         https://www.google.com/s2/favicons?sz=64&domain=moe.gov.my
// @version      3.0.20260825
// @supportURL   https://t.me/bincangsolusibestariguru
// @updateURL    https://raw/MOEISPEL-SolusiBestariGuru.user.js
// @downloadURL  https://raw/MOEISPEL-SolusiBestariGuru.user.js
// @author       Ustaz Zaimuddin Hassan (https://t.me/zaimuddinhassan), Guru Al-Quran dan Bahasa Arab, SMK Padang Pak Amat, Pasir Puteh, Kelantan.
// @match        https://moeispel.moe.gov.my/
// @match        https://moeispel.moe.gov.my/sahsiah/kehadiran/pkhem/tabguru
// @match        https://moeispel.moe.gov.my/sahsiah/kehadiran/tabguru
// @match        https://moeispel.moe.gov.my/profil/pelajar*
// @match        https://moeispel.moe.gov.my/profil/pelajar/dashboard
// @connect      idme.moe.gov.my
// @connect      moeispel.moe.gov.my
// @connect      self
// @connect      cdnjs.cloudflare.com
// @connect      cdn.jsdelivr.net
// @connect      cdn.datatables.net
// @connect      code.jquery.com
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// @grant        GM.notification
// @grant        GM_getResourceText
// @grant        unsafeWindow
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const currentUrl = window.location.href;

  if (currentUrl.includes('/sahsiah/kehadiran')) {
    runKehadiranScript();
  } else if (currentUrl.includes('/profil/pelajar')) {
    runProfilPelajarScript();
  } else if (currentUrl === 'https://moeispel.moe.gov.my/' || currentUrl === 'https://moeispel.moe.gov.my') {
    runDownloadListScript();
  }

  /**
   * Mengesan jika respons adalah HTML (bukan JSON)
   * Petunjuk HTML: <html, <head, <body, <!DOCTYPE
   */
  function isHTMLResponse(responseText) {
    if (!responseText || typeof responseText !== 'string') return false;
    const trimmed = responseText.trim().toLowerCase();
    return /^<(!doctype|html|head|body)/.test(trimmed);
  }

  /**
   * Fungsi makeRequest global yang robust untuk menangani CORS dan error handling
   * PENTING: Logik HTML response handling bergantung pada responseType!
   */
  function makeRequest(method, url, data = null, responseType = 'json', headers = {}, timeout = 0) {
    return new Promise((resolve, reject) => {
      const xhrOptions = {
        method,
        url,
        data,
        headers,
        responseType,
        onload: r => {
          // ===== LOGIK HANDLING HTML RESPONSE BERDASARKAN RESPONSE TYPE =====
          const isHTML = isHTMLResponse(r.responseText);

          // Jika responseType adalah 'json', HTML response adalah ERROR
          if (isHTML && responseType === 'json') {
            console.error(`HTML response (bukan JSON) dari ${url} (status: ${r.status})`);
            console.error(`Respons pertama 500 karakter:`, r.responseText?.substring(0, 500));

            // Analisis jenis error berdasarkan HTML content
            let errorAnalysis = 'HTML response (kemungkinan error page atau redirect)';
            if (r.responseText.toLowerCase().includes('login')) {
              errorAnalysis = 'Session mungkin expired - login page dikesan';
            } else if (r.responseText.toLowerCase().includes('csrf')) {
              errorAnalysis = 'CSRF token mungkin tidak sah';
            } else if (r.responseText.toLowerCase().includes('404')) {
              errorAnalysis = 'Endpoint tidak ditemui (404)';
            } else if (r.responseText.toLowerCase().includes('500')) {
              errorAnalysis = 'Server error (500)';
            }

            reject({
              status: r.status,
              statusText: `${errorAnalysis} - API mengembalikan HTML bukan JSON`,
              responseText: r.responseText || '',
              isHTMLResponse: true,
              error: new Error('HTML response instead of JSON'),
            });
            return;
          }

          // Jika responseType adalah 'text' atau 'html', HTML response adalah SUCCESS
          if (isHTML && (responseType === 'text' || responseType === 'html')) {
            if (r.status >= 200 && r.status < 300) {
              console.log(`HTML response diterima untuk ${url} (status: ${r.status})`);
              resolve(r.responseText);
              return;
            }
          }

          // ===== HANDLING STATUS CODE & PARSING =====
          if (r.status >= 200 && r.status < 300) {
            if (responseType === 'json') {
              // Parse JSON response
              let parsedResponse = null;
              let parseError = null;

              if (r.response && typeof r.response === 'object') {
                parsedResponse = r.response;
              } else if (r.responseText) {
                try {
                  parsedResponse = JSON.parse(r.responseText);
                } catch (e) {
                  parseError = e;
                  console.error(`JSON parse error from ${url}:`, e);
                  console.error(`Response text (first 500 chars):`, r.responseText?.substring(0, 500));
                }
              }

              // Jika parse gagal atau respons kosong, reject
              if (parseError || parsedResponse === null) {
                console.error(`Invalid JSON response from ${url}`, {
                  status: r.status,
                  statusText: r.statusText,
                  parseError: parseError?.message || 'No data',
                  responseLength: r.responseText?.length || 0,
                });
                reject({
                  status: r.status,
                  statusText: 'Invalid or empty JSON response',
                  responseText: r.responseText || '',
                  parseError: parseError,
                  error: new Error('Invalid JSON response'),
                });
                return;
              }

              resolve(parsedResponse);
            } else if (responseType === 'text') {
              // Return text response as-is
              resolve(r.responseText);
            } else {
              // Untuk responseType lainnya (blob, arrayBuffer, dll)
              resolve(r.response);
            }
          } else {
            // HTTP error status (4xx, 5xx, dll)
            console.error(`HTTP error ${r.status} from ${url}`, r);
            reject({
              status: r.status,
              statusText: r.statusText,
              responseText: r.responseText,
              response: r.response,
            });
          }
        },
        onerror: e => {
          console.error(`Network error during request to ${url}`, e);
          reject(e);
        },
        ontimeout: () => {
          console.warn(`Request timed out for ${url}`);
          reject(new Error(`Request timed out after ${timeout}ms`));
        },
      };

      if (timeout > 0) {
        xhrOptions.timeout = timeout;
      }
      GM.xmlHttpRequest(xhrOptions);
    });
  }

  // Mapping "T5 - SAINS" -> "5 SAINS"
  function formatTingkatanKelas(teksAsal) {
    if (!teksAsal) return '';
    const str = teksAsal.trim();
    const padanan = str.match(/^T(\d+)\s*-\s*(.+)$/i);
    if (padanan) {
      const nombor = padanan[1];
      const namaKelas = padanan[2];
      return `${nombor} ${namaKelas}`.trim();
    }
    return str;
  }

  // ==========================================
  // SUBSISTEM 0: MUAT TURUN SENARAI NAMA MURID (HALAMAN UTAMA)
  // ==========================================
  function runDownloadListScript() {
    // Cari elemen-elemen yang diperlukan
    const kelasSelect = document.querySelector('#ddl_kelas');
    const formDiv = document.querySelector('#form-pilih-kelas > div');
    const tokenInput = document.querySelector('input[type="hidden"][name="_token"]');

    if (!kelasSelect || !formDiv || !tokenInput) {
      console.log('Elemen yang diperlukan tidak dijumpai untuk runDownloadListScript');
      return;
    }

    // Jika butang sudah ada, jangan tambahkan lagi
    if (document.querySelector('#sbg-download-list-btn')) {
      return;
    }

    // Cipta butang "Muat Turun Senarai Nama"
    const btn = document.createElement('button');
    btn.textContent = 'Muat Turun Senarai Nama';
    btn.type = 'button';
    btn.className = 'btn btn-info btn-rounded btn-sm';
    btn.id = 'sbg-download-list-btn';
    btn.style.marginLeft = '8px';

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const originalText = btn.textContent;

      try {
        await handleDownloadList();
      } catch (error) {
        console.error('Ralat dalam handleDownloadList:', error);
        await notifyUserDownloadList('Ralat semasa memuat turun senarai. Semak konsol (F12).', 'Ralat', true, true);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });

    // Tambahkan butang ke dalam form
    formDiv.appendChild(btn);
    document.querySelector('#form-pilih-kelas > div > div').className = 'col-md-6';

    // ===== Helper Functions untuk Download List =====

    async function notifyUserDownloadList(
      message,
      title = 'Muat Turun Senarai Nama',
      isWarning = false,
      isError = false,
      duration = 4000,
    ) {
      const notificationStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor:
          isError ? '#f8d7da'
          : isWarning ? '#fff3cd'
          : '#d1ecf1',
        border: `1px solid ${
          isError ? '#f5c6cb'
          : isWarning ? '#ffeaa7'
          : '#bee5eb'
        }`,
        borderRadius: '4px',
        padding: '16px',
        zIndex: '99999',
        maxWidth: '500px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        fontSize: '14px',
        color:
          isError ? '#721c24'
          : isWarning ? '#856404'
          : '#0c5460',
      };

      const notif = document.createElement('div');
      Object.assign(notif.style, notificationStyle);
      notif.innerHTML = `<strong>${title}</strong><br>${message}`;
      document.body.appendChild(notif);

      setTimeout(() => {
        notif.remove();
      }, duration);
    }

    function formatNoKp(noKp) {
      const digits = (noKp || '').replace(/\D/g, '');
      if (digits.length === 12) {
        return digits.slice(0, 6) + '-' + digits.slice(6, 8) + '-' + digits.slice(8);
      }
      return noKp;
    }

    function extractMuridFromHTML(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const table = doc.querySelector('#kessalahlaku');
      if (!table) {
        console.warn('Jadual #kessalahlaku tidak dijumpai');
        return [];
      }

      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const tempResult = [];

      for (const tr of rows) {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 5) continue;

        const nama = cells[2]?.textContent.trim();
        const noKpRaw = cells[3]?.textContent.trim();
        const tingkatanKelasAsal = cells[4]?.textContent.trim();

        if (!nama || !noKpRaw) continue;

        const noKp = formatNoKp(noKpRaw);
        const tingkatanKelas = formatTingkatanKelas(tingkatanKelasAsal);

        tempResult.push({
          nama,
          noKp,
          tingkatanKelas,
        });
      }

      // Susun mengikut nama ASC
      tempResult.sort((a, b) => a.nama.localeCompare(b.nama));

      // Buat bil berdasarkan urutan selepas sorting
      const result = tempResult.map((item, index) => ({
        bil: String(index + 1),
        nama: item.nama,
        noKp: item.noKp,
        tingkatanKelas: item.tingkatanKelas,
      }));

      return result;
    }

    function exportToCSV(filename, data) {
      if (!data.length) {
        notifyUserDownloadList('Tiada data untuk dimuat turun.', 'Maklumat', false, false);
        return;
      }

      const headers = ['Bil', 'Nama', 'MyKad', 'Kelas'];
      const rows = [headers.join(',')];

      for (const record of data) {
        const row = [record.bil || '', record.nama || '', record.noKp || '', record.tingkatanKelas || '']
          .map(v => {
            const str = String(v).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',');
        rows.push(row);
      }

      const csvContent = '\uFEFF' + rows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    async function fetchAndParseKelas(token, kelasId, kelasLabel) {
      const url = 'https://moeispel.moe.gov.my/sahsiah/salahLaku/carianMurid/papar';

      const payloadObj = {
        _token: token,
        selTahunTing: '',
        rselTahunTing: '',
        selKelas: kelasId,
        txtNama: '',
        txtNoid: '',
      };

      const payload = Object.entries(payloadObj)
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&');

      try {
        const html = await makeRequest('POST', url, payload, 'text', {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'X-Requested-With': 'XMLHttpRequest',
        });

        const muridData = extractMuridFromHTML(html);
        console.log(`Dijumpai ${muridData.length} murid untuk kelas: ${kelasLabel}`);
        return muridData;
      } catch (error) {
        console.error(`Ralat mengambil data untuk kelas ${kelasLabel}:`, error);
        return [];
      }
    }

    async function handleDownloadList() {
      const token = tokenInput.value;
      const selectedValue = kelasSelect.value;
      const selectedText = kelasSelect.options[kelasSelect.selectedIndex].textContent.trim();

      if (selectedValue === '0') {
        // Papar Semua Kelas - ambil semua kelas
        btn.textContent = 'Sedang memproses semua kelas...';
        await notifyUserDownloadList('Sedang memproses semua kelas. Sila tunggu...', 'Maklumat');

        const allData = [];
        const options = Array.from(kelasSelect.options).filter(opt => opt.value !== '0');

        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          const optionLabel = opt.textContent.trim();
          btn.textContent = `Memproses kelas (${i + 1}/${options.length}): ${optionLabel}...`;

          const muridData = await fetchAndParseKelas(token, opt.value, optionLabel);
          allData.push(...muridData);

          // Delay antara requests
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Export ke CSV
        const tarikh = new Date().toISOString().split('T')[0];
        const filename = `Senarai_Semua_Kelas_${tarikh}.csv`;
        exportToCSV(filename, allData);
        await notifyUserDownloadList(
          `Selesai! Sejumlah ${allData.length} nama murid dikumpul dari semua kelas dan dimuat turun sebagai ${filename}.`,
          'Berjaya',
          false,
          false,
          5000,
        );
      } else {
        // Satu kelas yang dipilih
        btn.textContent = `Memproses ${selectedText}...`;

        const muridData = await fetchAndParseKelas(token, selectedValue, selectedText);

        // Export ke CSV
        const tarikh = new Date().toISOString().split('T')[0];
        const filename = `${selectedText}_${tarikh}.csv`;
        exportToCSV(filename, muridData);

        await notifyUserDownloadList(
          `Selesai! Sejumlah ${muridData.length} nama murid dikumpul dari kelas ${selectedText} dan dimuat turun sebagai ${filename}.`,
          'Berjaya',
          false,
          false,
          5000,
        );
      }
    }
  }

  // ==========================================
  // SUBSISTEM 1: ANALISIS KEHADIRAN (SOLUSI BESTARI GURU)
  // ==========================================
  function runKehadiranScript() {
    const NAMA_SEKOLAH =
      document.querySelectorAll('span.first_head')?.[0]?.textContent?.trim() ?? 'SEKOLAH TIDAK DIKENAL PASTI';

    const isGuruKelas = location.href === 'https://moeispel.moe.gov.my/sahsiah/kehadiran/tabguru';
    const isTingkatan = semakTingkatanOptions();

    const BUTTON_ID_HARIAN_SCRIPT = 'sbgKumpulKehadiranHarianBtn';
    const ORIGINAL_BUTTON_TEXT_HARIAN = `Kumpul Kehadiran Harian ${
      isGuruKelas ? '' : `(Semua ${isTingkatan ? 'Tingkatan' : 'Tahun'})`
    }`;
    const LOADING_BUTTON_TEXT_HARIAN = 'Sedang Mengumpul (Harian)...';

    const BUTTON_ID_MINGGUAN_SCRIPT = 'sbgKumpulKehadiranMingguanBtn';
    const ORIGINAL_BUTTON_TEXT_MINGGUAN = `Kumpul Kehadiran Mingguan ${
      isGuruKelas ? '' : `(Semua ${isTingkatan ? 'Tingkatan' : 'Tahun'})`
    }`;
    const LOADING_BUTTON_TEXT_MINGGUAN = 'Sedang Mengumpul (Mingguan)...';

    const DELAY_MS = 600;
    const DATATABLES_REQUEST_STATE = { draw: 1 };
    const AJAX_JSON_HEADERS = {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Cache untuk lookup id_profil_kelas: "TINGKATAN+NAMA_KELAS" -> "id_profil_kelas"
    let KELAS_ID_LOOKUP = null;

    // Cache untuk tarikh cuti/ketidakpadanan: "YYYYMMDD" -> count
    // Apabila count mencapai 3, tarikh akan ditambahkan ke TARIKH_CUTI_CACHE
    let TARIKH_KETIDAKPADANAN_COUNTER = new Map();
    // Set tarikh yang telah dipastikan sebagai cuti (apiDate !== currentReqDate)
    let TARIKH_CUTI_CACHE = new Set();

    const BUAT_CACHE_HARIAN = false;
    const SENTIASA_GUNAKAN_CACHE = false;
    const CACHE_KEY_TARIKH_DATA = 'TarikhDataKehadiranSBG';
    const CACHE_KEY_KELAS = 'semuaDataKehadiranKelasSBG';
    const CACHE_KEY_MURID = 'semuaDataKehadiranMuridSBG';
    const CACHE_KEY_TARIKH_CUTI = 'TarikhCutiKehadiranSBG';
    const CACHE_KEY_KETIDAKPADANAN_COUNTER = 'TarikhKetidakpadananCounterSBG';
    const KETIDAKPADANAN_THRESHOLD = 2;

    async function handlePadamDataCache() {
      const confirmDelete = window.confirm(
        'Padamkan Data Kehadiran?\n\nPadamkan keseluruhan data kehadiran yang terkumpul dalam sesi pelayar (browser) ini?',
      );

      if (!confirmDelete) {
        return;
      }

      try {
        TARIKH_CUTI_CACHE.clear();
        TARIKH_KETIDAKPADANAN_COUNTER.clear();

        await GM.deleteValue(CACHE_KEY_TARIKH_DATA);
        await GM.deleteValue(CACHE_KEY_KELAS);
        await GM.deleteValue(CACHE_KEY_MURID);
        await GM.deleteValue(CACHE_KEY_TARIKH_CUTI);
        await GM.deleteValue(CACHE_KEY_KETIDAKPADANAN_COUNTER);

        await notifyUser(
          'Data kehadiran terkumpul telah dipadamkan. Anda boleh mengumpul data semula dalam sesi pelayar baharu.',
          'Padam Berjaya',
          false,
          false,
          4000,
        );

        renderAllStatistikTables();
      } catch (error) {
        console.error('Ralat semasa memadamkan cache:', error);
        await notifyUser('Gagal memadamkan data cache. Sila semak konsol.', 'Ralat', 1, 1);
      }
    }

    const HARI_MINGGU = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
    const KATEGORI_SEBAB = [
      { id_kat_thadir: 'B', keterangan: 'AKTIVITI LUAR SEKOLAH' },
      { id_kat_thadir: 'K', keterangan: 'ANCAMAN KESELAMATAN' },
      { id_kat_thadir: 'L', keterangan: 'BENCANA ALAM' },
      { id_kat_thadir: 'E', keterangan: 'DIGANTUNG SEKOLAH' },
      { id_kat_thadir: 'J', keterangan: 'MASALAH KELUARGA' },
      { id_kat_thadir: 'I', keterangan: 'MASALAH PERIBADI' },
      { id_kat_thadir: 'A', keterangan: 'PDPR' },
      { id_kat_thadir: 'G', keterangan: 'PENGGILIRAN PEPERIKSAAN' },
      { id_kat_thadir: 'M', keterangan: 'KEBENARAN PENGETUA/GURU BESAR' },
      { id_kat_thadir: 'N', keterangan: 'PONTENG' },
      { id_kat_thadir: 'D', keterangan: 'MASALAH KESIHATAN' },
      { id_kat_thadir: 'P', keterangan: 'SEKOLAH DALAM HOSPITAL' },
    ];

    function getKeteranganKategori(id_kat) {
      if (!id_kat) return null;
      const kategori = KATEGORI_SEBAB.find(kat => kat.id_kat_thadir === id_kat);
      return kategori ? kategori.keterangan : null;
    }

    function parseDateDDMMYYYY(dateStr) {
      if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return null;
      const parts = dateStr.split('/');
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }

    function formatDateDDMMYYYY(dateObj) {
      if (!(dateObj instanceof Date) || isNaN(dateObj.valueOf())) return null;
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    }

    function getWeekNumber(date, year) {
      const jan1 = new Date(year, 0, 1);
      const firstSunday = new Date(jan1);
      const daysToFirstSunday = -jan1.getDay();
      firstSunday.setDate(1 + daysToFirstSunday);

      if (jan1.getDay() !== 0) {
        firstSunday.setDate(1 + (7 - jan1.getDay()));
      }

      const weekStart = getWeekStart(date);
      const diffTime = weekStart.getTime() - firstSunday.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(diffDays / 7) + 1;
      return Math.max(1, weekNumber);
    }

    function getWeekStart(date) {
      const sunday = new Date(date);
      const dayOfWeek = date.getDay();
      const daysToSunday = -dayOfWeek;
      sunday.setDate(date.getDate() + daysToSunday);
      return sunday;
    }

    function getWeekDays(sundayDate) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(sundayDate);
        day.setDate(sundayDate.getDate() + i);
        days.push(day);
      }
      return days;
    }

    function createWeekSelectElement(year = new Date().getFullYear()) {
      const select = document.createElement('select');
      select.className = 'form-control selectpicker';
      select.id = 'senaraiMinggu';
      select.name = 'senaraiMinggu';
      select.setAttribute('data-live-search', 'true');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentYear = today.getFullYear();

      // Mulai dari Sunday pertama yang mempunyai hari dalam tahun target
      const jan1 = new Date(year, 0, 1);
      const dec31 = new Date(year, 11, 31);

      // Cari Sunday pertama: jika Jan 1 bukan Sunday, cari Sunday sebelumnya
      let firstSunday = getWeekStart(jan1);

      // Jika Sunday ini tidak ada hari dalam tahun target, gerak ke Sunday seterusnya
      const firstSundayDays = getWeekDays(firstSunday);
      if (!firstSundayDays.some(day => day.getFullYear() === year)) {
        firstSunday = new Date(firstSunday);
        firstSunday.setDate(firstSunday.getDate() + 7);
      }

      // Cari Sunday terakhir: jika Dec 31 bukan Sunday, cari Sunday terakhir
      let lastSunday = getWeekStart(dec31);

      // Jika ini adalah minggu yang menyentuh tahun berikutnya, gunakan Sunday ini
      // (karena minggu ini masih punya hari dalam tahun target)

      const weeksData = [];
      let currentWeekStart = new Date(firstSunday);
      let weekNumber = 1;

      while (currentWeekStart.getFullYear() <= year) {
        const weekDays = getWeekDays(currentWeekStart);
        const hasTargetYearDays = weekDays.some(day => day.getFullYear() === year);

        // Untuk tahun semasa, papar minggu setakat minggu semasa sahaja.
        if (year === currentYear && currentWeekStart > today) {
          break;
        }

        // Tahun masa depan tidak dipaparkan.
        if (year > currentYear) {
          break;
        }

        if (hasTargetYearDays) {
          const optionValue = weekDays.map(day => formatDateDDMMYYYY(day)).join(',');
          weeksData.push({
            value: optionValue,
            startDate: new Date(currentWeekStart),
            weekNum: weekNumber,
          });
          weekNumber++;
        } else {
          // Jika minggu ini tidak ada hari dalam tahun target, stop
          break;
        }

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }

      let currentWeekIndex = -1;

      weeksData.forEach((week, index) => {
        const weekDates = week.value.split(',').map(dateStr => {
          const [day, month, yearVal] = dateStr.split('/');
          return new Date(yearVal, month - 1, day);
        });

        const startStr = formatDateDDMMYYYY(weekDates[0]);
        const endStr = formatDateDDMMYYYY(weekDates[6]);
        const optionText = `Minggu ${week.weekNum} (${startStr} - ${endStr})`;

        const option = document.createElement('option');
        option.value = week.value;
        option.textContent = optionText;
        select.appendChild(option);

        const weekStart = week.startDate;
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        if (today >= weekStart && today <= weekEnd) {
          currentWeekIndex = index;
        }
      });

      select.selectedIndex = currentWeekIndex >= 0 ? currentWeekIndex : 0;
      return select;
    }

    function convertDateDDMMYYYYtoYYYYMMDD(dateStr_DDMMYYYY) {
      const dateObj = parseDateDDMMYYYY(dateStr_DDMMYYYY);
      if (!dateObj) return null;
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function getCurrentDateYYYYMMDD() {
      return formatDateDDMMYYYY(new Date()).split('/').reverse().join('-');
    }

    function getNamaHari(dateStringYYYYMMDD) {
      if (!dateStringYYYYMMDD) return '';
      const [year, month, day] = dateStringYYYYMMDD.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return HARI_MINGGU[date.getDay()];
    }

    function getISOWeekInfo(dateStringYYYYMMDD) {
      if (!dateStringYYYYMMDD) {
        return { weekNumber: 0, year: 0, weekDisplay: 'Minggu Tidak Diketahui' };
      }

      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(dateStringYYYYMMDD)) {
        return { weekNumber: 0, year: 0, weekDisplay: 'Format Tanggal Tidak Valid' };
      }

      const date = new Date(dateStringYYYYMMDD + 'T00:00:00');

      if (isNaN(date.getTime())) {
        return { weekNumber: 0, year: 0, weekDisplay: 'Tanggal Tidak Valid' };
      }

      const year = date.getFullYear();

      // Selaraskan kiraan dengan createWeekSelectElement:
      // minggu bermula Ahad dan minggu dikira jika ada sekurang-kurangnya satu hari dalam tahun sasaran.
      let firstSunday = getWeekStart(new Date(year, 0, 1));
      const firstSundayDays = getWeekDays(firstSunday);
      if (!firstSundayDays.some(day => day.getFullYear() === year)) {
        firstSunday = new Date(firstSunday);
        firstSunday.setDate(firstSunday.getDate() + 7);
      }

      const weekStart = getWeekStart(date);
      const weekNumber = Math.max(1, Math.floor((weekStart - firstSunday) / (7 * 24 * 60 * 60 * 1000)) + 1);

      return {
        weekNumber,
        year,
        weekDisplay: `Minggu ${weekNumber} (${year})`,
      };
    }

    async function getStoredData(key, defaultValue = []) {
      const rawData = await GM.getValue(key, JSON.stringify(defaultValue));
      try {
        return JSON.parse(rawData);
      } catch (e) {
        console.error(`Ralat parse data ${key}:`, e);
        await notifyUser(`Gagal baca ${key}. Guna lalai.`, 'Ralat Simpanan', 1, 1);
        return defaultValue;
      }
    }

    async function setStoredData(key, value) {
      try {
        await GM.setValue(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Ralat simpan data ${key}:`, e);
        await notifyUser(`Gagal simpan ${key}.`, 'Ralat Simpanan', 1, 1);
      }
    }

    async function notifyUser(
      message,
      title = 'Skrip MOEISPEL SolusiBestariGuru',
      isWarning = false,
      isError = false,
      duration = 4000,
    ) {
      const method =
        isError ? 'error'
        : isWarning ? 'warn'
        : 'log';
      console[method](`Notifikasi (${title}): ${message}`);
      GM.notification({
        text: message,
        title: title,
        timeout:
          isError ? 6000
          : isWarning ? 3000
          : duration,
        silent: isWarning || isError,
      });
    }

    const showLoading = (buttonId, loadingText, originalText) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.disabled = true;
        button.innerHTML = `<span class="userscript-spinner"></span> ${loadingText}`;
        button.dataset.originalText = originalText;
      }
    };

    const hideLoading = buttonId => {
      const button = document.getElementById(buttonId);
      if (button && button.dataset.originalText) {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText;
      }
    };

    async function handleCacheMigration() {
      const oldMKey = 'allDataKehadiranSBG';
      if ((await GM.getValue(oldMKey, null)) !== null) {
        await notifyUser(
          `Cache murid lama (${oldMKey}) dikesan. Kosongkan utk ${CACHE_KEY_MURID}.`,
          'Kemas Kini Cache',
          1,
        );
        await GM.deleteValue(oldMKey);
        await setStoredData(CACHE_KEY_MURID, []);
      }
      const oldKKey = 'allDataKehadiranKelasSBG';
      if ((await GM.getValue(oldKKey, null)) !== null) {
        await notifyUser(`Cache kelas lama (${oldKKey}) dikesan. Memadam.`, 'Kemas Kini Cache', 1);
        await GM.deleteValue(oldKKey);
      }
    }

    /**
     * Ekstrak dan validasi CSRF token dengan diagnostik
     */
    function extractAndValidateCSRFToken() {
      const selectors = [
        '#logout-form > input[type=hidden]',
        'input[name="_token"]',
        'input[name="csrf_token"]',
        '[type=hidden][name="_token"]',
      ];

      for (const selector of selectors) {
        const tokenEl = document.querySelector(selector);
        if (tokenEl && tokenEl.value && tokenEl.value.length > 0) {
          console.log(`  CSRF Token ditemui: ${selector}, panjang: ${tokenEl.value.length}`);
          return tokenEl.value;
        }
      }

      console.warn('  AMARAN: CSRF token tidak ditemui dengan selector biasa. Mencari semua input tersembunyi...');
      const allHiddenInputs = document.querySelectorAll('input[type=hidden]');
      for (const input of allHiddenInputs) {
        if (input.value && input.value.length > 20) {
          console.log(`  Kemungkinan token: ${input.name || 'unnamed'}, panjang: ${input.value.length}`);
          if (input.name === '_token' || input.name === 'csrf_token' || input.value.length === 40) {
            console.log(`  Menggunakan token: ${input.name}`);
            return input.value;
          }
        }
      }

      return null;
    }

    /**
     * Validasi struktur payload sebelum menghantarkan
     */
    function validatePayload(payloadObj, requiredFields) {
      const errors = [];
      for (const field of requiredFields) {
        if (!payloadObj.has(field) || !payloadObj.get(field)) {
          errors.push(`${field} kosong atau tiada`);
        }
      }
      if (errors.length > 0) {
        console.warn(`  Ralat validasi payload: ${errors.join(', ')}`);
        return false;
      }
      return true;
    }

    function getNextDataTablesDraw() {
      const draw = DATATABLES_REQUEST_STATE.draw;
      DATATABLES_REQUEST_STATE.draw += 1;
      return String(draw);
    }

    /**
     * Ambil semua id_thn_ting dari select txtThnting
     */
    function getAllTahunTingkatanIds() {
      const selectEl = document.getElementById('txtThnting');
      if (!selectEl) return [];

      const options = Array.from(selectEl.querySelectorAll('option[value]:not([value=""])'));
      return options.map(opt => ({
        id_thn_ting: opt.value,
        label: opt.textContent.trim(),
      }));
    }

    /**
     * Fetch kelas data dari /ajax-kelaspkhem/[id_thn_ting]
     */
    async function fetchKelasFromAjaxEndpoint(id_thn_ting) {
      try {
        const response = await makeRequest(
          'GET',
          `https://moeispel.moe.gov.my/ajax-kelaspkhem/${id_thn_ting}`,
          null,
          'json',
        );

        if (!Array.isArray(response)) {
          console.warn(`  /ajax-kelaspkhem/${id_thn_ting} bukan array. Abaikan.`);
          return [];
        }

        console.log(`  Fetch /ajax-kelaspkhem/${id_thn_ting}: ${response.length} kelas diterima.`);
        return response;
      } catch (err) {
        console.error(`  Gagal fetch /ajax-kelaspkhem/${id_thn_ting}:`, err.message);
        return [];
      }
    }

    /**
     * Build lookup map untuk id_profil_kelas berdasarkan semua tahun/tingkatan
     * Key: "TINGKATAN+NAMA_KELAS" (normalized)
     * Value: id_profil_kelas
     */
    async function buildKelasIdLookup() {
      if (KELAS_ID_LOOKUP !== null) {
        console.log('  Lookup kelas ID sudah dibina sebelumnya. Guna cache.');
        return KELAS_ID_LOOKUP;
      }

      console.log('Membina lookup kelas ID...');
      const lookup = new Map();
      const tahunTingkatan = getAllTahunTingkatanIds();

      console.log(`  Menemui ${tahunTingkatan.length} tahun/tingkatan. Fetch kelas untuk setiap satu...`);

      for (const tt of tahunTingkatan) {
        const kelasData = await fetchKelasFromAjaxEndpoint(tt.id_thn_ting);

        kelasData.forEach(kelas => {
          const namaTingkatan = tt.label;
          const namaKelas = kelas.nama_kelas || '';
          const idProfilKelas = kelas.id_profil_kelas;

          if (namaKelas && idProfilKelas) {
            const key = normalizeLabelForLookup(`${namaTingkatan} ${namaKelas}`);
            lookup.set(key, String(idProfilKelas));
          }
        });

        // Tunggu sedikit sebelum request seterusnya
        await new Promise(r => setTimeout(r, 200));
      }

      KELAS_ID_LOOKUP = lookup;
      console.log(`Lookup kelas ID dibina: ${lookup.size} entri.`);
      return lookup;
    }

    function normalizeLabelForLookup(text) {
      return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
    }

    /**
     * Dapatkan id_profil_kelas dari lookup menggunakan NAMA_TINGKATAN + NAMA_KELAS
     */
    function getProfilKelasIdFromLookup(namaTingkatan, namaKelas, lookup) {
      const key = normalizeLabelForLookup(`${namaTingkatan} ${namaKelas}`);
      const id = lookup.get(key);

      if (!id) {
        console.warn(
          `  Lookup gagal untuk: "${key}". Available keys sample: ${Array.from(lookup.keys()).slice(0, 3).join(', ')}`,
        );
      }

      return id || null;
    }

    /**
     * Increment counter ketidakpadanan tarikh
     * Jika mencapai threshold (2), tambahkan ke TARIKH_CUTI_CACHE dan persist counter
     */
    async function recordTarikhKetidakpadanan(tarikh_YYYYMMDD) {
      const currentCount = TARIKH_KETIDAKPADANAN_COUNTER.get(tarikh_YYYYMMDD) || 0;
      const newCount = currentCount + 1;

      TARIKH_KETIDAKPADANAN_COUNTER.set(tarikh_YYYYMMDD, newCount);
      console.log(`  Record ketidakpadanan untuk ${tarikh_YYYYMMDD}: ${newCount}/${KETIDAKPADANAN_THRESHOLD}`);

      // Persist counter ke storage setiap kali increment
      await saveTarikhKetidakpadananCounterToStorage();

      if (newCount >= KETIDAKPADANAN_THRESHOLD && !TARIKH_CUTI_CACHE.has(tarikh_YYYYMMDD)) {
        TARIKH_CUTI_CACHE.add(tarikh_YYYYMMDD);
        await saveTarikhCutiCacheToStorage();
        console.log(
          `  ⚠️  ${tarikh_YYYYMMDD} ditambahkan ke cache cuti & disimpan (ketidakpadanan: ${newCount}/${KETIDAKPADANAN_THRESHOLD}).`,
        );
        return { confirmed: true, count: newCount };
      }

      return { confirmed: false, count: newCount };
    }

    /**
     * Check jika tarikh adalah tarikh cuti yang diketahui
     */
    function isTarikhCuti(tarikh_YYYYMMDD) {
      return TARIKH_CUTI_CACHE.has(tarikh_YYYYMMDD);
    }

    /**
     * Dapatkan senarai tarikh cuti yang telah dicache
     */
    function getTarikhCutiList() {
      return Array.from(TARIKH_CUTI_CACHE);
    }

    /**
     * Load ketidakpadanan counter dari storage ke TARIKH_KETIDAKPADANAN_COUNTER
     */
    async function loadTarikhKetidakpadananCounterFromStorage() {
      try {
        console.log(
          `  [Load Counter Ketidakpadanan] Memulai pemuatan dari storage (key: ${CACHE_KEY_KETIDAKPADANAN_COUNTER})...`,
        );
        const counterObj = await getStoredData(CACHE_KEY_KETIDAKPADANAN_COUNTER, {});
        console.log(`  [Load Counter Ketidakpadanan] Data diambil: ${JSON.stringify(counterObj)}`);

        if (typeof counterObj === 'object' && !Array.isArray(counterObj)) {
          TARIKH_KETIDAKPADANAN_COUNTER.clear();
          Object.entries(counterObj).forEach(([tarikh, count]) => {
            TARIKH_KETIDAKPADANAN_COUNTER.set(tarikh, count);
          });
          const entries = Array.from(TARIKH_KETIDAKPADANAN_COUNTER.entries());
          console.log(
            `  [✓ Load Counter BERJAYA] ${TARIKH_KETIDAKPADANAN_COUNTER.size} entri dimuat: ${entries.map(([k, v]) => `${k}=${v}`).join(', ')}`,
          );
        } else {
          console.warn(`  [AMARAN] Data counter bukan object. Jenis: ${typeof counterObj}`);
        }
      } catch (err) {
        console.error(`[RALAT] Gagal load counter ketidakpadanan:`, err);
      }
    }

    /**
     * Simpan ketidakpadanan counter ke storage
     */
    async function saveTarikhKetidakpadananCounterToStorage() {
      try {
        const counterObj = Object.fromEntries(TARIKH_KETIDAKPADANAN_COUNTER);
        await setStoredData(CACHE_KEY_KETIDAKPADANAN_COUNTER, counterObj);
      } catch (err) {
        console.error(`[RALAT] Gagal simpan counter ketidakpadanan:`, err);
      }
    }

    /**
     * Load tarikh cuti dari storage ke TARIKH_CUTI_CACHE
     */
    async function loadTarikhCutiCacheFromStorage() {
      try {
        console.log(`  [Load Cache Cuti] Memulai pemuatan dari storage (key: ${CACHE_KEY_TARIKH_CUTI})...`);
        const tarikhCutiArray = await getStoredData(CACHE_KEY_TARIKH_CUTI, []);
        console.log(`  [Load Cache Cuti] Data diambil: ${JSON.stringify(tarikhCutiArray)}`);

        if (Array.isArray(tarikhCutiArray)) {
          TARIKH_CUTI_CACHE.clear();
          tarikhCutiArray.forEach(t => TARIKH_CUTI_CACHE.add(t));
          console.log(
            `  [✓ Load Cache Cuti BERJAYA] ${TARIKH_CUTI_CACHE.size} entri dimuat: ${Array.from(TARIKH_CUTI_CACHE).join(', ')}`,
          );
        } else {
          console.warn(`  [AMARAN] Data dari storage bukan array. Jenis: ${typeof tarikhCutiArray}`);
        }
      } catch (err) {
        console.error(`[RALAT] Gagal load tarikh cuti dari storage:`, err);
        await notifyUser(
          `Ralat memuatkan cache cuti: ${err.message || 'Ralat tidak diketahui'}. Guna default kosong.`,
          'Ralat Muat Cache Cuti',
          1,
          1,
        );
      }
    }

    /**
     * Simpan TARIKH_CUTI_CACHE ke storage dengan verifikasi read-back
     */
    async function saveTarikhCutiCacheToStorage() {
      try {
        const tarikhCutiArray = Array.from(TARIKH_CUTI_CACHE);
        console.log(
          `  [Simpan Cache Cuti] Array sebelum simpan: ${tarikhCutiArray.join(', ')} (${tarikhCutiArray.length} entri)`,
        );

        // Simpan ke storage
        await setStoredData(CACHE_KEY_TARIKH_CUTI, tarikhCutiArray);
        console.log(`  [Simpan Cache Cuti] Permintaan simpan telah dihantar ke GM.setValue`);

        // Verifikasi read-back: baca balik dari storage untuk memastikan data tersimpan
        const verifyArray = await getStoredData(CACHE_KEY_TARIKH_CUTI, []);
        console.log(
          `  [Simpan Cache Cuti] Verifikasi read-back: ${verifyArray.join(', ')} (${verifyArray.length} entri)`,
        );

        if (verifyArray.length !== tarikhCutiArray.length) {
          console.warn(
            `  [AMARAN] Simpanan mungkin tidak konsisten! Diminta simpan ${tarikhCutiArray.length} entri, tetapi read-back mendapat ${verifyArray.length} entri.`,
          );
        } else {
          console.log(`  [✓ Simpan Cache Cuti BERJAYA] ${tarikhCutiArray.length} tarikh disimpan dan disahkan.`);
        }
      } catch (err) {
        console.error(`Ralat simpan tarikh cuti ke storage:`, err);
        await notifyUser(
          `Ralat simpan cache cuti: ${err.message || 'Ralat tidak diketahui'}. Sila periksa konsol.`,
          'Ralat Penyimpanan Cache Cuti',
          1,
          1,
        );
      }
    }

    function normalizeLabelForLookup(text) {
      return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
    }

    /**
     * Normalisasi respons JSON format baharu kepada format dalaman skrip
     * Fokus pada format semasa API MOEISPEL.
     */
    function normalizeKelasListResponse(response, currentPostDate_DDMMYYYY, kelasIdLookup) {
      if (!response || typeof response !== 'object') {
        console.error('Respons senarai kelas tidak berbentuk objek:', response);
        return null;
      }

      if (!Array.isArray(response.data)) {
        console.error('Respons senarai kelas tiada array data:', response);
        return null;
      }

      const skippedRows = [];
      const normalizedData = response.data
        .map((kelas, index) => {
          const namaTingkatan = kelas.NAMA_TINGKATAN || kelas.tahuntingakatan || kelas.nama_tingkatan || '';
          const namaKelas = kelas.NAMA_KELAS || kelas.nama_kelas || '';

          // Cari id_profil_kelas menggunakan lookup
          let idProfilKelas = null;
          if (kelasIdLookup) {
            idProfilKelas = getProfilKelasIdFromLookup(namaTingkatan, namaKelas, kelasIdLookup);
          }

          if (!idProfilKelas) {
            skippedRows.push({
              index,
              namaTingkatan,
              namaKelas,
            });
            return null;
          }

          return {
            id_profil_kelas: idProfilKelas,
            nama_kelas: namaKelas,
            tahuntingakatan: namaTingkatan,
            status_sah_harian: kelas.STATUS_SAH_HARIAN,
            hadir_ratio: kelas.HADIR_RATIO,
          };
        })
        .filter(Boolean);

      if (skippedRows.length > 0) {
        console.warn(`  Terdapat ${skippedRows.length} kelas tanpa id_profil_kelas sah dalam lookup. Baris dilangkau.`);
      }

      const statusHari = response.status === 'success' ? 0 : 1;
      const normalizedResponse = {
        status: response.status,
        statushari: statusHari,
        data: normalizedData,
        tarikhpilihan: currentPostDate_DDMMYYYY,
        usedTarikh: response.usedTarikh,
        isReplaced: response.isReplaced,
      };

      console.log(
        `  Senarai kelas dinormalisasi: ${normalizedData.length}/${response.data.length} kelas boleh digunakan. Contoh ID: ${normalizedData[0]?.id_profil_kelas || 'Tiada'}`,
      );

      return normalizedResponse;
    }

    /**
     * Validasi respons JSON daripada ajaxloadkehadirankelas (format semasa)
     */
    function isValidKelasListResponse(response) {
      if (!response || typeof response !== 'object') {
        console.warn('Respons kelas senarai bukan objek yang sah.');
        return false;
      }

      const hasData = Array.isArray(response.data);
      const hasStatushari = typeof response.statushari === 'number' || typeof response.statushari === 'undefined';
      const hasTarikh = typeof response.tarikhpilihan === 'string' && response.tarikhpilihan.length > 0;
      const hasUsableId = hasData && response.data.some(item => item && item.id_profil_kelas);
      const isValid = hasData && hasStatushari && hasTarikh && hasUsableId;

      if (!isValid) {
        console.warn(
          `Validasi senarai kelas gagal. hasData=${hasData}, hasStatushari=${hasStatushari}, hasTarikh=${hasTarikh}, hasUsableId=${hasUsableId}`,
        );
      }

      return isValid;
    }

    /**
     * Buat payload DataTables ServerSide Processing yang lengkap untuk ajaxloadkehadiranharian
     * Server mengharapkan format DataTables bukan hanya 3 parameter!
     */
    function buildDataTablesPayload(idProfilKelas, tokenVal, tarikhpilihan_DDMMYYYY) {
      // DataTables columns configuration (4 columns sesuai API)
      const columns = [
        { data: 'bil', name: '', searchable: true, orderable: true, search: { value: '', regex: false } },
        { data: 'kehadiran', name: '', searchable: true, orderable: true, search: { value: '', regex: false } },
        { data: 'namamurid', name: '', searchable: true, orderable: true, search: { value: '', regex: false } },
        { data: 'sebabtidakhadir', name: '', searchable: true, orderable: true, search: { value: '', regex: false } },
      ];

      // Build URLSearchParams dengan full DataTables format
      const payload = new URLSearchParams();

      // DataTables draw counter mesti bertambah (pola request asal: 3,4,5,...)
      payload.append('draw', getNextDataTablesDraw());

      // Column definitions
      columns.forEach((col, idx) => {
        payload.append(`columns[${idx}][data]`, col.data);
        payload.append(`columns[${idx}][name]`, col.name);
        payload.append(`columns[${idx}][searchable]`, col.searchable);
        payload.append(`columns[${idx}][orderable]`, col.orderable);
        payload.append(`columns[${idx}][search][value]`, col.search.value);
        payload.append(`columns[${idx}][search][regex]`, col.search.regex);
      });

      // Order by (sort by namamurid ascending, column index 2)
      payload.append('order[0][column]', '2');
      payload.append('order[0][dir]', 'asc');

      // Pagination (-1 means return all records)
      payload.append('start', '0');
      payload.append('length', '-1');

      // Global search
      payload.append('search[value]', '');
      payload.append('search[regex]', 'false');

      // CSRF token
      payload.append('_token', tokenVal);

      // Class and date parameters (MOEISPEL specific)
      payload.append('id_profile_kelas', idProfilKelas);
      payload.append('tarikhpilihan', tarikhpilihan_DDMMYYYY);

      return payload;
    }

    /**
     * Validasi respons JSON daipada ajaxloadkehadiranharian dengan sokongan DataTables format
     */
    function isValidKehadiranHarianResponse(response) {
      if (!response || typeof response !== 'object') {
        console.warn('Respons kehadiran harian bukan objek yang sah.');
        return false;
      }

      // Format DataTables (yang digunakan oleh API sekarang)
      const hasDataTables = typeof response.draw === 'number' && Array.isArray(response.data);
      const hasStatus = typeof response.statushari === 'number' || typeof response.statushari === 'undefined';
      const hasTarikh = 'tarikhpilihan' in response;

      const isValid = hasDataTables && hasStatus && hasTarikh;

      if (!isValid) {
        console.warn(
          `Validasi respons kehadiran harian gagal. Medan: draw=${response.draw}, data.length=${response.data?.length}, statushari=${response.statushari}, tarikhpilihan=${response.tarikhpilihan}`,
        );
      }

      return isValid;
    }

    async function extractInfoKehadiran(
      buttonIdTrigger,
      secaraMingguan = false,
      originalButtonText,
      loadingButtonText,
    ) {
      const textarea = document.getElementById('logKumpulKehadiran');
      // Kosongkan textarea sebelum memulai proses baru
      // if (textarea) textarea.value = '';

      showLoading(buttonIdTrigger, loadingButtonText, originalButtonText);
      await notifyUser(`Mula proses ${originalButtonText}.`, 'Info Proses');
      writeLogKehadiran(`Permulaan proses: ${originalButtonText}`);
      await handleCacheMigration();

      let dataMuridGlobal = [];
      let dataKelasGlobal = [];

      const currentDayStr = getCurrentDateYYYYMMDD();
      const storedDayStr = await GM.getValue(CACHE_KEY_TARIKH_DATA, null);

      if (BUAT_CACHE_HARIAN && storedDayStr !== currentDayStr) {
        await notifyUser(
          `Tarikh data (${storedDayStr || 'Tiada'}) berbeza (${currentDayStr}). Cache dikosongkan.`,
          'Info Cache',
          1,
        );
        await setStoredData(CACHE_KEY_KELAS, []);
        await setStoredData(CACHE_KEY_MURID, []);
        await GM.setValue(CACHE_KEY_TARIKH_DATA, currentDayStr);
        dataKelasGlobal = [];
        dataMuridGlobal = [];
      } else {
        await notifyUser(`Guna data cache sedia ada (${storedDayStr || 'Tiada'}).`, 'Info Cache');
        dataKelasGlobal = await getStoredData(CACHE_KEY_KELAS, []);
        dataMuridGlobal = await getStoredData(CACHE_KEY_MURID, []);
      }

      try {
        // Ekstrak dan validasi CSRF token dengan fungsi baru yang lebih baik
        console.log('Memulai proses ekstraksi. Mencari CSRF token...');
        const tokenVal = extractAndValidateCSRFToken();

        if (!tokenVal) {
          await notifyUser(
            'Token CSRF tidak dapat ditemui. Sila muat ulang halaman dan cuba lagi.',
            'Ralat Skrip',
            0,
            1,
          );
          hideLoading(buttonIdTrigger);
          return;
        }
        console.log(`  CSRF Token panjang: ${tokenVal.length} karakter, dimulai: ${tokenVal.substring(0, 10)}...`);

        let datesToRun_DDMMYYYY;
        if (secaraMingguan) {
          const weekSelectElement = document.getElementById('senaraiMinggu');
          if (!weekSelectElement || !weekSelectElement.value) {
            await notifyUser('Pilihan minggu tidak ditemui atau tiada nilai.', 'Input Diperlukan', 0, 1);
            hideLoading(buttonIdTrigger);
            return;
          }
          datesToRun_DDMMYYYY = weekSelectElement.value.split(',');
        } else {
          const datePickerElement = document.getElementById('sbgTarikhPilihan');
          if (!datePickerElement || !datePickerElement.value) {
            await notifyUser('Pilihan tarikh harian tidak ditemui atau tiada nilai.', 'Input Diperlukan', 0, 1);
            hideLoading(buttonIdTrigger);
            return;
          }
          datesToRun_DDMMYYYY = [datePickerElement.value];
        }

        if (datesToRun_DDMMYYYY.length === 0 || datesToRun_DDMMYYYY.some(d => !d)) {
          await notifyUser('Julat tarikh tidak sah.', 'Ralat Tarikh', 0, 1);
          hideLoading(buttonIdTrigger);
          return;
        }

        const currentDate_YYYYMMDD = getCurrentDateYYYYMMDD();
        const validDates_DDMMYYYY = datesToRun_DDMMYYYY.filter(d => {
          const d_YYYYMMDD = convertDateDDMMYYYYtoYYYYMMDD(d);
          return d_YYYYMMDD && d_YYYYMMDD <= currentDate_YYYYMMDD;
        });

        const futureDates_DDMMYYYY = datesToRun_DDMMYYYY.filter(d => {
          const d_YYYYMMDD = convertDateDDMMYYYYtoYYYYMMDD(d);
          return d_YYYYMMDD && d_YYYYMMDD > currentDate_YYYYMMDD;
        });

        if (futureDates_DDMMYYYY.length > 0) {
          await notifyUser(
            `Tarikh masa depan diabaikan: ${futureDates_DDMMYYYY.join(', ')}. Proses hanya dengan tarikh hari ini atau sebelumnya: ${validDates_DDMMYYYY.join(', ')}.`,
            'Tarikh Masa Depan Diabaikan',
            1,
          );
          writeLogKehadiran(
            `Diabaikan ${futureDates_DDMMYYYY.length} tarikh masa depan. Teruskan dengan ${validDates_DDMMYYYY.length} tarikh sah.`,
            true,
          );
          datesToRun_DDMMYYYY.length = 0;
          datesToRun_DDMMYYYY.push(...validDates_DDMMYYYY);

          if (datesToRun_DDMMYYYY.length === 0) {
            await notifyUser(
              `Tiada tarikh sah untuk diproses (semua adalah tarikh masa depan). Sila pilih tarikh hari ini atau sebelumnya.`,
              'Tiada Tarikh Sah',
              1,
              1,
            );
            writeLogKehadiran(`Proses dibatalkan: semua tarikh adalah masa depan`, true, true);
            hideLoading(buttonIdTrigger);
            return;
          }
        }

        console.log(`Tarikh diproses (sebelum filter): ${datesToRun_DDMMYYYY.join(', ')}`);
        writeLogKehadiran(
          `🚩 Memulai proses ${secaraMingguan ? 'mingguan' : 'harian'} dengan ${datesToRun_DDMMYYYY.length} tarikh`,
        );

        // Load tarikh cuti dan counter ketidakpadanan dari storage di awal
        console.log('Load tarikh cuti dan counter ketidakpadanan dari storage...');
        await loadTarikhCutiCacheFromStorage();
        await loadTarikhKetidakpadananCounterFromStorage();

        // Filter tarikh cuti dengan efisien menggunakan Set lookup
        const tarikhCutiCount = TARIKH_CUTI_CACHE.size;
        if (tarikhCutiCount > 0) {
          console.log(
            `  Tarikh cuti yang diketahui (dari storage): ${getTarikhCutiList().join(', ')} (${tarikhCutiCount} entri)`,
          );

          const filteredDates = datesToRun_DDMMYYYY.filter(d => {
            const d_YYYYMMDD = convertDateDDMMYYYYtoYYYYMMDD(d);
            if (isTarikhCuti(d_YYYYMMDD)) {
              console.log(`  Skip ${d} (${d_YYYYMMDD}) - Tarikh cuti yang diketahui dari storage.`);
              return false;
            }
            return true;
          });

          const skippedCount = datesToRun_DDMMYYYY.length - filteredDates.length;
          if (skippedCount > 0) {
            console.log(
              `  Langkau ${skippedCount}/${datesToRun_DDMMYYYY.length} tarikh (cuti). Proses ${filteredDates.length} tarikh sahaja.`,
            );
            writeLogKehadiran(`${skippedCount} tarikh cuti diabaikan`, true);
            datesToRun_DDMMYYYY.length = 0;
            datesToRun_DDMMYYYY.push(...filteredDates);
          }
        }

        console.log(`Tarikh diproses (selepas filter cuti): ${datesToRun_DDMMYYYY.join(', ')}`);

        // Build lookup untuk id_profil_kelas dari /ajax-kelaspkhem/ endpoint
        console.log('Membina lookup kelas ID...');
        const kelasIdLookup = await buildKelasIdLookup();

        for (let iDate = 0; iDate < datesToRun_DDMMYYYY.length; iDate++) {
          const currentPostDate_DDMMYYYY = datesToRun_DDMMYYYY[iDate];
          const currentReqDate_YYYYMMDD = convertDateDDMMYYYYtoYYYYMMDD(currentPostDate_DDMMYYYY);

          if (!currentReqDate_YYYYMMDD) {
            await notifyUser(`Format tarikh tidak sah: ${currentPostDate_DDMMYYYY}. Langkau.`, 'Ralat Tarikh', 1);
            writeLogKehadiran(`Format tarikh tidak sah: ${currentPostDate_DDMMYYYY}`, false, true);
            continue;
          }

          // Skip segera jika tarikh sudah disahkan cuti (dari storage atau sesi semasa).
          if (isTarikhCuti(currentReqDate_YYYYMMDD)) {
            console.log(
              `--- (${iDate + 1}/${datesToRun_DDMMYYYY.length}) Skip Tarikh: ${currentPostDate_DDMMYYYY} (${currentReqDate_YYYYMMDD}) - tarikh cuti disahkan ---`,
            );
            writeLogKehadiran(`Skip tarikh cuti disahkan: ${currentPostDate_DDMMYYYY}`, true);
            continue;
          }

          console.log(
            `--- (${iDate + 1}/${datesToRun_DDMMYYYY.length}) Proses Tarikh: ${currentPostDate_DDMMYYYY} (YYYY-MM-DD: ${currentReqDate_YYYYMMDD}) ---`,
          );
          writeLogKehadiran(
            `(${iDate + 1}/${datesToRun_DDMMYYYY.length}) Memproses Tarikh: ${currentPostDate_DDMMYYYY}`,
          );

          const kehadiranAPIUrl = `https://moeispel.moe.gov.my/sahsiah/kehadiran/${
            isGuruKelas ? '' : 'pkhem/'
          }ajaxloadkehadiranharian`;
          let kelasListResponse;

          if (isGuruKelas) {
            const selectEl = document.querySelector('select[id="txtNamakelas"]');
            const selectedOption =
              selectEl?.querySelector('option[selected]:not([value=""])') ||
              selectEl?.querySelector('option[value]:not([value=""])');

            if (!selectedOption) {
              throw new Error('Tiada kelas dipilih atau tiada pilihan kelas.');
            }

            const teksPenuh = selectedOption.textContent.trim();
            const words = teksPenuh.split(/\s+/);
            const tahun_tingkatan = words.slice(0, 2).join(' ');
            const nama_kelas = words.slice(2).join(' ');

            kelasListResponse = {
              data: [
                {
                  id_profil_kelas: selectedOption.value,
                  nama_kelas: nama_kelas,
                  tahuntingakatan: tahun_tingkatan,
                },
              ],
              statushari: 0,
              tarikhpilihan: currentPostDate_DDMMYYYY,
            };
          } else {
            const kelasListAPIUrl = 'https://moeispel.moe.gov.my/sahsiah/kehadiran/pkhem/ajaxloadkehadirankelas';
            const kelasListPostPayload = new URLSearchParams();
            kelasListPostPayload.append('_token', tokenVal);
            kelasListPostPayload.append('tarikhpilihan', currentPostDate_DDMMYYYY);

            try {
              console.log(`  Muat turun senarai kelas untuk ${currentPostDate_DDMMYYYY}: ${kelasListAPIUrl}`);
              kelasListResponse = await makeRequest('POST', kelasListAPIUrl, kelasListPostPayload.toString(), 'json', {
                ...AJAX_JSON_HEADERS,
              });

              if (Array.isArray(kelasListResponse?.data) && kelasListResponse.data.length > 0) {
                console.log('  Sampel kunci data kelas[0]:', Object.keys(kelasListResponse.data[0] || {}));
              }

              // Normalisasikan respons untuk menangani kedua format JSON (lama dan baru)
              kelasListResponse = normalizeKelasListResponse(
                kelasListResponse,
                currentPostDate_DDMMYYYY,
                kelasIdLookup,
              );
            } catch (err) {
              let detailedError = err.statusText || err.message || 'Ralat tidak diketahui';

              // Jika HTML response terdeteksi, tambahkan diagnostik
              if (err.isHTMLResponse) {
                console.error(`[DIAGNOSTIK] Server mengembalikan HTML bukan JSON untuk senarai kelas.`);
                console.error(`  Kemungkinan penyebab: ${detailedError}`);
                console.error(`  HTTP Status: ${err.status}`);
                console.error(`  Respons HTML (char 0-200): ${err.responseText?.substring(0, 200)}`);
              }

              await notifyUser(
                `  Gagal muat turun senarai kelas bagi ${currentPostDate_DDMMYYYY}: ${detailedError}`,
                'Ralat Rangkaian',
                1,
                1,
              );

              if (iDate < datesToRun_DDMMYYYY.length - 1) {
                console.log(
                  `  Tunggu ${DELAY_MS / 1000} saat sebelum tarikh seterusnya kerana ralat rangkaian senarai kelas...`,
                );
                await new Promise(r => setTimeout(r, DELAY_MS));
              }
              continue;
            }
          }

          // Validasi respons dengan sokongan kedua format (lama dan baru)
          if (!isValidKelasListResponse(kelasListResponse)) {
            await notifyUser(
              `  Respons senarai kelas tidak sah bagi ${currentPostDate_DDMMYYYY}. Langkau.`,
              'Data Tidak Sah',
              1,
            );
            if (iDate < datesToRun_DDMMYYYY.length - 1) {
              console.log(`  Tunggu ${DELAY_MS / 1000} saat sebelum tarikh seterusnya kerana data tidak sah...`);
              await new Promise(r => setTimeout(r, DELAY_MS));
            }
            continue;
          }

          const statusHariKelasList = kelasListResponse.statushari;
          const kelasListForDate = kelasListResponse.data;
          console.log(
            `  Data senarai kelas diterima bagi ${currentPostDate_DDMMYYYY}, statushari: ${statusHariKelasList}.`,
          );

          if (statusHariKelasList !== 0) {
            await notifyUser(
              `  Data kehadiran bagi ${currentPostDate_DDMMYYYY} ber-statushari ${statusHariKelasList}. Kelas tidak diproses untuk tarikh ini.`,
              'Info Data',
              1,
            );
            dataKelasGlobal = dataKelasGlobal.filter(k => k.tarikh !== currentReqDate_YYYYMMDD);
            dataMuridGlobal = dataMuridGlobal.filter(m => m.tarikh !== currentReqDate_YYYYMMDD);
            await setStoredData(CACHE_KEY_KELAS, dataKelasGlobal);
            await setStoredData(CACHE_KEY_MURID, dataMuridGlobal);

            if (iDate < datesToRun_DDMMYYYY.length - 1) {
              console.log(`  Tunggu ${DELAY_MS / 1000} saat sebelum tarikh seterusnya...`);
              await new Promise(r => setTimeout(r, DELAY_MS));
            }
            continue;
          }

          if (kelasListForDate.length === 0) {
            await notifyUser(
              `  Tiada senarai kelas ditemui untuk ${currentPostDate_DDMMYYYY}.`,
              'Tiada Senarai Kelas',
              1,
            );
            writeLogKehadiran(`Tiada kelas pada ${currentPostDate_DDMMYYYY}`, true);
            if (iDate < datesToRun_DDMMYYYY.length - 1) {
              console.log(`  Tunggu ${DELAY_MS / 1000} saat sebelum tarikh seterusnya kerana tiada kelas...`);
              await new Promise(r => setTimeout(r, DELAY_MS));
            }
            continue;
          }

          console.log(`  Menemui ${kelasListForDate.length} kelas untuk ${currentPostDate_DDMMYYYY}.`);

          const PER_CLASS_REQUEST_TIMEOUT_MS = 30000;

          for (let iKelas = 0; iKelas < kelasListForDate.length; iKelas++) {
            const kelasObjAPI = kelasListForDate[iKelas];
            const idProfilKelas = kelasObjAPI.id_profil_kelas;
            const namaKelasSahaja = kelasObjAPI.nama_kelas;
            const namaTahunTingkatan = kelasObjAPI.tahuntingakatan;
            const namaKelasPenuh = `${namaTahunTingkatan} ${namaKelasSahaja}`;

            console.log(
              `    Proses Tarikh: ${currentPostDate_DDMMYYYY} - Kelas ${iKelas + 1}/${
                kelasListForDate.length
              }: ${namaKelasPenuh} (ID: ${idProfilKelas})`,
            );

            const cachedKelas = dataKelasGlobal.find(
              k =>
                k.id_profil_kelas === idProfilKelas &&
                k.tarikh === currentReqDate_YYYYMMDD &&
                k.tahun_tingkatan === namaTahunTingkatan,
            );
            let kehadiranJSON;
            let networkFetch = false;

            if (SENTIASA_GUNAKAN_CACHE && cachedKelas && cachedKelas.status_hari === 0) {
              console.log(`      Data SAH bagi ${namaKelasPenuh} (${currentReqDate_YYYYMMDD}) ada dalam cache.`);
              writeLogKehadiran(`📦 Cache: ${namaKelasPenuh}`);
              continue;
            } else {
              if (cachedKelas) {
                if (cachedKelas.status_hari === 0) {
                  await notifyUser(
                    `      Cache akan dikemaskinikan bagi ${namaKelasPenuh} (${currentReqDate_YYYYMMDD}, status: ${cachedKelas.statushari}). Muat turun semula.`,
                    'Info Cache',
                    1,
                  );
                } else {
                  await notifyUser(
                    `      Cache TIDAK SAH bagi ${namaKelasPenuh} (${currentReqDate_YYYYMMDD}, status: ${cachedKelas.statushari}). Muat turun semula.`,
                    'Info Cache',
                    1,
                  );
                }
                dataKelasGlobal = dataKelasGlobal.filter(
                  k =>
                    !(
                      k.id_profil_kelas === idProfilKelas &&
                      k.tarikh === currentReqDate_YYYYMMDD &&
                      k.tahun_tingkatan === namaTahunTingkatan
                    ),
                );
                dataMuridGlobal = dataMuridGlobal.filter(
                  m =>
                    !(
                      m.id_profil_kelas === idProfilKelas &&
                      m.tarikh === currentReqDate_YYYYMMDD &&
                      m.nama_kelas_penuh === namaKelasPenuh
                    ),
                );
                await setStoredData(CACHE_KEY_KELAS, dataKelasGlobal);
                await setStoredData(CACHE_KEY_MURID, dataMuridGlobal);
              } else {
                console.log(
                  `      Data bagi ${namaKelasPenuh} (${currentReqDate_YYYYMMDD}) tiada dalam cache. Perlu muat turun.`,
                );
              }

              console.log(`      Memuat turun data bagi ${namaKelasPenuh} pada ${currentPostDate_DDMMYYYY}...`);
              const postPayload = buildDataTablesPayload(idProfilKelas, tokenVal, currentPostDate_DDMMYYYY);

              // Validasi payload sebelum menghantarkan
              if (!validatePayload(postPayload, ['id_profile_kelas', '_token', 'tarikhpilihan', 'draw'])) {
                await notifyUser(`      Payload tidak sah untuk ${namaKelasPenuh}. Langkau.`, 'Ralat Payload', 1, 1);
                writeLogKehadiran(`Payload tidak sah: ${namaKelasPenuh}`, true);
                continue;
              }

              console.log(
                `      Payload DataTables untuk ${namaKelasPenuh}: id_profile_kelas=${idProfilKelas}, tarikhpilihan=${currentPostDate_DDMMYYYY}, draw=1, 4 columns`,
              );

              try {
                kehadiranJSON = await makeRequest(
                  'POST',
                  kehadiranAPIUrl,
                  postPayload.toString(),
                  'json',
                  { ...AJAX_JSON_HEADERS },
                  PER_CLASS_REQUEST_TIMEOUT_MS,
                );
                networkFetch = true;
                console.log(
                  `      Respons diterima untuk ${namaKelasPenuh}. Jumlah murid: ${kehadiranJSON.data?.length || 0}`,
                );
                writeLogKehadiran(`${namaKelasPenuh}: ${kehadiranJSON.data?.length || 0} murid`);
              } catch (err) {
                let detailedError = err.statusText || err.message || 'Ralat tidak diketahui';

                // Jika HTML response terdeteksi, tambahkan diagnostik
                if (err.isHTMLResponse) {
                  console.error(`      [DIAGNOSTIK] Server mengembalikan HTML bukan JSON. Kemungkinan penyebab:`);
                  if (detailedError.includes('Session')) {
                    console.error(`        - Session mungkin expired. Sila login semula.`);
                  } else if (detailedError.includes('CSRF')) {
                    console.error(`        - Token CSRF mungkin tidak sah. Sila muat ulang halaman.`);
                  } else {
                    console.error(`        - Server error atau endpoint tidak ditemui.`);
                  }
                  console.error(`        - HTTP Status: ${err.status}`);
                  console.error(`        - Respons HTML (char 0-200): ${err.responseText?.substring(0, 200)}`);
                }

                await notifyUser(
                  `      Gagal muat turun bagi ${namaKelasPenuh} (${currentPostDate_DDMMYYYY}): ${detailedError}`,
                  'Ralat Rangkaian',
                  1,
                  1,
                );
                writeLogKehadiran(`Muat Turun Gagal: ${namaKelasPenuh}`, true);
                if (iKelas < kelasListForDate.length - 1) {
                  console.log(
                    `      Tunggu ${DELAY_MS / 1000} saat sebelum kelas seterusnya kerana ralat rangkaian...`,
                  );
                  await new Promise(r => setTimeout(r, DELAY_MS));
                }
                continue;
              }

              // Gunakan fungsi validasi yang ditingkatkan
              if (!isValidKehadiranHarianResponse(kehadiranJSON)) {
                await notifyUser(
                  `      Respons kehadiran tidak sah: ${namaKelasPenuh} (${currentPostDate_DDMMYYYY}). Langkau.`,
                  'Data Tidak Sah',
                  1,
                );
                writeLogKehadiran(`⚠ Data tidak sah: ${namaKelasPenuh}`, true);
                if (iKelas < kelasListForDate.length - 1) {
                  console.log(`      Tunggu ${DELAY_MS / 1000} saat sebelum kelas seterusnya kerana data tidak sah...`);
                  await new Promise(r => setTimeout(r, DELAY_MS));
                }
                continue;
              }

              const apiDate_YYYYMMDD = kehadiranJSON.tarikhpilihan;
              if (apiDate_YYYYMMDD !== currentReqDate_YYYYMMDD) {
                // Record ketidakpadanan dan check jika sudah reach threshold
                const resultKetidakpadanan = await recordTarikhKetidakpadanan(currentReqDate_YYYYMMDD);
                const ketidakpadananCount = resultKetidakpadanan.count;

                await notifyUser(
                  `      Amaran! Tarikh respons (${apiDate_YYYYMMDD}) tidak sepadan dengan tarikh yang diminta (${currentReqDate_YYYYMMDD}) untuk ${namaKelasPenuh}. (${ketidakpadananCount}/${KETIDAKPADANAN_THRESHOLD}) Respons diabaikan.`,
                  'Ketidakpadanan Tarikh',
                  1,
                  1,
                );

                if (resultKetidakpadanan.confirmed) {
                  await notifyUser(
                    `      ${currentReqDate_YYYYMMDD} disahkan sebagai tarikh cuti dan disimpan ke storage. Baki request untuk tarikh ini akan dilangkau.`,
                    'Tarikh Cuti Disahkan & Disimpan',
                    1,
                  );
                  writeLogKehadiran(`✅ Tarikh cuti disahkan & disimpan: ${currentPostDate_DDMMYYYY}`, true);
                  break;
                }

                if (iKelas < kelasListForDate.length - 1) {
                  console.log(
                    `      Tunggu ${DELAY_MS / 1000} saat sebelum kelas seterusnya kerana ketidakpadanan tarikh...`,
                  );
                  await new Promise(r => setTimeout(r, DELAY_MS));
                }
                continue;
              }

              console.log(
                `      Data kehadiran diterima bagi ${namaKelasPenuh} (${apiDate_YYYYMMDD}), statushari: ${kehadiranJSON.statushari}.`,
              );

              const kelasDataBaru = {
                tahun_tingkatan: namaTahunTingkatan,
                nama_kelas_penuh: namaKelasPenuh,
                id_profil_kelas: idProfilKelas,
                jumlah_tidak_hadir: kehadiranJSON.biltidakhadir,
                jumlah_hadir: kehadiranJSON.bilhadir,
                tarikh: apiDate_YYYYMMDD,
                pengesahan_hadir_bulanan: kehadiranJSON.rekodSahHadirBulanan,
                status_hari: kehadiranJSON.statushari,
              };

              const idxKelas = dataKelasGlobal.findIndex(
                k =>
                  k.id_profil_kelas === idProfilKelas &&
                  k.tarikh === apiDate_YYYYMMDD &&
                  k.tahun_tingkatan === namaTahunTingkatan,
              );
              if (idxKelas > -1) {
                dataKelasGlobal[idxKelas] = kelasDataBaru;
              } else {
                dataKelasGlobal.push(kelasDataBaru);
              }
              await setStoredData(CACHE_KEY_KELAS, dataKelasGlobal);

              if (kehadiranJSON.statushari !== 0) {
                await notifyUser(
                  `      Data kehadiran bagi ${namaKelasPenuh} (${apiDate_YYYYMMDD}) ber-statushari ${kehadiranJSON.statushari}. Murid tidak diproses untuk kelas ini.`,
                  'Info Data',
                  1,
                );
                dataMuridGlobal = dataMuridGlobal.filter(
                  m =>
                    !(
                      m.id_profil_kelas === idProfilKelas &&
                      m.tarikh === apiDate_YYYYMMDD &&
                      m.nama_kelas_penuh === namaKelasPenuh
                    ),
                );
                await setStoredData(CACHE_KEY_MURID, dataMuridGlobal);
              } else {
                console.log(`        Memproses murid bagi ${namaKelasPenuh} (${apiDate_YYYYMMDD}).`);
                dataMuridGlobal = dataMuridGlobal.filter(
                  m =>
                    !(
                      m.id_profil_kelas === idProfilKelas &&
                      m.tarikh === apiDate_YYYYMMDD &&
                      m.nama_kelas_penuh === namaKelasPenuh
                    ),
                );

                if (Array.isArray(kehadiranJSON.data)) {
                  kehadiranJSON.data.forEach(murid => {
                    const lap =
                      murid.laporan_takhadir && murid.laporan_takhadir.length > 0 ? murid.laporan_takhadir[0] : {};
                    const statusTHadir = lap.thadir || {};
                    const katTidakHadirMurid = statusTHadir.id_kat_thadir || null;
                    dataMuridGlobal.push({
                      nama_kelas_penuh: namaKelasPenuh,
                      id_profil_kelas: idProfilKelas,
                      id_individu: murid.id_individu,
                      nama_murid: murid.namamurid,
                      kategori_tidak_hadir: getKeteranganKategori(katTidakHadirMurid),
                      sebab_tidak_hadir: murid.sebabtidakhadir || null,
                      tarikh: apiDate_YYYYMMDD,
                    });
                  });
                }
                await setStoredData(CACHE_KEY_MURID, dataMuridGlobal);
              }
            }

            if (networkFetch && iKelas < kelasListForDate.length - 1) {
              console.log(`      Tunggu ${DELAY_MS / 1000} saat sebelum kelas seterusnya...`);
              await new Promise(r => setTimeout(r, DELAY_MS));
            }
          }

          if (iDate < datesToRun_DDMMYYYY.length - 1) {
            console.log(`  Tunggu ${DELAY_MS / 1000} saat sebelum tarikh seterusnya...`);
            await new Promise(r => setTimeout(r, DELAY_MS));
          }
        }

        await GM.setValue(CACHE_KEY_TARIKH_DATA, currentDayStr);
        await saveTarikhCutiCacheToStorage();

        // Paparkan notifikasi akhir dengan info tarikh cuti yang disimpan
        const tarikhCutiListFinal = getTarikhCutiList();
        let finalNotificationMsg = `Ekstraksi data selesai untuk ${datesToRun_DDMMYYYY.length} tarikh. ${dataMuridGlobal.length} rekod murid & ${dataKelasGlobal.length} rekod kelas.`;
        if (tarikhCutiListFinal.length > 0) {
          finalNotificationMsg += `\n\nTarikh cuti yang disimpan (storage): ${tarikhCutiListFinal.join(', ')}`;
        }

        writeLogKehadiran(
          `🏁 Proses selesai! Data Kehadiran Murid: ${dataMuridGlobal.length}, Data Kehadiran Kelas: ${dataKelasGlobal.length}`,
        );
        await notifyUser(finalNotificationMsg, 'Proses Selesai');

        renderAllStatistikTables();
      } catch (err) {
        console.error('Ralat besar ekstraksi:', err);
        writeLogKehadiran(`Ralat besar: ${err.message}`, false, true);
        await notifyUser(`Ralat besar: ${err.message}.`, 'Ralat Kritikal', 0, 1, 8000);
      } finally {
        hideLoading(buttonIdTrigger);
      }
    }

    async function renderAllStatistikTables() {
      const dataKelas = (await getStoredData(CACHE_KEY_KELAS, [])).filter(k => k.status_hari === 0);
      const dataMurid = await getStoredData(CACHE_KEY_MURID, []);

      if (typeof $ === 'undefined' || typeof $.fn.DataTable !== 'function') {
        await notifyUser('jQuery atau DataTables.js tidak dimuatkan oleh halaman.', 'Ralat Pustaka', false, true);
        return;
      }
      const requiredDivs =
        isGuruKelas ?
          ['#tab1-content', '#tab4-content', '#tab6-content']
        : ['#tab1-content', '#tab2-content', '#tab3-content', '#tab4-content', '#tab5-content', '#tab6-content'];
      for (const divSelector of requiredDivs) {
        if (!$(divSelector).length) {
          $('#sbgStatistikTabContent').append(
            `<div class="tab-pane fade" id="${divSelector.substring(
              1,
            )}" role="tabpanel"><table id="${getTableIdFromContentId(
              divSelector.substring(1),
            )}" class="table table-striped table-bordered nowrap sbg-table-style" style="width:100%"></table></div>`,
          );
        }
        const tableId = getTableIdFromContentId(divSelector.substring(1));
        if (!$(divSelector).find(`#${tableId}`).length) {
          $(divSelector).html(
            `<table id="${tableId}" class="table table-striped table-bordered nowrap sbg-table-style" style="width:100%"></table>`,
          );
        }
      }
      if ($('#sbgStatistikTabs .nav-link.active').length === 0 && $('#sbgStatistikTabs .nav-link').length > 0) {
        $('#sbgStatistikTabs .nav-link:first').tab('show');
      }

      populateTableKelasHarian(dataKelas);
      populateTableKelasMingguan(dataKelas);
      populateTableMuridTH(dataMurid);
      if (!isGuruKelas) {
        populateTableTingkatanHarian(dataKelas);
        populateTableKeseluruhanHarian(dataKelas);
        populateTableTingkatanMingguan(dataKelas);
      }
      await notifyUser('Jadual statistik telah dimuatkan semula.', 'Statistik Selesai');
    }

    function getTableIdFromContentId(contentId) {
      const map =
        isGuruKelas ?
          {
            'tab1-content': 'tableKelasHarian',
            'tab4-content': 'tableKelasMingguan',
            'tab6-content': 'tableMuridTH',
          }
        : {
            'tab1-content': 'tableKelasHarian',
            'tab2-content': 'tableTingkatanHarian',
            'tab3-content': 'tableKeseluruhanHarian',
            'tab4-content': 'tableKelasMingguan',
            'tab5-content': 'tableTingkatanMingguan',
            'tab6-content': 'tableMuridTH',
          };
      return map[contentId] || `table_for_${contentId}`;
    }

    function semakTingkatanOptions() {
      const selectElement = document.getElementById('txtThnting');
      if (!selectElement) {
        console.warn('Elemen Select Tahun/Tingkatan tidak ditemukan.');
        return false;
      }
      const options = Array.from(selectElement.options);
      return options.some(option => option.textContent.includes('TINGKATAN'));
    }

    /**
     * Fungsi untuk menulis log ke textarea dengan timestamp dan icon
     * Fitur: Timestamp (HH:MM:SS), icon (✓/⚠), auto-scroll ke bawah
     */
    function writeLogKehadiran(message, isWarning = false, isError = false) {
      const textarea = document.getElementById('logKumpulKehadiran');
      if (!textarea) return;

      const timestamp = new Date().toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      let icon = '✓';
      if (isError) icon = '❌';
      else if (isWarning) icon = '⚠';

      const logEntry = `[${timestamp}] ${icon} ${message}`;
      textarea.value += (textarea.value ? '\n' : '') + logEntry;
      textarea.scrollTop = textarea.scrollHeight;
    }

    // Expose function ke window scope untuk akses global
    window.writeLogKehadiran = writeLogKehadiran;

    function createUIAndAttachEvents() {
      const myTab = document.querySelector('#myTab');
      if (myTab && !document.querySelector('.nav-link.docs-creator[data-target="#statistikSolusiBestariGuru"]')) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `<a class="nav-link docs-creator" href="javascript: void(0);" data-toggle="tab" data-target="#statistikSolusiBestariGuru" role="tab" aria-selected="false">✨ Statistik Kehadiran (SolusiBestariGuru)</a>`;
        myTab.appendChild(li);
      }

      const tabContentContainer = document.querySelector('div.nav-tabs-horizontal > div.tab-content');
      if (tabContentContainer && !document.getElementById('statistikSolusiBestariGuru')) {
        const tabPaneHTML = /*html*/ `
          <div class="tab-pane" id="statistikSolusiBestariGuru" role="tabpanel">
            <div class="container-fluid pt-3">
            <div class="row">
              <div class="col-md-3">
                <div class="cui-utils-title head_underline"><strong>Kumpul Kehadiran</strong>
                <h5 class="mb-0" style="text-transform: initial !important;">Muat Turun Data Kehadiran</h5>
                </div>
              </div>
              <div class="col-md-9" id="sbgKumpulLogDiv">
                <div class="form-group row">
                    <label for="logKumpulKehadiran" class="col-md-2 col-form-label text-md-right">Log Mesej:</label>
                    <div class="col-md-9">
                      <textarea id="logKumpulKehadiran" class="form-control" placeholder="Log proses akan dipaparkan di sini..." readonly="" style="width: 100%; height: 64px; resize: vertical;"></textarea>
                    </div>
                </div>
              </div>
              </div>
              <div class="row">
                <div class="col-md-12" id="sbgKumpulHarianDiv">
                  <div class="row align-items-center mb-3">
                    <div class="col-md-2"><label class="form-label mb-0" for="sbgTarikhPilihan">Pilih Tarikh Untuk Pengumpulan</label></div>
                    <div class="col-md-3">
                      <input type="text" class="form-control bg-white" id="sbgTarikhPilihan" name="sbgTarikhPilihan" placeholder="DD/MM/YYYY" data-toggle="datetimepicker" data-target="#sbgTarikhPilihan" data-validation="[DATE]" autocomplete="off"/>
                    </div>
                    <div class="col-md-4">
                      <button type="button" id="${BUTTON_ID_HARIAN_SCRIPT}" class="btn btn-primary btn-rounded btn-sm" style="margin: 5px; min-width: 280px;">
                        ${ORIGINAL_BUTTON_TEXT_HARIAN}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="col-md-12" id="sbgKumpulMingguanDiv">
                  <div class="row align-items-center mb-3">
                    <div class="col-md-2"><label class="form-label mb-0" for="senaraiMinggu">Pilih Minggu Untuk Pengumpulan</label></div>
                    <div class="col-md-3" id="mingguSelectContainer">
                      <!-- Pilihan Minggu akan dilampirkan di sini oleh createWeekSelectElement -->
                    </div>
                    <div class="col-md-4">
                      <button type="button" id="${BUTTON_ID_MINGGUAN_SCRIPT}" class="btn btn-info btn-rounded btn-sm" style="margin: 5px; min-width: 280px;">
                        ${ORIGINAL_BUTTON_TEXT_MINGGUAN}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="col-md-12 my-3"><hr></div>
                <div class="col-md-12" id="sbgPanelStatistikDiv">
                  <div class="statistik-content">
                    <div class="statistik-header d-flex justify-content-between align-items-center mb-2">
                    <div class="cui-utils-title head_underline"><strong>Statistik Kehadiran</strong>
                    <h5 class="mb-0" style="text-transform: initial !important;">Jadual Data Kehadiran</h5>
                    </div>
                      <button type="button" id="sbgSegarSemulaBtn" class="btn btn-outline-secondary btn-sm">Segar semula Jadual</button>
                    </div>
                    <div class="statistik-body">
                      <ul class="nav nav-tabs" id="sbgStatistikTabsInternal" role="tablist">
                        <li class="nav-item"><a class="nav-link active" id="sbgTab1-link" data-toggle="tab" href="#sbgTab1-content" role="tab">Kelas (Harian)</a></li>
                        ${
                          isGuruKelas ? '' : (
                            `
                        <li class="nav-item"><a class="nav-link" id="sbgTab2-link" data-toggle="tab" href="#sbgTab2-content" role="tab">${
                          isTingkatan ? 'Tingkatan' : 'Tahun'
                        } (Harian)</a></li>
                        <li class="nav-item"><a class="nav-link" id="sbgTab3-link" data-toggle="tab" href="#sbgTab3-content" role="tab">Keseluruhan (Harian)</a></li>
                        `
                          )
                        }
                        <li class="nav-item"><a class="nav-link" id="sbgTab4-link" data-toggle="tab" href="#sbgTab4-content" role="tab">Kelas (Mingguan)</a></li>
                        ${
                          isGuruKelas ? '' : (
                            `
                        <li class="nav-item"><a class="nav-link" id="sbgTab5-link" data-toggle="tab" href="#sbgTab5-content" role="tab">${
                          isTingkatan ? 'Tingkatan' : 'Tahun'
                        } (Mingguan)</a></li>
                        `
                          )
                        }
                        <li class="nav-item"><a class="nav-link" id="sbgTab6-link" data-toggle="tab" href="#sbgTab6-content" role="tab">Senarai Murid TH</a></li>
                      </ul>
                      <div class="tab-content" id="sbgStatistikTabContentInternal" style="padding-top: 15px;">
                        <div class="tab-pane fade show active" id="sbgTab1-content" role="tabpanel"><table id="tableKelasHarian" class="table table-striped table-bordered nowrap sbg-table-style" style="width:100%"></table></div>
                        ${
                          isGuruKelas ? '' : (
                            `
                        <div class="tab-pane fade" id="sbgTab2-content" role="tabpanel"><table id="tableTingkatanHarian" class="table table-striped table-bordered nowrap sbg-table-style" style="width:100%"></table></div>
                        <div class="tab-pane fade" id="sbgTab3-content" role="tabpanel"><table id="tableKeseluruhanHarian" class="table table-striped table-bordered nowrap sbg-table-style" style="width:100%"></table></div>
                        `
                          )
                        }
                        <div class="tab-pane fade" id="sbgTab4-content" role="tabpanel"><table id="tableKelasMingguan" class="table table-striped table-bordered nowrap sbg-table-style" style="width:100%"></table></div>
                        ${
                          isGuruKelas ? '' : (
                            `
                        <div class="tab-pane fade" id="sbgTab5-content" role="tabpanel"><table id="tableTingkatanMingguan" class="table table-striped table-bordered nowrap sbg-table-style" style="width:100%"></table></div>
                        `
                          )
                        }
                        <div class="tab-pane fade" id="sbgTab6-content" role="tabpanel"><table id="tableMuridTH" class="table table-striped table-bordered nowrap sbg-table-style" style="width:100%"></table></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-12 my-3"><hr></div>
                <div class="col-md-12" id="sbgPadamDataDiv">
                  <div class="row align-items-start">
                    <div class="col-md-6">
                      <label class="form-label" style="font-weight: 600; margin-bottom: 5px;">Padam Data Terkumpul</label>
                      <small class="form-text text-muted d-block" style="line-height: 1.4;">
                        Padamkan data kehadiran terkumpul untuk pengumpulan semula dalam Sesi Baharu Persekolahan
                      </small>
                    </div>
                    <div class="col-md-6 text-right">
                      <button type="button" id="sbgBtnPadamDataCache" class="btn btn-warning btn-rounded btn-sm" style="margin: 5px; min-width: 200px;">
                        Padam Data Terkumpul
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>`;
        tabContentContainer.insertAdjacentHTML('beforeend', tabPaneHTML);

        if (typeof $ !== 'undefined' && $.fn.datetimepicker) {
          $('#sbgTarikhPilihan').datetimepicker({
            format: 'DD/MM/YYYY',
            useCurrent: true,
            maxDate: new Date(),
            icons: {
              date: 'fa fa-calendar',
              up: 'fa fa-chevron-up',
              down: 'fa fa-chevron-down',
              previous: 'fa fa-chevron-left',
              next: 'fa fa-chevron-right',
              today: 'fa fa-calendar-check-o',
              clear: 'fa fa-trash',
              close: 'fa fa-times',
            },
          });
          if (!$('#sbgTarikhPilihan').val()) {
            $('#sbgTarikhPilihan').val(formatDateDDMMYYYY(new Date()));
          }
        } else {
          console.warn('Tempus Dominus tidak dijumpai. Pemilih tarikh akan menjadi input biasa.');
          $('#sbgTarikhPilihan').attr('type', 'date');
        }

        const weekSelectContainer = document.getElementById('mingguSelectContainer');
        if (weekSelectContainer) {
          const weekSelect = createWeekSelectElement();
          weekSelectContainer.appendChild(weekSelect);
          if (typeof $ !== 'undefined' && $.fn.selectpicker) {
            $(weekSelect).selectpicker('render');
          } else {
            console.warn('Bootstrap-select tidak dijumpai. Pemilih minggu akan menjadi pilihan standard.');
          }
        }

        document.getElementById(BUTTON_ID_HARIAN_SCRIPT)?.addEventListener('click', e => {
          e.preventDefault();
          extractInfoKehadiran(BUTTON_ID_HARIAN_SCRIPT, false, ORIGINAL_BUTTON_TEXT_HARIAN, LOADING_BUTTON_TEXT_HARIAN);
        });
        document.getElementById(BUTTON_ID_MINGGUAN_SCRIPT)?.addEventListener('click', e => {
          e.preventDefault();
          extractInfoKehadiran(
            BUTTON_ID_MINGGUAN_SCRIPT,
            true,
            ORIGINAL_BUTTON_TEXT_MINGGUAN,
            LOADING_BUTTON_TEXT_MINGGUAN,
          );
        });
        document.getElementById('sbgSegarSemulaBtn')?.addEventListener('click', e => {
          e.preventDefault();
          renderAllStatistikTables();
        });
        document.getElementById('sbgBtnPadamDataCache')?.addEventListener('click', e => {
          e.preventDefault();
          handlePadamDataCache();
        });

        if (typeof $ !== 'undefined' && typeof $.fn.tab !== 'undefined') {
          $('#sbgStatistikTabsInternal a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            const targetTable = $($(e.target).attr('href')).find('table');
            if ($.fn.DataTable.isDataTable(targetTable)) {
              targetTable.DataTable().columns.adjust().responsive.recalc();
            }
          });
        }
      }
    }

    function kiraPeratus(hadir, tidakhadir) {
      const jumlah = hadir + tidakhadir;
      return jumlah > 0 ? ((hadir / jumlah) * 100).toFixed(1) + '%' : '0.0%';
    }

    function initOrRedrawTable(
      tableId,
      data,
      columns,
      rowGroupDataSrc = null,
      order = [[0, 'asc']],
      orderByRowGroup = true,
      tajuk = 'Statistik Kehadiran SolusiBestariGuru',
    ) {
      if (typeof $ === 'undefined' || typeof $.fn.DataTable !== 'function') {
        console.error(`DataTables tidak tersedia untuk #${tableId}.`);
        return;
      }
      const table = $(`#${tableId}`);
      const SBG = 'Disediakan oleh SolusiBestariGuru';
      const dtOptions = {
        data: data,
        columns: columns,
        responsive: true,
        language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/ms.json' },
        dom: '<"inline-flex"fBp>t<"inline-flex"pil>',
        lengthMenu: [
          [20, 30, 50, 100, -1],
          [20, 30, 50, 100, 'Semua'],
        ],
        pageLength: 20,
        buttons: [
          {
            extend: 'copy',
            text: 'Salin',
            title: tajuk,
            messageTop: NAMA_SEKOLAH,
            messageBottom: SBG,
          },
          {
            extend: 'excel',
            text: 'Excel',
            title: tajuk,
            messageTop: NAMA_SEKOLAH,
            messageBottom: SBG,
          },
          {
            extend: 'pdf',
            text: 'PDF',
            orientation: 'portrait',
            pageSize: 'A4',
            title: tajuk,
            messageTop: NAMA_SEKOLAH,
            messageBottom: SBG,
          },
          {
            extend: 'print',
            text: 'Cetak',
            title: tajuk,
            messageTop: NAMA_SEKOLAH,
            messageBottom: SBG,
          },
        ],
      };
      if (rowGroupDataSrc !== null) {
        dtOptions.rowGroup = { dataSrc: rowGroupDataSrc };
        dtOptions.order = timbangSusunan(columns, rowGroupDataSrc, order, orderByRowGroup, tableId);
      } else {
        dtOptions.order = order;
      }

      function timbangSusunan(columns, rowGroupDataSrc, order, orderByRowGroup, tableId) {
        if (!orderByRowGroup) return order;

        const groupColIndex = columns.findIndex(c => c.data === rowGroupDataSrc);
        if (groupColIndex === -1) {
          console.warn(`RowGroup dataSrc '${rowGroupDataSrc}' tiada untuk #${tableId}.`);
          return order;
        }

        let susunanBaru = [[groupColIndex, 'asc']];
        if (order.length > 0 && order[0][0] !== groupColIndex) {
          susunanBaru.push(...order);
        } else if (order.length > 1 && order[0][0] === groupColIndex) {
          susunanBaru.push(...order.slice(1));
        } else if (order.length === 0 && groupColIndex !== 0) {
          susunanBaru.push([0, 'asc']);
        } else if (order.length === 0 && groupColIndex === 0 && columns.length > 1) {
          susunanBaru.push([1, 'asc']);
        }
        return susunanBaru;
      }

      if ($.fn.DataTable.isDataTable(table)) {
        table.DataTable().destroy();
        table.empty();
      }
      table.DataTable(dtOptions);
    }

    function simplifyNama(nama) {
      if (!nama) return '';
      return nama
        .replace(/ SATU/gi, ' 1')
        .replace(/ DUA/gi, ' 2')
        .replace(/ TIGA/gi, ' 3')
        .replace(/ EMPAT/gi, ' 4')
        .replace(/ LIMA/gi, ' 5')
        .replace(/ ENAM/gi, ' 6')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const populateTableKelasHarian = dataKelas => {
      const tableData = dataKelas.map(item => ({
        tarikh: item.tarikh,
        hari: getNamaHari(item.tarikh),
        nama_kelas_penuh: simplifyNama(item.nama_kelas_penuh.replace(/TINGKATAN|TAHUN/gi, '')),
        jumlah_hadir: item.jumlah_hadir,
        jumlah_tidak_hadir: item.jumlah_tidak_hadir,
        peratus_hadir: kiraPeratus(item.jumlah_hadir, item.jumlah_tidak_hadir),
      }));
      initOrRedrawTable(
        'tableKelasHarian',
        tableData,
        [
          { data: 'tarikh', title: 'Tarikh' },
          { data: 'hari', title: 'Hari' },
          { data: 'nama_kelas_penuh', title: 'Nama Kelas' },
          { data: 'jumlah_hadir', title: 'Hadir', className: 'dt-type-numeric' },
          { data: 'jumlah_tidak_hadir', title: 'Tidak Hadir', className: 'dt-type-numeric' },
          { data: 'peratus_hadir', title: '% Kehadiran', className: 'dt-type-numeric' },
        ],
        'nama_kelas_penuh',
        [[0, 'desc']],
        true,
        'Statistik Kehadiran Harian Bagi Kelas',
      );
    };

    const populateTableTingkatanHarian = dataKelas => {
      const grouped = {};
      dataKelas.forEach(item => {
        const key = `${item.tarikh}|${item.tahun_tingkatan}`;
        if (!grouped[key])
          grouped[key] = {
            tarikh: item.tarikh,
            hari: getNamaHari(item.tarikh),
            tahun_tingkatan: simplifyNama(item.tahun_tingkatan),
            jumlah_hadir: 0,
            jumlah_tidak_hadir: 0,
          };
        grouped[key].jumlah_hadir += item.jumlah_hadir;
        grouped[key].jumlah_tidak_hadir += item.jumlah_tidak_hadir;
      });
      const tableData = Object.values(grouped).map(item => ({
        ...item,
        peratus_hadir: kiraPeratus(item.jumlah_hadir, item.jumlah_tidak_hadir),
      }));

      initOrRedrawTable(
        'tableTingkatanHarian',
        tableData,
        [
          { data: 'tarikh', title: 'Tarikh' },
          { data: 'hari', title: 'Hari' },
          { data: 'tahun_tingkatan', title: isTingkatan ? 'Tingkatan' : 'Tahun' },
          { data: 'jumlah_hadir', title: 'Hadir', className: 'dt-type-numeric' },
          { data: 'jumlah_tidak_hadir', title: 'Tidak Hadir', className: 'dt-type-numeric' },
          { data: 'peratus_hadir', title: '% Kehadiran', className: 'dt-type-numeric' },
        ],
        'tahun_tingkatan',
        [[0, 'desc']],
        true,
        `Statistik Kehadiran Harian Bagi ${isTingkatan ? 'Tingkatan' : 'Tahun'}`,
      );
    };

    const populateTableKeseluruhanHarian = dataKelas => {
      const grouped = {};
      dataKelas.forEach(item => {
        const key = item.tarikh;
        if (!grouped[key])
          grouped[key] = {
            tarikh: item.tarikh,
            hari: getNamaHari(item.tarikh),
            jumlah_hadir: 0,
            jumlah_tidak_hadir: 0,
          };
        grouped[key].jumlah_hadir += item.jumlah_hadir;
        grouped[key].jumlah_tidak_hadir += item.jumlah_tidak_hadir;
      });
      const tableData = Object.values(grouped).map(item => ({
        ...item,
        peratus_hadir: kiraPeratus(item.jumlah_hadir, item.jumlah_tidak_hadir),
      }));
      initOrRedrawTable(
        'tableKeseluruhanHarian',
        tableData,
        [
          { data: 'tarikh', title: 'Tarikh' },
          { data: 'hari', title: 'Hari' },
          { data: 'jumlah_hadir', title: 'Hadir', className: 'dt-type-numeric' },
          { data: 'jumlah_tidak_hadir', title: 'Tidak Hadir', className: 'dt-type-numeric' },
          { data: 'peratus_hadir', title: '% Kehadiran', className: 'dt-type-numeric' },
        ],
        null,
        [[0, 'desc']],
        true,
        'Statistik Kehadiran Harian Bagi Keseluruhan Murid',
      );
    };

    const populateTableKelasMingguan = dataKelas => {
      const grouped = {};
      dataKelas.forEach(item => {
        const weekInfo = getISOWeekInfo(item.tarikh);
        const namaKelasKey = simplifyNama(item.nama_kelas_penuh.replace(/TINGKATAN|TAHUN/gi, ''));
        const key = `${weekInfo.weekDisplay}|${namaKelasKey}`;
        if (!grouped[key])
          grouped[key] = {
            paparan_minggu: weekInfo.weekDisplay,
            nama_kelas_penuh: namaKelasKey,
            jumlah_hadir: 0,
            jumlah_tidak_hadir: 0,
            senarai_tarikh: new Set(),
          };
        grouped[key].jumlah_hadir += item.jumlah_hadir;
        grouped[key].jumlah_tidak_hadir += item.jumlah_tidak_hadir;
        grouped[key].senarai_tarikh.add(item.tarikh);
      });
      const tableData = Object.values(grouped).map(item => ({
        paparan_minggu: item.paparan_minggu,
        tarikh_dlm_minggu: Array.from(item.senarai_tarikh).sort().join(', '),
        nama_kelas_penuh: item.nama_kelas_penuh,
        jumlah_hadir: item.jumlah_hadir,
        jumlah_tidak_hadir: item.jumlah_tidak_hadir,
        peratus_hadir: kiraPeratus(item.jumlah_hadir, item.jumlah_tidak_hadir),
      }));
      initOrRedrawTable(
        'tableKelasMingguan',
        tableData,
        [
          { data: 'paparan_minggu', title: 'Minggu' },
          { data: 'tarikh_dlm_minggu', title: 'Tarikh Persekolahan Dalam Minggu' },
          { data: 'nama_kelas_penuh', title: 'Nama Kelas' },
          { data: 'jumlah_hadir', title: 'Jumlah Kehadiran', className: 'dt-type-numeric' },
          { data: 'jumlah_tidak_hadir', title: 'Jumlah Ketidakhadiran', className: 'dt-type-numeric' },
          { data: 'peratus_hadir', title: '% Kehadiran', className: 'dt-type-numeric' },
        ],
        'paparan_minggu',
        [
          [1, 'desc'],
          [2, 'asc'],
        ],
        false,
        'Statistik Kehadiran Mingguan Bagi Kelas',
      );
    };

    const populateTableTingkatanMingguan = dataKelas => {
      const grouped = {};
      dataKelas.forEach(item => {
        const weekInfo = getISOWeekInfo(item.tarikh);
        const tingkatanKey = simplifyNama(item.tahun_tingkatan);
        const key = `${weekInfo.weekDisplay}|${tingkatanKey}`;
        if (!grouped[key])
          grouped[key] = {
            paparan_minggu: weekInfo.weekDisplay,
            tahun_tingkatan: tingkatanKey,
            jumlah_hadir: 0,
            jumlah_tidak_hadir: 0,
            senarai_tarikh: new Set(),
          };
        grouped[key].jumlah_hadir += item.jumlah_hadir;
        grouped[key].jumlah_tidak_hadir += item.jumlah_tidak_hadir;
        grouped[key].senarai_tarikh.add(item.tarikh);
      });
      const tableData = Object.values(grouped).map(item => ({
        paparan_minggu: item.paparan_minggu,
        tarikh_dlm_minggu: Array.from(item.senarai_tarikh).sort().join(', '),
        tahun_tingkatan: item.tahun_tingkatan,
        jumlah_hadir: item.jumlah_hadir,
        jumlah_tidak_hadir: item.jumlah_tidak_hadir,
        peratus_hadir: kiraPeratus(item.jumlah_hadir, item.jumlah_tidak_hadir),
      }));

      initOrRedrawTable(
        'tableTingkatanMingguan',
        tableData,
        [
          { data: 'paparan_minggu', title: 'Minggu' },
          { data: 'tarikh_dlm_minggu', title: 'Tarikh Persekolahan Dalam Minggu' },
          { data: 'tahun_tingkatan', title: isTingkatan ? 'Tingkatan' : 'Tahun' },
          { data: 'jumlah_hadir', title: 'Jumlah Kehadiran', className: 'dt-type-numeric' },
          { data: 'jumlah_tidak_hadir', title: 'Jumlah Ketidakhadiran', className: 'dt-type-numeric' },
          { data: 'peratus_hadir', title: '% Kehadiran', className: 'dt-type-numeric' },
        ],
        'paparan_minggu',
        [
          [1, 'desc'],
          [2, 'asc'],
        ],
        false,
        `Statistik Kehadiran Mingguan Bagi ${isTingkatan ? 'Tingkatan' : 'Tahun'}`,
      );
    };

    const populateTableMuridTH = dataMurid => {
      const kiraanPonteng = {};
      dataMurid
        .filter(m => m.sebab_tidak_hadir || m.kategori_tidak_hadir !== null)
        .sort((a, b) => a.tarikh.localeCompare(b.tarikh))
        .forEach(item => {
          if (item.kategori_tidak_hadir && item.kategori_tidak_hadir.includes('PONTENG')) {
            const muridKey = item.id_individu;
            kiraanPonteng[muridKey] = (kiraanPonteng[muridKey] || 0) + 1;
            item.jumlah_ponteng = kiraanPonteng[muridKey];
          }
        });

      const tableData = dataMurid
        .filter(m => m.sebab_tidak_hadir || m.kategori_tidak_hadir !== null)
        .map(item => ({
          tarikh: item.tarikh,
          paparan_minggu: getISOWeekInfo(item.tarikh).weekDisplay,
          hari: getNamaHari(item.tarikh),
          nama_kelas_penuh: simplifyNama(item.nama_kelas_penuh.replace(/TINGKATAN|TAHUN/gi, '')),
          nama_murid: item.nama_murid,
          kategori_tidak_hadir: item.kategori_tidak_hadir,
          sebab_tidak_hadir: item.sebab_tidak_hadir || '-',
          ponteng_kali_ke:
            item.kategori_tidak_hadir && item.kategori_tidak_hadir.includes('PONTENG') ? item.jumlah_ponteng : '-',
        }));

      initOrRedrawTable(
        'tableMuridTH',
        tableData,
        [
          { data: 'paparan_minggu', title: 'Minggu' },
          { data: 'tarikh', title: 'Tarikh' },
          { data: 'hari', title: 'Hari' },
          { data: 'nama_kelas_penuh', title: 'Nama Kelas' },
          { data: 'nama_murid', title: 'Nama Murid' },
          { data: 'kategori_tidak_hadir', title: 'Kategori Tidak Hadir' },
          { data: 'sebab_tidak_hadir', title: 'Sebab Tidak Hadir' },
          { data: 'ponteng_kali_ke', title: 'Ponteng Kali Ke', className: 'dt-type-numeric' },
        ],
        'nama_kelas_penuh',
        [
          [4, 'asc'],
          [1, 'asc'],
        ],
        true,
        'Senarai Murid Tidak Hadir Mengikut Kelas',
      );
    };

    async function init() {
      await handleCacheMigration();
      if (!document.getElementById('userscript-sbg-styles')) {
        GM_addStyle(`
          .userscript-spinner { display: inline-block; width: 1em; height: 1em; border: 2px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin-right: 5px; vertical-align: middle; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .sbg-table-style { font-size: 1.0em !important; }
          .sbg-table-style td.dt-type-numeric, .sbg-table-style th.dt-type-numeric { font-size: 1.05em !important; text-align: right !important; }
          .sbg-table-style td, .sbg-table-style th { vertical-align: middle !important; padding: 5px 8px !important; }
          .inline-flex {  display: flex;  justify-content: space-between; align-items: center; }
        `);
        const styleTag = document.createElement('style');
        styleTag.id = 'userscript-sbg-styles';
        document.head.appendChild(styleTag);
      }
      createUIAndAttachEvents();
      renderAllStatistikTables();
    }

    if (typeof $ === 'function') {
      $(document).ready(function () {
        init();
      });
    } else {
      window.addEventListener('load', function () {
        if (typeof $ === 'function') {
          init();
        } else {
          console.error('Skrip SBG: JQuery tidak tersedia. Skrip tidak dapat dijalankan.');
          GM.notification({ text: 'Skrip SBG memerlukan jQuery.', title: 'Ralat Pustaka SBG', timeout: 10000 });
        }
      });
    }
  }

  // ==========================================
  // SUBSISTEM 2: EKSTRAK MAKLUMAT MURID
  // ==========================================
  function runProfilPelajarScript() {
    const MAKLUMAT_MURID = {
      nama_murid: undefined,
      nama_kelas: undefined,
      nombor_pengenalan: undefined,
      jenis_pengenalan: undefined,
      jantina: undefined,
      tarikh_masuk_sekolah: undefined,
      tarikh_lahir: undefined,
      umur: undefined,
      agama: undefined,
      warganegara: undefined,
      keturunan: undefined,
      status_yatim: undefined,
      negeri_lahir: undefined,
      guru_kelas: undefined,
      sekolah: undefined,
      ppd: undefined,
      telefon: undefined,
      emel: undefined,
      bahasa_pertuturan_di_rumah: undefined,
      adik_beradik: [],
      ibu_bapa: {
        bapa_biologi: {
          nama: undefined,
          kewarganegaraan: undefined,
          tarikh_lahir: undefined,
          umur: undefined,
          nombor_pengenalan: undefined,
          jantina: undefined,
          agama: undefined,
          keturunan: undefined,
          telefon: undefined,
        },
        ibu_biologi: {
          nama: undefined,
          kewarganegaraan: undefined,
          tarikh_lahir: undefined,
          umur: undefined,
          nombor_pengenalan: undefined,
          jantina: undefined,
          agama: undefined,
          keturunan: undefined,
          status_perkahwinan: undefined,
          tarikh_kahwin: undefined,
          tarikh_cerai: undefined,
          tarikh_balu: undefined,
          nama_pasangan: undefined,
          telefon: undefined,
        },
      },
      penjaga: {
        penjaga_utama: {
          hubungan_dengan_anak_jagaan: undefined,
          nama: undefined,
          kewarganegaraan: undefined,
          tarikh_lahir: undefined,
          umur: undefined,
          nombor_pengenalan: undefined,
          jenis_pengenalan: undefined,
          agama: undefined,
          keturunan: undefined,
          telefon: undefined,
          jantina: undefined,
          emel: undefined,
          pasangan_sebagai_penjaga_kedua: undefined,
          nama_pasangan_penjaga_kedua: undefined,
          pekerjaan: {
            tidak_bekerja_atau_lainnya: undefined,
            nama_pekerjaan: undefined,
            kategori_pekerjaan_utama: undefined,
            kategori_pekerjaan_kecil: undefined,
            nama_majikan: undefined,
            tel_pejabat: undefined,
            alamat_majikan: undefined,
            poskod_majikan: undefined,
            bandar_majikan: undefined,
            negeri_majikan: undefined,
            tiada_maklumat_pendapatan: undefined,
            pendapatan_bulanan: undefined,
            sumber_pendapatan_jika_tiada: undefined,
          },
        },
        penjaga_kedua: {
          hubungan_dengan_anak_jagaan: undefined,
          status_penjaga_kedua: undefined,
          nama: undefined,
          kewarganegaraan: undefined,
          tarikh_lahir: undefined,
          umur: undefined,
          nombor_pengenalan: undefined,
          jenis_pengenalan: undefined,
          agama: undefined,
          keturunan: undefined,
          telefon: undefined,
          jantina: undefined,
          emel: undefined,
          pekerjaan: {
            tidak_bekerja_atau_lainnya: undefined,
            nama_pekerjaan: undefined,
            kategori_pekerjaan_utama: undefined,
            kategori_pekerjaan_kecil: undefined,
            nama_majikan: undefined,
            tel_pejabat: undefined,
            alamat_majikan: undefined,
            poskod_majikan: undefined,
            bandar_majikan: undefined,
            negeri_majikan: undefined,
            tiada_maklumat_pendapatan: undefined,
            pendapatan_bulanan: undefined,
            sumber_pendapatan_jika_tiada: undefined,
          },
        },
        tanggungan_isi_rumah: {
          bilangan_tanggungan: undefined,
          jumlah_pendapatan: undefined,
          pendapatan_per_kapita: undefined,
          senarai_tanggungan: [],
        },
      },
      tinggal_bersama: {
        tinggal_bersama_dengan: undefined,
        nama: undefined,
        kewarganegaraan: undefined,
        tarikh_lahir: undefined,
        umur: undefined,
        nombor_pengenalan: undefined,
        jenis_pengenalan: undefined,
        agama: undefined,
        keturunan: undefined,
        telefon: undefined,
        jantina: undefined,
      },
      tempat_tinggal: {
        tinggal_dengan_ibubapa_penjaga: undefined,
        alamat_lain: undefined,
        alamat_kediaman: undefined,
        poskod_kediaman: undefined,
        jalan_taman_kawasan_kediaman: '',
        bandar_kediaman: '',
        negeri_kediaman: undefined,
      },
      kesihatan: {
        alahan_alergi: {
          status: undefined,
          senarai: [],
        },
        penyakit_atau_masalah_kesihatan: {
          status: undefined,
          senarai: [],
        },
        sejarah_imunisasi: {
          status: undefined,
          bcg: { status_ya: false, tarikh_diberi: undefined },
          hepatitis_b: { status_ya: false, dos: [] },
          difteria: { status_ya: false, dos: [] },
          pertussis: { status_ya: false, dos: [] },
          tetanus: { status_ya: false, dos: [] },
          haemophilus_influenza_hib: { status_ya: false, dos: [] },
          polio_ipv: { status_ya: false, dos: [] },
          measles: { status_ya: false, dos: [] },
          mumps: { status_ya: false, dos: [] },
          rubella: { status_ya: false, dos: [] },
        },
        rawatan_pergigian: {
          masalah_berkaitan_darah: undefined,
          kacacatan_mental: undefined,
          alahan: undefined,
          kencing_manis: undefined,
          lelah_asma: undefined,
          penyakit_jantung: undefined,
          penyakit_sawan: undefined,
          darah_tinggi: undefined,
          masalah_buah_pinggang: undefined,
          pendarahan_selepas_cabutan_gigi: undefined,
          pengambilan_ubat_ubatan: undefined,
          keterangan_ubat_ubatan: undefined,
          lain_lain_kesihatan: undefined,
          status_kebenaran: undefined,
          tarikh_tandatangan: undefined,
        },
        pemeriksaan_kesihatan: {
          persetujuan_pemeriksaan: undefined,
          persetujuan_rawatan: undefined,
          imunisasi_dt_tahun_satu: undefined,
          imunisasi_hpv_ting1_perempuan: undefined,
          imunisasi_att_ting3: undefined,
          rujukan: undefined,
          nama_penjaga: undefined,
          no_kp_penjaga: undefined,
        },
        berat_dan_tinggi: {
          berat_kg: undefined,
          tinggi_cm: undefined,
          tarikh_masa_rekod_bmi: undefined,
        },
        status_oku: {
          adalah_oku: undefined,
          tarikh_kemaskini_smoku: undefined,
          kategori_ketidakupayaan: undefined,
          sub_kategori_ketidakupayaan: undefined,
          no_surat_pengesahan_perubatan: undefined,
          tarikh_kelulusan_daftar_oku: undefined,
          tarikh_pengesahan_perubatan: undefined,
          tarikh_daftar_oku: undefined,
          nama_bank_bantuan: undefined,
          no_akaun_bank_bantuan: undefined,
          alat_bantuan_teknologi_1: undefined,
          alat_bantuan_teknologi_2: undefined,
          program_pendidikan_khas: undefined,
          kategori_inklusif: undefined,
          tahap_pembelajaran: undefined,
        },
      },
      status_asrama: {
        tinggal_di_asrama: undefined,
        jenis_asrama: undefined,
        nama_asrama: undefined,
      },
      pengesahan_maklumat: {
        telah_disahkan: undefined,
        tarikh_perakuan_dihantar: undefined,
      },
    };

    const normalizeMoeispelUrl = value => {
      if (value === undefined || value === null) return undefined;
      const normalized = `${value}`.replace(/\u00a0/g, ' ').trim();
      if (normalized === '') return undefined;
      return normalized.replace(/^http:\/\/moeispel\.moe\.gov\.my/i, 'https://moeispel.moe.gov.my');
    };

    const isProfilMuridDocument = currentDoc => {
      const markers = ['#anak_profil', '#bapabio', '#ibubio', '#anak_penjaga', '#anak_kesihatan', '#anak_pengesahan'];
      return markers.some(selector => currentDoc.querySelector(selector));
    };

    const ekstrakInfo = (doc = document) => {
      const maklumatMurid = JSON.parse(JSON.stringify(MAKLUMAT_MURID));
      const extractionWarnings = [];
      const normalizeValue = value => {
        if (value === undefined || value === null) return undefined;
        const normalized = `${value}`.replace(/\u00a0/g, ' ').trim();
        return normalized === '' ? undefined : normalized;
      };

      const queryWithin = (selector, parent = doc) => parent?.querySelector?.(selector) ?? null;

      const queryWithinAny = (selectors, parent = doc) => {
        for (const selector of selectors) {
          const element = queryWithin(selector, parent);
          if (element) return element;
        }
        return null;
      };

      const getTextContent = (selector, parent = doc) => {
        const element = queryWithin(selector, parent);
        return normalizeValue(element?.textContent);
      };

      const getTextContentAny = (selectors, parent = doc) => {
        const element = queryWithinAny(selectors, parent);
        return normalizeValue(element?.textContent);
      };

      const getInputValue = (selector, parent = doc) => {
        const element = queryWithin(selector, parent);
        return normalizeValue(element?.value);
      };

      const getInputValueAny = (selectors, parent = doc) => {
        const element = queryWithinAny(selectors, parent);
        return normalizeValue(element?.value);
      };

      const formatNomborPengenalan = value => {
        const nomborPengenalan = normalizeValue(value);
        if (!nomborPengenalan) return undefined;
        return /^\d{12}$/.test(nomborPengenalan) ?
            nomborPengenalan.replace(/(\d{6})(\d{2})(\d{4})/, '$1-$2-$3')
          : nomborPengenalan;
      };

      const convertTarikhToISO = value => {
        const tarikh = normalizeValue(value);
        if (!tarikh) return undefined;
        const match = tarikh.match(/^(\d{1,2})\/?(\d{1,2})\/?(\d{4})$/);
        if (match) {
          const day = String(match[1]).padStart(2, '0');
          const month = String(match[2]).padStart(2, '0');
          const year = match[3];
          return `${year}-${month}-${day}`;
        }
        return tarikh;
      };

      const getSelectedOptionText = selectElement => {
        if (
          !selectElement ||
          !selectElement.options ||
          selectElement.selectedIndex === undefined ||
          selectElement.selectedIndex < 0
        ) {
          return undefined;
        }
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        const selectedValue = normalizeValue(selectedOption?.value);
        if (!selectedValue) {
          return undefined;
        }
        return normalizeValue(selectedOption?.textContent);
      };

      const getSelectedOptionValue = (selectorOrElement, parent = doc) => {
        const selectElement =
          typeof selectorOrElement === 'string' ? queryWithin(selectorOrElement, parent) : selectorOrElement;
        if (selectElement) {
          const selectedOption = selectElement.options[selectElement.selectedIndex];
          return normalizeValue(selectedOption?.value);
        }
        return undefined;
      };

      const getSelectedOptionTextAny = (selectors, parent = doc) => {
        const selectElement = queryWithinAny(selectors, parent);
        return getSelectedOptionText(selectElement);
      };

      const getCheckboxState = (selector, parent = doc) => {
        const chkboxElement = queryWithin(selector, parent);
        if (!chkboxElement) return false;
        return chkboxElement.checked || chkboxElement.hasAttribute('checked');
      };

      const getCheckboxCheckedState = (selector, parent = doc) => {
        return getCheckboxState(selector, parent);
      };

      const toYaTidakValue = value => {
        if (value === true) return 'Ya';
        if (value === false) return 'Tidak';
        return undefined;
      };

      const getYaTidakTextState = (yaSelector, tidakSelector, parent = doc) => {
        const yaChecked = getCheckboxCheckedState(yaSelector, parent);
        const tidakChecked = getCheckboxCheckedState(tidakSelector, parent);

        if (tidakChecked) return 'Tidak';
        if (yaChecked) return 'Ya';
        return undefined;
      };

      const getRadioSelection = (name, parent = doc) => {
        const selectedRadio =
          queryWithin(`input[name="${name}"]:checked`, parent) || queryWithin(`input[name="${name}"][checked]`, parent);
        return normalizeValue(selectedRadio?.value);
      };

      const getTelefon = (prefixSelector, nomborSelector, parent = doc) => {
        const prefixSelect = queryWithin(prefixSelector, parent);
        const prefix = getSelectedOptionText(prefixSelect) || getSelectedOptionValue(prefixSelect);
        const nomborTelefon = getInputValue(nomborSelector, parent);
        if (prefix && nomborTelefon) return `${prefix}-${nomborTelefon}`;
        return nomborTelefon;
      };

      const getAuditTrail = (tabSelector, index = 0, options = {}) => {
        const tab = queryWithin(tabSelector, doc);
        if (!tab) return null;

        if (options.formId) {
          const formEl = tab.querySelector(`form#${options.formId}`);
          const byForm = formEl?.closest('#audit-trail');
          if (byForm) return byForm;
        }

        const auditTrails = Array.from(tab.querySelectorAll('div#audit-trail, #audit-trail'));

        if (options.containsSelector) {
          const byContains = auditTrails.find(trail => trail.querySelector(options.containsSelector));
          if (byContains) return byContains;
        }

        return auditTrails[index] || null;
      };

      const catatAmaranEkstraksi = (fieldName, hint) => {
        extractionWarnings.push(`${fieldName}${hint ? ` (${hint})` : ''}`);
      };

      const getScriptPrefillValues = (parent, functionName) => {
        const scriptText = Array.from(parent?.querySelectorAll?.('script') || [])
          .map(script => script.textContent)
          .join('\n');
        if (!scriptText) return { firstArg: undefined, secondArg: undefined };
        const escapedFunctionName = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = scriptText.match(
          new RegExp(`${escapedFunctionName}\\([^\\)]*?['\"]([^'\"]*)['\"]\\s*,\\s*['\"]([^'\"]*)['\"]\\s*\\)`, 'i'),
        );
        return {
          firstArg: normalizeValue(match?.[1]),
          secondArg: normalizeValue(match?.[2]),
        };
      };

      const formatKelas = kelasText => {
        if (!kelasText) return undefined;
        const parts = kelasText.split('|').map(s => s.trim());
        return parts.length >= 2 ? `${parts[1].replace('T', '').trim()} ${parts[0]}` : kelasText;
      };

      const ekstrakKesihatanSenarai = (parentTab, targetObject, count, rowsSelector, selectName, inputName) => {
        const rows = parentTab.querySelectorAll(rowsSelector);
        targetObject.senarai = Array.from(rows)
          .map(row => {
            const jenisSelect = row.querySelector(`select[name="${selectName}"]`);
            return {
              jenis: getSelectedOptionText(jenisSelect),
              keterangan: getInputValue(`input[name="${inputName}"]`, row),
            };
          })
          .filter(item => item.jenis || item.keterangan);

        targetObject.status = count > 0 ? 'Ada' : 'Tiada';
      };

      const ruanganMaklumatMuridHeader = doc.querySelector(
        'div.cui-layout-content div.card > div.card-header > div.row > div.col-lg-10',
      );

      if (ruanganMaklumatMuridHeader) {
        const getHeaderValueByLabel = labelPattern => {
          const rows = ruanganMaklumatMuridHeader.querySelectorAll(':scope > div.row');
          for (const row of rows) {
            // Ambil span PERTAMA dalam div:nth-child(1) - ini adalah label, bukan colon
            const labelSpan = row.querySelector('div:nth-child(1) > span:first-child');
            const labelText = normalizeValue(labelSpan?.textContent);
            if (!labelText || !labelPattern.test(labelText)) continue;

            // Ambil span PERTAMA dalam div:nth-child(2) - ini adalah value sebenar
            const valueSpan = row.querySelector('div:nth-child(2) > span:first-child');
            const valueText = normalizeValue(valueSpan?.textContent);
            if (valueText) return valueText;
          }
          return undefined;
        };

        maklumatMurid.nama_murid =
          getHeaderValueByLabel(/^nama$/i) ||
          getTextContent('div.row:nth-child(1) > div:nth-child(2) > span', ruanganMaklumatMuridHeader);

        maklumatMurid.jenis_pengenalan =
          getHeaderValueByLabel(/^jenis\s+pengenalan$/i) ||
          getTextContent('div.row:nth-child(2) > div:nth-child(2) > span', ruanganMaklumatMuridHeader);

        maklumatMurid.nombor_pengenalan = formatNomborPengenalan(
          getHeaderValueByLabel(/^nombor\s+pengenalan$/i) ||
            getTextContent('div.row:nth-child(3) > div:nth-child(2) > span', ruanganMaklumatMuridHeader),
        );

        const classInfoText =
          getHeaderValueByLabel(/^maklumat\s+kelas$/i) ||
          getTextContent('div.row:nth-child(4) > div:nth-child(2) > span', ruanganMaklumatMuridHeader);
        maklumatMurid.nama_kelas = classInfoText ? formatKelas(classInfoText) : undefined;

        maklumatMurid.guru_kelas =
          getHeaderValueByLabel(/^maklumat\s+guru\s+kelas$/i) ||
          getTextContent('div.row:nth-child(5) > div:nth-child(2) > span', ruanganMaklumatMuridHeader);

        maklumatMurid.sekolah =
          getHeaderValueByLabel(/^maklumat\s+sekolah$/i) ||
          getTextContent('div.row:nth-child(6) > div:nth-child(2) > span', ruanganMaklumatMuridHeader);

        maklumatMurid.tarikh_masuk_sekolah = convertTarikhToISO(
          getHeaderValueByLabel(/^tarikh\s+masuk\s+sekolah$/i) ||
            getTextContent('div.row:nth-child(7) > div:nth-child(2) > span', ruanganMaklumatMuridHeader),
        );

        maklumatMurid.ppd =
          getHeaderValueByLabel(/^maklumat\s+ppd$/i) ||
          getTextContent('div.row:nth-child(8) > div:nth-child(2) > span', ruanganMaklumatMuridHeader);
      }

      const profilMuridAuditTrail = getAuditTrail('#anak_profil', 0, {
        containsSelector: 'input#datepicker-only-init',
      });
      if (profilMuridAuditTrail) {
        maklumatMurid.tarikh_lahir = convertTarikhToISO(
          getInputValue('input#datepicker-only-init', profilMuridAuditTrail),
        );
        maklumatMurid.umur = getInputValue('input#umur', profilMuridAuditTrail);
        maklumatMurid.agama = getInputValue('input#Agama', profilMuridAuditTrail);
        maklumatMurid.warganegara = getInputValue(
          'input[name="validation-simple[Status Warganegara]"]',
          profilMuridAuditTrail,
        );
        maklumatMurid.jantina = getInputValue('input#jantina', profilMuridAuditTrail);
        maklumatMurid.keturunan = getInputValue('input#Keturunan', profilMuridAuditTrail);
        maklumatMurid.status_yatim = getInputValue('input#status_yatim', profilMuridAuditTrail);
        maklumatMurid.negeri_lahir = getSelectedOptionText(profilMuridAuditTrail.querySelector('select#negeriLahir'));
        maklumatMurid.telefon = getTelefon('select#prefix', 'input#no_tel', profilMuridAuditTrail);
        maklumatMurid.emel = getInputValue('input#email', profilMuridAuditTrail);

        const siblingsTable = profilMuridAuditTrail.querySelector('table');
        if (siblingsTable) {
          const siblingRows = siblingsTable.querySelectorAll('tbody tr');
          maklumatMurid.adik_beradik = Array.from(siblingRows).map(row => {
            const susunanSelect = row.querySelector('select[name="adik_beradik[]"]');
            return {
              nama: getTextContent('td:nth-child(2)', row),
              umur: getTextContent('td:nth-child(3)', row),
              anak_ke: getSelectedOptionText(susunanSelect),
            };
          });
        }
        maklumatMurid.bahasa_pertuturan_di_rumah = getSelectedOptionText(
          profilMuridAuditTrail.querySelector('select#bahasa_pertuturan'),
        );
      }

      const bapaBiologiAuditTrail = getAuditTrail('#bapabio', 0, { formId: 'bapaBio' });
      if (bapaBiologiAuditTrail) {
        maklumatMurid.ibu_bapa.bapa_biologi.nama = getInputValue('input#nama_bapabio', bapaBiologiAuditTrail);
        maklumatMurid.ibu_bapa.bapa_biologi.kewarganegaraan = getInputValue(
          'input#statusWnegara_bapabio',
          bapaBiologiAuditTrail,
        );
        maklumatMurid.ibu_bapa.bapa_biologi.tarikh_lahir = convertTarikhToISO(
          getInputValue('input#tarikhLahir_bapabio', bapaBiologiAuditTrail),
        );
        maklumatMurid.ibu_bapa.bapa_biologi.umur = getInputValue('input#umur_bapabio', bapaBiologiAuditTrail);
        maklumatMurid.ibu_bapa.bapa_biologi.nombor_pengenalan = formatNomborPengenalan(
          getInputValue('input#nokp_bapabio', bapaBiologiAuditTrail),
        );
        maklumatMurid.ibu_bapa.bapa_biologi.jantina = getInputValue('input#jantina_bapabio', bapaBiologiAuditTrail);
        maklumatMurid.ibu_bapa.bapa_biologi.agama = getInputValue('input#agama_bapabio', bapaBiologiAuditTrail);
        maklumatMurid.ibu_bapa.bapa_biologi.keturunan = getInputValue('input#keturunan_bapabio', bapaBiologiAuditTrail);
        maklumatMurid.ibu_bapa.bapa_biologi.telefon = getTelefon(
          'select#prefix_bapabio',
          'input#noTel_bapabio',
          bapaBiologiAuditTrail,
        );
      }

      const ibuBiologiAuditTrail = getAuditTrail('#ibubio', 0, { formId: 'ibuBio' });
      if (ibuBiologiAuditTrail) {
        maklumatMurid.ibu_bapa.ibu_biologi.nama = getInputValue('input#nama_ibubio', ibuBiologiAuditTrail);
        maklumatMurid.ibu_bapa.ibu_biologi.kewarganegaraan = getInputValue(
          'input#statusWnegara_ibubio',
          ibuBiologiAuditTrail,
        );
        maklumatMurid.ibu_bapa.ibu_biologi.tarikh_lahir = convertTarikhToISO(
          getInputValue('input#tarikhLahir_ibubio', ibuBiologiAuditTrail),
        );
        maklumatMurid.ibu_bapa.ibu_biologi.umur = getInputValue('input#umur_ibubio', ibuBiologiAuditTrail);
        maklumatMurid.ibu_bapa.ibu_biologi.nombor_pengenalan = formatNomborPengenalan(
          getInputValue('input#nokp_ibubio', ibuBiologiAuditTrail),
        );
        maklumatMurid.ibu_bapa.ibu_biologi.jantina = getInputValue('input#jantina_ibubio', ibuBiologiAuditTrail);
        maklumatMurid.ibu_bapa.ibu_biologi.agama = getInputValue('input#agama_ibubio', ibuBiologiAuditTrail);
        maklumatMurid.ibu_bapa.ibu_biologi.keturunan = getInputValue('input#keturunan_ibubio', ibuBiologiAuditTrail);
        maklumatMurid.ibu_bapa.ibu_biologi.status_perkahwinan = getSelectedOptionText(
          ibuBiologiAuditTrail.querySelector('select#statusPerkahwinan_ibu_kp'),
        );
        maklumatMurid.ibu_bapa.ibu_biologi.tarikh_kahwin = convertTarikhToISO(
          getInputValue('input#tarikhkahwin_ibu', ibuBiologiAuditTrail),
        );
        maklumatMurid.ibu_bapa.ibu_biologi.tarikh_cerai = convertTarikhToISO(
          getInputValue('input#tarikhcerai_ibu', ibuBiologiAuditTrail),
        );
        maklumatMurid.ibu_bapa.ibu_biologi.tarikh_balu = convertTarikhToISO(
          getInputValue('input#tarikhbalu_ibu', ibuBiologiAuditTrail),
        );
        maklumatMurid.ibu_bapa.ibu_biologi.nama_pasangan = getInputValue('input#pasangan_ibubio', ibuBiologiAuditTrail);
        maklumatMurid.ibu_bapa.ibu_biologi.telefon = getTelefon(
          'select#prefix_ibubio',
          'input#noTel_ibubio',
          ibuBiologiAuditTrail,
        );
      }

      const penjagaUtamaBioAuditTrail = getAuditTrail('#penjagautama', 0, { containsSelector: 'input#nama_p1' });
      if (penjagaUtamaBioAuditTrail) {
        const pgUtama = maklumatMurid.penjaga.penjaga_utama;
        pgUtama.hubungan_dengan_anak_jagaan = getSelectedOptionText(
          penjagaUtamaBioAuditTrail.querySelector('select#hubungan_penjagautama'),
        );
        pgUtama.nama = getInputValue('input#nama_p1', penjagaUtamaBioAuditTrail);
        pgUtama.kewarganegaraan = getInputValue('input#statusWnegara_p1', penjagaUtamaBioAuditTrail);
        pgUtama.tarikh_lahir = convertTarikhToISO(getInputValue('input#tarikhLahir_p1', penjagaUtamaBioAuditTrail));
        pgUtama.umur = getInputValue('input#umur_p1', penjagaUtamaBioAuditTrail);
        pgUtama.nombor_pengenalan = formatNomborPengenalan(getInputValue('input#nokp_p1', penjagaUtamaBioAuditTrail));
        pgUtama.jenis_pengenalan = getInputValue('input#jenpeng_p1', penjagaUtamaBioAuditTrail);
        pgUtama.agama = getInputValue('input#agama_p1', penjagaUtamaBioAuditTrail);
        pgUtama.keturunan = getInputValue('input#keturunan_p1', penjagaUtamaBioAuditTrail);
        pgUtama.telefon = getTelefon('select#prefix_p1', 'input#noTel_p1', penjagaUtamaBioAuditTrail);
        pgUtama.jantina = getInputValue('input#jantina_p1', penjagaUtamaBioAuditTrail);
        pgUtama.emel = getInputValue('input#emel_p1', penjagaUtamaBioAuditTrail);

        if (getCheckboxCheckedState('input#pasanganpenjagak2_ya', penjagaUtamaBioAuditTrail)) {
          pgUtama.pasangan_sebagai_penjaga_kedua = 'Ya';
        } else {
          if (getCheckboxCheckedState('input#pasanganpenjagak2_tidak', penjagaUtamaBioAuditTrail)) {
            pgUtama.pasangan_sebagai_penjaga_kedua = 'Tidak';
          }
        }
        pgUtama.nama_pasangan_penjaga_kedua = getSelectedOptionText(
          penjagaUtamaBioAuditTrail.querySelector('select#idPasangan_p1'),
        );
      }

      const penjagaUtamaPekerjaanAuditTrail = getAuditTrail('#penjagautama', 1, {
        containsSelector: 'input#cek_kerja_p1',
      });
      if (penjagaUtamaPekerjaanAuditTrail) {
        const kerjaPUtama = maklumatMurid.penjaga.penjaga_utama.pekerjaan;
        const statusKerjaP1 = getInputValue('input#cek_kerja_p1', penjagaUtamaPekerjaanAuditTrail);
        const tidakBekerjaP1 =
          statusKerjaP1 === '02' || getCheckboxCheckedState('input#semakkerja_p1', penjagaUtamaPekerjaanAuditTrail);
        kerjaPUtama.tidak_bekerja_atau_lainnya = toYaTidakValue(tidakBekerjaP1);

        if (kerjaPUtama.tidak_bekerja_atau_lainnya !== 'Ya') {
          const kerjaP1Div = queryWithin('div#kerjap1', penjagaUtamaPekerjaanAuditTrail);
          if (kerjaP1Div && !kerjaP1Div.querySelector('select#kod_masco_p1')?.disabled) {
            kerjaPUtama.nama_pekerjaan = getSelectedOptionText(kerjaP1Div.querySelector('select#kod_masco_p1'));
            kerjaPUtama.kategori_pekerjaan_utama = getInputValue('input#kerja_utama_p1', kerjaP1Div);
            kerjaPUtama.kategori_pekerjaan_kecil = getInputValue('input#kerja_unitkecil_p1', kerjaP1Div);
            kerjaPUtama.nama_majikan = getInputValue('input#nama_majikan_p1', kerjaP1Div);
            kerjaPUtama.tel_pejabat = getTelefon('select#no_tel_1_p1', 'input#no_tel_2_p1', kerjaP1Div);

            const alamatMajikanParts = [
              getInputValue('input#alamat_1_p1', kerjaP1Div),
              getInputValue('input#alamat_2_p1', kerjaP1Div),
              getInputValue('input#alamat_3_p1', kerjaP1Div),
            ].filter(part => part);
            kerjaPUtama.alamat_majikan = alamatMajikanParts.join(', ');

            kerjaPUtama.poskod_majikan = getInputValue('input#ind_poskod_p1', kerjaP1Div);
            kerjaPUtama.bandar_majikan = getSelectedOptionText(kerjaP1Div.querySelector('select#ind_bandar_p1'));
            kerjaPUtama.negeri_majikan = getInputValue('input#ind_negeri_p1', kerjaP1Div);
          }
        }
        const statusPendapatanP1 = getInputValue('input#cek_statusPdptn', penjagaUtamaPekerjaanAuditTrail);
        const tiadaMaklumatPendapatanP1 =
          statusPendapatanP1 === '01' || getCheckboxCheckedState('input#xpdptn', penjagaUtamaPekerjaanAuditTrail);
        kerjaPUtama.tiada_maklumat_pendapatan = toYaTidakValue(tiadaMaklumatPendapatanP1);

        if (kerjaPUtama.tiada_maklumat_pendapatan !== 'Ya') {
          kerjaPUtama.pendapatan_bulanan = getInputValue(
            'input#pendapatan_bulanan_p1',
            queryWithin('div#pdptn', penjagaUtamaPekerjaanAuditTrail),
          );
        } else {
          kerjaPUtama.sumber_pendapatan_jika_tiada = getInputValue(
            'input#sumberpendapatan',
            queryWithin('div#pendapatan_tiada', penjagaUtamaPekerjaanAuditTrail),
          );
        }
      }

      const penjagaKeduaBioAuditTrail = getAuditTrail('#penjagakedua', 0, { containsSelector: 'input#nama_p2' });
      if (penjagaKeduaBioAuditTrail) {
        const pgKedua = maklumatMurid.penjaga.penjaga_kedua;
        pgKedua.hubungan_dengan_anak_jagaan = getSelectedOptionText(
          penjagaKeduaBioAuditTrail.querySelector('select#hubungan_penjagakedua'),
        );
        pgKedua.status_penjaga_kedua = getSelectedOptionText(
          penjagaKeduaBioAuditTrail.querySelector('select#status_penjagakedua'),
        );
        pgKedua.nama = getInputValue('input#nama_p2', penjagaKeduaBioAuditTrail);
        pgKedua.kewarganegaraan = getInputValue('input#statusWnegara_p2', penjagaKeduaBioAuditTrail);
        pgKedua.tarikh_lahir = convertTarikhToISO(getInputValue('input#tarikhLahir_p2', penjagaKeduaBioAuditTrail));
        pgKedua.umur = getInputValue('input#umur_p2', penjagaKeduaBioAuditTrail);
        pgKedua.nombor_pengenalan = formatNomborPengenalan(getInputValue('input#nokp_p2', penjagaKeduaBioAuditTrail));
        pgKedua.jenis_pengenalan = getInputValue('input#jenpeng_p2', penjagaKeduaBioAuditTrail);
        pgKedua.agama = getInputValue('input#agama_p2', penjagaKeduaBioAuditTrail);
        pgKedua.keturunan = getInputValue('input#keturunan_p2', penjagaKeduaBioAuditTrail);
        pgKedua.telefon = getTelefon('select#prefix_p2', 'input#noTel_p2', penjagaKeduaBioAuditTrail);
        pgKedua.jantina = getInputValue('input#jantina_p2', penjagaKeduaBioAuditTrail);
        pgKedua.emel = getInputValue('input#emel_p2', penjagaKeduaBioAuditTrail);
      }

      const penjagaKeduaPekerjaanAuditTrail = getAuditTrail('#penjagakedua', 1, {
        containsSelector: 'input#cek_kerja_p2',
      });
      if (penjagaKeduaPekerjaanAuditTrail) {
        const kerjaPKedua = maklumatMurid.penjaga.penjaga_kedua.pekerjaan;
        const statusKerjaP2 = getInputValue('input#cek_kerja_p2', penjagaKeduaPekerjaanAuditTrail);
        const tidakBekerjaP2 =
          statusKerjaP2 === '02' || getCheckboxState('input#semakkerja_p2', penjagaKeduaPekerjaanAuditTrail);
        kerjaPKedua.tidak_bekerja_atau_lainnya = toYaTidakValue(tidakBekerjaP2);

        if (kerjaPKedua.tidak_bekerja_atau_lainnya !== 'Ya') {
          const kerjaP2Div = queryWithin('div#kerjap2', penjagaKeduaPekerjaanAuditTrail);
          if (kerjaP2Div && !kerjaP2Div.querySelector('select#kod_masco_p2')?.disabled) {
            kerjaPKedua.nama_pekerjaan = getSelectedOptionText(kerjaP2Div.querySelector('select#kod_masco_p2'));
            kerjaPKedua.kategori_pekerjaan_utama = getInputValue('input#kerja_utama_p2', kerjaP2Div);
            kerjaPKedua.kategori_pekerjaan_kecil = getInputValue('input#kerja_unitkecil_p2', kerjaP2Div);
            kerjaPKedua.nama_majikan = getInputValue('input[name="nama_majikan_p2"]', kerjaP2Div);
            kerjaPKedua.tel_pejabat = getTelefon('select#no_tel_1_p2', 'input#no_tel_2_p2', kerjaP2Div);

            const alamatMajikanPartsP2 = [
              getInputValue('input#alamat_1_p2', kerjaP2Div),
              getInputValue('input#alamat_2_p2', kerjaP2Div),
              getInputValue('input#alamat_3_p2', kerjaP2Div),
            ].filter(part => part);
            kerjaPKedua.alamat_majikan = alamatMajikanPartsP2.join(', ');

            kerjaPKedua.poskod_majikan = getInputValue('input#ind_poskod_p2', kerjaP2Div);
            kerjaPKedua.bandar_majikan = getSelectedOptionText(kerjaP2Div.querySelector('select#ind_bandar_p2'));
            kerjaPKedua.negeri_majikan = getInputValue('input#ind_negeri_p2', kerjaP2Div);
          }
        }
        const statusPendapatanP2 = getInputValue('input#cek_statusPdptn2', penjagaKeduaPekerjaanAuditTrail);
        const tiadaMaklumatPendapatanP2 =
          statusPendapatanP2 === '01' || getCheckboxState('input#xpdptn2', penjagaKeduaPekerjaanAuditTrail);
        kerjaPKedua.tiada_maklumat_pendapatan = toYaTidakValue(tiadaMaklumatPendapatanP2);
        if (kerjaPKedua.tiada_maklumat_pendapatan === 'Ya') {
          kerjaPKedua.sumber_pendapatan_jika_tiada = getInputValue(
            'input#sumberpendapatan2',
            queryWithin('div#pendapatan_tiada2', penjagaKeduaPekerjaanAuditTrail),
          );
        } else {
          kerjaPKedua.pendapatan_bulanan = getInputValue(
            'input#pendapatan_bulanan_p2',
            queryWithin('div#pdptn2', penjagaKeduaPekerjaanAuditTrail),
          );
        }
      }

      const tanggunganAuditTrail = getAuditTrail('#tanggungan', 0, {
        containsSelector: 'select[name="hubungan[]"], input[name="jumTanggungan"]',
      });
      if (tanggunganAuditTrail) {
        const bilTanggunganInput = getInputValueAny(['input[name="jumTanggungan"]'], tanggunganAuditTrail);
        const bilTanggunganText = getTextContent(
          'div.form-group > div.row > div.col-md-4 > span',
          tanggunganAuditTrail,
        );

        if (bilTanggunganInput) {
          maklumatMurid.penjaga.tanggungan_isi_rumah.bilangan_tanggungan = bilTanggunganInput.replace(/\D/g, '');
        } else if (bilTanggunganText) {
          maklumatMurid.penjaga.tanggungan_isi_rumah.bilangan_tanggungan = bilTanggunganText.replace(/\D/g, '');
        }

        const tanggunganTable = tanggunganAuditTrail.querySelector('table');
        if (tanggunganTable) {
          const tanggunganRows = tanggunganTable.querySelectorAll('tbody tr');
          maklumatMurid.penjaga.tanggungan_isi_rumah.senarai_tanggungan = Array.from(tanggunganRows).map(row => {
            const hubunganSelect = row.querySelector('select[name="hubungan[]"]');
            const sekolahSelect = row.querySelector('select[name="sekolah_institusi[]"]');
            const peringkatSelect = row.querySelector('select[name="lti_institusi[]"]');

            return {
              nama: getTextContent('td:nth-child(3)', row),
              umur: getTextContent('td:nth-child(4)', row),
              hubungan: getSelectedOptionText(hubunganSelect),
              sekolah_institusi: getSelectedOptionText(sekolahSelect),
              tahun_tingkatan: getSelectedOptionText(peringkatSelect),
              nama_institusi_tanggungan:
                getTextContent('td:nth-child(8)', row) === 'Tidak Berkenaan' ? undefined : (
                  getTextContent('td:nth-child(8)', row)
                ),
            };
          });

          if (!maklumatMurid.penjaga.tanggungan_isi_rumah.bilangan_tanggungan) {
            maklumatMurid.penjaga.tanggungan_isi_rumah.bilangan_tanggungan = `${
              maklumatMurid.penjaga.tanggungan_isi_rumah.senarai_tanggungan.length
            }`;
          }
        }
      }

      const tinggalBersamaAuditTrail = getAuditTrail('#anak_tinggalbersama');
      if (tinggalBersamaAuditTrail) {
        const tglBersama = maklumatMurid.tinggal_bersama;
        tglBersama.tinggal_bersama_dengan = getSelectedOptionText(
          tinggalBersamaAuditTrail.querySelector('select#tinggal_bersama'),
        );
        tglBersama.nama = getInputValue('input#nama_tinggalbersama', tinggalBersamaAuditTrail);
        tglBersama.kewarganegaraan = getInputValue('input#statusWnegara_tinggalbersama', tinggalBersamaAuditTrail);
        tglBersama.tarikh_lahir = convertTarikhToISO(
          getInputValue('input#tarikhLahir_tinggalbersama', tinggalBersamaAuditTrail),
        );
        tglBersama.umur = getInputValue('input#umur_tinggalbersama', tinggalBersamaAuditTrail);
        tglBersama.nombor_pengenalan = formatNomborPengenalan(
          getInputValue('input#nokp_tinggalbersama', tinggalBersamaAuditTrail),
        );
        tglBersama.jenis_pengenalan = getInputValue('input#jenpeng_tinggalbersama', tinggalBersamaAuditTrail);
        tglBersama.agama = getInputValue('input[name="agama_tinggalbersama"]', tinggalBersamaAuditTrail);
        tglBersama.keturunan = getInputValue('input[name="keturunan_tinggalbersama"]', tinggalBersamaAuditTrail);
        tglBersama.telefon = getTelefon(
          'select#prefix_tinggalbersama',
          'input#noTel_tinggalbersama',
          tinggalBersamaAuditTrail,
        );
        tglBersama.jantina = getInputValue('input[name="jantina_tinggalbersama"]', tinggalBersamaAuditTrail);
      }

      const alamatAuditTrail = getAuditTrail('#anak_alamat');
      if (alamatAuditTrail) {
        const alamatInfo = maklumatMurid.tempat_tinggal;
        const statusAlamat = getInputValue('input#alamatdecider', alamatAuditTrail);
        if (statusAlamat === '1' || getCheckboxState('input#td_ibubapapenjaga1', alamatAuditTrail)) {
          alamatInfo.tinggal_dengan_ibubapa_penjaga = 'Ya';
        } else if (
          statusAlamat === '2' ||
          statusAlamat === '3' ||
          getCheckboxState('input#td_lain2alamat1', alamatAuditTrail)
        ) {
          alamatInfo.tinggal_dengan_ibubapa_penjaga = 'Tidak';
        }
        alamatInfo.alamat_lain = toYaTidakValue(
          statusAlamat === '2' || getCheckboxState('input#td_lain2alamat1', alamatAuditTrail),
        );

        const alamatParts = [
          getInputValue('input#alt_alamat1', alamatAuditTrail),
          getInputValue('input#alt_alamat2', alamatAuditTrail),
          getInputValue('input#alt_alamat3', alamatAuditTrail),
        ].filter(part => part);
        alamatInfo.alamat_kediaman = alamatParts.join(', ');

        alamatInfo.poskod_kediaman = getInputValue('input#alt_poskod', alamatAuditTrail);
        alamatInfo.jalan_taman_kawasan_kediaman =
          getSelectedOptionText(alamatAuditTrail.querySelector('select#alt_jlntaman')) || '';
        alamatInfo.bandar_kediaman = getSelectedOptionText(alamatAuditTrail.querySelector('select#alt_bandar')) || '';
        alamatInfo.negeri_kediaman = getInputValue('input#alt2_negeri', alamatAuditTrail);
      }

      const kesihatanTabContent = doc.querySelector('#anak_kesihatan');
      if (kesihatanTabContent) {
        const kesihatan = maklumatMurid.kesihatan;
        const asasKesihatanTab = kesihatanTabContent.querySelector('#asas_kdani');
        if (asasKesihatanTab) {
          let scriptContentForKesihatan = '';
          const scriptElements = asasKesihatanTab.querySelectorAll('script');
          scriptElements.forEach(script => {
            if (
              script.textContent.includes('$counterAlahan') ||
              script.textContent.includes('$counterMasalahkesihatan') ||
              script.textContent.includes('$counterImunisasi')
            ) {
              scriptContentForKesihatan += `${script.textContent}\n`;
            }
          });

          let kiraanAlahan = 0;
          let kiraanMasalahKesihatan = 0;
          let kiraanImunisasi = 0;

          if (scriptContentForKesihatan) {
            const alahanMatch = scriptContentForKesihatan.match(/var\s+\$counterAlahan\s*=\s*(\d+);/);
            if (alahanMatch?.[1]) {
              kiraanAlahan = parseInt(alahanMatch[1], 10);
            }

            const penyakitMatch = scriptContentForKesihatan.match(/var\s+\$counterMasalahkesihatan\s*=\s*(\d+);/);
            if (penyakitMatch?.[1]) {
              kiraanMasalahKesihatan = parseInt(penyakitMatch[1], 10);
            }

            const imunisasiMatch = scriptContentForKesihatan.match(/var\s+\$counterImunisasi\s*=\s*(\d+);/);
            if (imunisasiMatch?.[1]) {
              kiraanImunisasi = parseInt(imunisasiMatch[1], 10);
            }
          }

          ekstrakKesihatanSenarai(
            asasKesihatanTab,
            kesihatan.alahan_alergi,
            kiraanAlahan,
            '#jns_alahan > div.form-group',
            'jenis_alahan[]',
            'ket_alahan[]',
          );

          ekstrakKesihatanSenarai(
            asasKesihatanTab,
            kesihatan.penyakit_atau_masalah_kesihatan,
            kiraanMasalahKesihatan,
            '#jns_penyakit > div.form-group',
            'jenis_penyakit[]',
            'ket_penyakit[]',
          );

          kesihatan.sejarah_imunisasi.status = kiraanImunisasi > 0 ? 'Ada' : 'Tiada';
          const imunTbl = asasKesihatanTab.querySelector('#tblvaksin');
          if (imunTbl) {
            kesihatan.sejarah_imunisasi.bcg.status_ya = getCheckboxState('input#chkbcg', imunTbl);
            if (kesihatan.sejarah_imunisasi.bcg.status_ya)
              kesihatan.sejarah_imunisasi.bcg.tarikh_diberi = convertTarikhToISO(
                getInputValue('input#txttahunbcg', imunTbl),
              );

            const ekstrakSemuaDos = (
              targetPropertyKey,
              htmlMainChkIdPrefix,
              htmlDoseTxtPrefix,
              _kodImun,
              maxDoses = 3,
              hasTam = true,
            ) => {
              const mainChk = getCheckboxState(`input#${htmlMainChkIdPrefix}`, imunTbl);

              if (kesihatan.sejarah_imunisasi[targetPropertyKey]) {
                if (!Array.isArray(kesihatan.sejarah_imunisasi[targetPropertyKey].dos)) {
                  kesihatan.sejarah_imunisasi[targetPropertyKey].dos = [];
                }
              } else {
                console.error(`ekstrakSemuaDos: Key "${targetPropertyKey}" tiada dalam objek sejarah_imunisasi. Init.`);
                kesihatan.sejarah_imunisasi[targetPropertyKey] = {
                  status_ya: false,
                  dos: [],
                };
              }

              kesihatan.sejarah_imunisasi[targetPropertyKey].status_ya = mainChk;
              kesihatan.sejarah_imunisasi[targetPropertyKey].dos = [];

              if (mainChk) {
                for (let i = 1; i <= maxDoses; i++) {
                  const dosChk = getCheckboxState(`input#${htmlMainChkIdPrefix}dos${i}`, imunTbl);
                  if (dosChk) {
                    kesihatan.sejarah_imunisasi[targetPropertyKey].dos.push({
                      nama_dos: `Dos ${i}`,
                      status_ya_dos: 'Ya',
                      tarikh_diberi: convertTarikhToISO(getInputValue(`input#${htmlDoseTxtPrefix}dos${i}`, imunTbl)),
                    });
                  } else {
                    kesihatan.sejarah_imunisasi[targetPropertyKey].dos.push({
                      nama_dos: `Dos ${i}`,
                      status_ya_dos: 'Tidak',
                      tarikh_diberi: undefined,
                    });
                  }
                }

                if (hasTam) {
                  const dosTamChk = getCheckboxState(`input#${htmlMainChkIdPrefix}dostam`, imunTbl);
                  if (dosTamChk) {
                    kesihatan.sejarah_imunisasi[targetPropertyKey].dos.push({
                      nama_dos: 'Dos Tambahan',
                      status_ya_dos: 'Ya',
                      tarikh_diberi: convertTarikhToISO(getInputValue(`input#${htmlDoseTxtPrefix}dostam`, imunTbl)),
                    });
                  } else {
                    kesihatan.sejarah_imunisasi[targetPropertyKey].dos.push({
                      nama_dos: 'Dos Tambahan',
                      status_ya_dos: 'Tidak',
                      tarikh_diberi: undefined,
                    });
                  }
                }
              }
            };

            ekstrakSemuaDos('hepatitis_b', 'chkhb', 'txttahunhb', 'A08', 3, false);
            ekstrakSemuaDos('difteria', 'chkdift', 'txttahundift', 'A02', 3, true);
            ekstrakSemuaDos('pertussis', 'chkptsis', 'txttahunptsis', 'A09', 3, true);
            ekstrakSemuaDos('tetanus', 'chkttnus', 'txttahunttnus', 'A07', 3, true);
            ekstrakSemuaDos('haemophilus_influenza_hib', 'chkhib', 'txttahunhib', 'A03', 3, true);
            ekstrakSemuaDos('polio_ipv', 'chkipv', 'txttahunipv', 'A04', 3, true);

            kesihatan.sejarah_imunisasi.measles.status_ya = getCheckboxState('input#chkmeasles', imunTbl);
            kesihatan.sejarah_imunisasi.measles.dos = [];
            if (kesihatan.sejarah_imunisasi.measles.status_ya) {
              if (getCheckboxState('input#chkmslesdos1', imunTbl))
                kesihatan.sejarah_imunisasi.measles.dos.push({
                  nama_dos: 'Dos 1',
                  status_ya_dos: 'Ya',
                  tarikh_diberi: convertTarikhToISO(getInputValue('input#txttahunmslesdos1', imunTbl)),
                });
              else
                kesihatan.sejarah_imunisasi.measles.dos.push({
                  nama_dos: 'Dos 1',
                  status_ya_dos: 'Tidak',
                  tarikh_diberi: undefined,
                });
              if (getCheckboxState('input#chkmslesdos2', imunTbl))
                kesihatan.sejarah_imunisasi.measles.dos.push({
                  nama_dos: 'Dos 2',
                  status_ya_dos: 'Ya',
                  tarikh_diberi: convertTarikhToISO(getInputValue('input#txttahunmslesdos2', imunTbl)),
                });
              else
                kesihatan.sejarah_imunisasi.measles.dos.push({
                  nama_dos: 'Dos 2',
                  status_ya_dos: 'Tidak',
                  tarikh_diberi: undefined,
                });
            }

            kesihatan.sejarah_imunisasi.mumps.status_ya = getCheckboxState('input#chkmumps', imunTbl);
            kesihatan.sejarah_imunisasi.mumps.dos = [];
            if (kesihatan.sejarah_imunisasi.mumps.status_ya) {
              if (getCheckboxState('input#chkmumpsdos1', imunTbl))
                kesihatan.sejarah_imunisasi.mumps.dos.push({
                  nama_dos: 'Dos 1',
                  status_ya_dos: 'Ya',
                  tarikh_diberi: convertTarikhToISO(getInputValue('input#txttahunmumpsdos1', imunTbl)),
                });
              else
                kesihatan.sejarah_imunisasi.mumps.dos.push({
                  nama_dos: 'Dos 1',
                  status_ya_dos: 'Tidak',
                  tarikh_diberi: undefined,
                });
              if (getCheckboxState('input#chkmumpsdos2', imunTbl))
                kesihatan.sejarah_imunisasi.mumps.dos.push({
                  nama_dos: 'Dos 2',
                  status_ya_dos: 'Ya',
                  tarikh_diberi: convertTarikhToISO(getInputValue('input#txttahunmumpsdos2', imunTbl)),
                });
              else
                kesihatan.sejarah_imunisasi.mumps.dos.push({
                  nama_dos: 'Dos 2',
                  status_ya_dos: 'Tidak',
                  tarikh_diberi: undefined,
                });
            }

            kesihatan.sejarah_imunisasi.rubella.status_ya = getCheckboxState('input#chkrbll', imunTbl);
            kesihatan.sejarah_imunisasi.rubella.dos = [];
            if (kesihatan.sejarah_imunisasi.rubella.status_ya) {
              if (getCheckboxState('input#chkrblldos1', imunTbl))
                kesihatan.sejarah_imunisasi.rubella.dos.push({
                  nama_dos: 'Dos 1',
                  status_ya_dos: 'Ya',
                  tarikh_diberi: convertTarikhToISO(getInputValue('input#txttahunrblldos1', imunTbl)),
                });
              else
                kesihatan.sejarah_imunisasi.rubella.dos.push({
                  nama_dos: 'Dos 1',
                  status_ya_dos: 'Tidak',
                  tarikh_diberi: undefined,
                });
              if (getCheckboxState('input#chkrblldos2', imunTbl))
                kesihatan.sejarah_imunisasi.rubella.dos.push({
                  nama_dos: 'Dos 2',
                  status_ya_dos: 'Ya',
                  tarikh_diberi: convertTarikhToISO(getInputValue('input#txttahunrblldos2', imunTbl)),
                });
              else
                kesihatan.sejarah_imunisasi.rubella.dos.push({
                  nama_dos: 'Dos 2',
                  status_ya_dos: 'Tidak',
                  tarikh_diberi: undefined,
                });
            }
          }
        }

        const rawatanPergigianTab = kesihatanTabContent.querySelector('#kebenaran_rawatan_pergigian');
        if (rawatanPergigianTab) {
          const rawatanGigi = kesihatan.rawatan_pergigian;
          rawatanGigi.masalah_berkaitan_darah = getYaTidakTextState(
            'input#darah_ya',
            'input#darah_tidak',
            rawatanPergigianTab,
          );
          rawatanGigi.kacacatan_mental = getYaTidakTextState(
            'input#mental_ya',
            'input#mental_tidak',
            rawatanPergigianTab,
          );
          rawatanGigi.alahan = getYaTidakTextState('input#alahan_ya', 'input#alahan_tidak', rawatanPergigianTab);
          rawatanGigi.kencing_manis = getYaTidakTextState('input#kmanis_ya', 'input#kmanis_tidak', rawatanPergigianTab);
          rawatanGigi.lelah_asma = getYaTidakTextState('input#lelah_ya', 'input#lelah_tidak', rawatanPergigianTab);
          rawatanGigi.penyakit_jantung = getYaTidakTextState(
            'input#pjantung_ya',
            'input#pjantung_tidak',
            rawatanPergigianTab,
          );
          rawatanGigi.penyakit_sawan = getYaTidakTextState(
            'input#psawan_ya',
            'input#psawan_tidak',
            rawatanPergigianTab,
          );
          rawatanGigi.darah_tinggi = getYaTidakTextState(
            'input#darah-tinggi_ya',
            'input#darah-tinggi_tidak',
            rawatanPergigianTab,
          );
          rawatanGigi.masalah_buah_pinggang = getYaTidakTextState(
            'input#buah-pinggang_ya',
            'input#buah-pinggang_tidak',
            rawatanPergigianTab,
          );
          rawatanGigi.pendarahan_selepas_cabutan_gigi = getYaTidakTextState(
            'input#pendarahan-lanjutan_ya',
            'input#pendarahan-lanjutan_tidak',
            rawatanPergigianTab,
          );
          rawatanGigi.pengambilan_ubat_ubatan = getYaTidakTextState(
            'input#ubatan_ya',
            'input#ubatan_tidak',
            rawatanPergigianTab,
          );
          if (rawatanGigi.pengambilan_ubat_ubatan === 'Ya') {
            rawatanGigi.keterangan_ubat_ubatan = getInputValue('input#sila_nyatakan', rawatanPergigianTab);
          }
          rawatanGigi.lain_lain_kesihatan = getInputValue('input#catatan_kesihatan', rawatanPergigianTab);

          const statusKebenaranPergigian =
            getInputValueAny(['input#sta_kebenaran', 'input#stat_kebenaran'], rawatanPergigianTab) ||
            getInputValueAny(['input#sta_kebenaran', 'input#stat_kebenaran'], doc);
          if (statusKebenaranPergigian === '1') rawatanGigi.status_kebenaran = 'Memberi';
          else if (statusKebenaranPergigian === '2') rawatanGigi.status_kebenaran = 'Tidak Memberi';
          else if (getCheckboxCheckedState('input#memberi_ya', rawatanPergigianTab))
            rawatanGigi.status_kebenaran = 'Memberi';
          else if (getCheckboxCheckedState('input#memberi_tidak', rawatanPergigianTab))
            rawatanGigi.status_kebenaran = 'Tidak Memberi';
          rawatanGigi.tarikh_tandatangan = convertTarikhToISO(getInputValue('input#tarikh_tt', rawatanPergigianTab));
        }

        const persetujuanPkTab = kesihatanTabContent.querySelector('#persetujuan_pk');
        if (persetujuanPkTab) {
          const persetujuan = kesihatan.pemeriksaan_kesihatan;

          const normalizePersetujuanValue = value => {
            if (!value) return undefined;
            const upperValue = `${value}`.trim().toUpperCase();
            if (upperValue === '1' || upperValue === 'Y' || upperValue === 'YA') return 'Setuju';
            if (upperValue === '2' || upperValue === 'T' || upperValue === 'TIDAK' || upperValue === 'N')
              return 'Tidak Setuju';
            return undefined;
          };

          const getPersetujuanStatusByNames = names => {
            for (const name of names) {
              const selectedInput =
                queryWithin(`input[name="${name}"]:checked`, persetujuanPkTab) ||
                queryWithin(`input[name="${name}"][checked]`, persetujuanPkTab);
              const mapped = normalizePersetujuanValue(selectedInput?.value);
              if (mapped) return mapped;
            }
            return undefined;
          };

          const getPersetujuanStatusByRowKeyword = keywordPattern => {
            const rows = persetujuanPkTab.querySelectorAll('tr');
            for (const row of rows) {
              const rowText = normalizeValue(row.textContent);
              if (!rowText || !keywordPattern.test(rowText)) continue;
              const selected =
                row.querySelector('input[type="radio"]:checked') || row.querySelector('input[type="radio"][checked]');
              const mapped = normalizePersetujuanValue(selected?.value);
              if (mapped) return mapped;
            }
            return undefined;
          };

          persetujuan.persetujuan_pemeriksaan =
            getPersetujuanStatusByNames(['jimunisasiA', 'jimunisasiE']) ||
            getPersetujuanStatusByRowKeyword(/pemeriksaan\s+kesihatan|rawatan\s+dan\s+rujukan/i);

          persetujuan.persetujuan_rawatan =
            getPersetujuanStatusByNames(['jimunisasiB']) || getPersetujuanStatusByRowKeyword(/rawatan\b/i);

          persetujuan.imunisasi_dt_tahun_satu =
            getPersetujuanStatusByNames(['jimunisasiCC001']) || getPersetujuanStatusByRowKeyword(/\bDT\b/i);

          persetujuan.imunisasi_hpv_ting1_perempuan =
            getPersetujuanStatusByNames(['jimunisasiCC002']) || getPersetujuanStatusByRowKeyword(/\bHPV\b/i);

          persetujuan.imunisasi_att_ting3 =
            getPersetujuanStatusByNames(['jimunisasiCC003']) || getPersetujuanStatusByRowKeyword(/\bATT\b/i);

          persetujuan.rujukan =
            getPersetujuanStatusByNames(['jimunisasiD']) || getPersetujuanStatusByRowKeyword(/rujukan/i);

          persetujuan.nama_penjaga = getInputValue('input[name="NAMA_PENJAGA"]', persetujuanPkTab);
          persetujuan.no_kp_penjaga = formatNomborPengenalan(
            getInputValue('input[name="NO_KP_PENJAGA"]', persetujuanPkTab),
          );

          if (!persetujuan.persetujuan_pemeriksaan)
            catatAmaranEkstraksi('kesihatan.pemeriksaan_kesihatan.persetujuan_pemeriksaan', 'Persetujuan PK');
        }

        const beratTinggiTab = kesihatanTabContent.querySelector('#beratdantinggi');
        if (beratTinggiTab) {
          const beratTinggi = kesihatan.berat_dan_tinggi;
          beratTinggi.berat_kg = getInputValue('input#berat', beratTinggiTab);
          beratTinggi.tinggi_cm = getInputValue('input#tinggi', beratTinggiTab);
          const tarikhBMI = getTextContent('span.text-trans', beratTinggiTab);
          beratTinggi.tarikh_masa_rekod_bmi = tarikhBMI ? tarikhBMI.replace('Tarikh dan masa rekod: ', '') : undefined;
        }

        const statusOkuTab = kesihatanTabContent.querySelector('#statusoku');
        if (statusOkuTab) {
          const oku = kesihatan.status_oku;
          const adalahOku =
            getCheckboxState('input#cb_oku', statusOkuTab) ||
            Boolean(getInputValue('input#id_individu_oku', statusOkuTab));
          oku.adalah_oku = toYaTidakValue(adalahOku);
          if (oku.adalah_oku === 'Ya') {
            const jikaOkuDiv = statusOkuTab.querySelector('#jikaoku');
            if (jikaOkuDiv) {
              oku.tarikh_kemaskini_smoku = getTextContent(
                'div.form-group:nth-child(2) > div.row > div.col-lg-4 > span.col-form-label',
                jikaOkuDiv,
              );
              oku.kategori_ketidakupayaan = getSelectedOptionText(jikaOkuDiv.querySelector('select#kat_oku'));
              oku.sub_kategori_ketidakupayaan = getSelectedOptionText(
                jikaOkuDiv.querySelector('select#jenis_kurang_upaya'),
              );
              oku.no_surat_pengesahan_perubatan = getInputValue('input#no_surat', jikaOkuDiv);
              oku.tarikh_kelulusan_daftar_oku = convertTarikhToISO(getInputValue('input#datepicker_oku', jikaOkuDiv));
              oku.tarikh_pengesahan_perubatan = convertTarikhToISO(
                getInputValue('input#tarikh_pengesahan', jikaOkuDiv),
              );
              oku.tarikh_daftar_oku = convertTarikhToISO(getInputValue('input#tarikh_daftar', jikaOkuDiv));
              oku.nama_bank_bantuan = getSelectedOptionText(jikaOkuDiv.querySelector('select#kod_bank'));
              oku.no_akaun_bank_bantuan = getInputValue('input#no_akaun_bank', jikaOkuDiv);
              const alatBantuanSelects = jikaOkuDiv.querySelectorAll('select[name="alat_bantuan[]"]');
              if (alatBantuanSelects.length > 0)
                oku.alat_bantuan_teknologi_1 = getSelectedOptionText(alatBantuanSelects[0]);
              if (alatBantuanSelects.length > 1)
                oku.alat_bantuan_teknologi_2 = getSelectedOptionText(alatBantuanSelects[1]);
              oku.program_pendidikan_khas = getSelectedOptionText(
                jikaOkuDiv.querySelector('select#program_pendidikan'),
              );
              const kategoriInklusif = getRadioSelection('kategori', jikaOkuDiv);
              if (kategoriInklusif === '31') oku.kategori_inklusif = 'Penuh';
              else if (kategoriInklusif === '32') oku.kategori_inklusif = 'Separa';
              oku.tahap_pembelajaran = getSelectedOptionText(jikaOkuDiv.querySelector('select#tahap_pembelajaran'));
            }
          }
        }
      }

      const asramaAuditTrail = getAuditTrail('#status_asrama');
      if (asramaAuditTrail) {
        const asrama = maklumatMurid.status_asrama;
        const tinggalDiAsrama =
          getCheckboxState('input#cb_asrama', asramaAuditTrail) ||
          Boolean(getInputValue('input#id_individu_asrama', asramaAuditTrail));
        asrama.tinggal_di_asrama = toYaTidakValue(tinggalDiAsrama);
        if (asrama.tinggal_di_asrama === 'Ya') {
          const jikaAsramaDiv = asramaAuditTrail.querySelector('#jika_asrama');
          if (jikaAsramaDiv) {
            asrama.jenis_asrama = getSelectedOptionText(jikaAsramaDiv.querySelector('select#jenis_asrama'));
            asrama.nama_asrama = getSelectedOptionText(jikaAsramaDiv.querySelector('select#nama_asrama'));
          }
        }
      }

      const pengesahanTabContent = doc.querySelector('#anak_pengesahan');
      if (pengesahanTabContent) {
        const pengesahan = maklumatMurid.pengesahan_maklumat;
        const statusPengesahan = getInputValue('input#stat_keb', doc);
        const telahDisahkan =
          getCheckboxState('input#cb_pengesahan', pengesahanTabContent) ||
          statusPengesahan === '1' ||
          statusPengesahan === '2';
        pengesahan.telah_disahkan = toYaTidakValue(telahDisahkan);
        const tarikhPerakuan = getTextContent(
          '#simpan_7pengesahan div.form-group:nth-child(4) span',
          pengesahanTabContent,
        );
        pengesahan.tarikh_perakuan_dihantar =
          tarikhPerakuan ? tarikhPerakuan.replace('Perakuan Telah Dihantar Pada ', '') : undefined;
      }

      const pendapatanP1Str = maklumatMurid.penjaga.penjaga_utama.pekerjaan.pendapatan_bulanan;
      const pendapatanP2Str = maklumatMurid.penjaga.penjaga_kedua.pekerjaan.pendapatan_bulanan;

      let pendapatanP1 = 0;
      let pendapatanP2 = 0;
      let p1Valid = false;
      let p2Valid = false;

      if (pendapatanP1Str && typeof pendapatanP1Str === 'string') {
        const parsedP1 = parseFloat(pendapatanP1Str.replace(/,/g, ''));
        if (!Number.isNaN(parsedP1)) {
          pendapatanP1 = parsedP1;
          p1Valid = true;
        }
      }

      if (pendapatanP2Str && typeof pendapatanP2Str === 'string') {
        const parsedP2 = parseFloat(pendapatanP2Str.replace(/,/g, ''));
        if (!Number.isNaN(parsedP2)) {
          pendapatanP2 = parsedP2;
          p2Valid = true;
        }
      }

      if (p1Valid || p2Valid) {
        maklumatMurid.penjaga.tanggungan_isi_rumah.jumlah_pendapatan = pendapatanP1 + pendapatanP2;
      }

      const { jumlah_pendapatan, bilangan_tanggungan } = maklumatMurid.penjaga.tanggungan_isi_rumah;

      if (typeof jumlah_pendapatan === 'number' && !Number.isNaN(jumlah_pendapatan)) {
        if (bilangan_tanggungan && typeof bilangan_tanggungan === 'string') {
          const bilTanggunganInt = parseInt(bilangan_tanggungan.replace(/\D/g, ''), 10);
          if (!Number.isNaN(bilTanggunganInt) && bilTanggunganInt > 0) {
            const perKapita = jumlah_pendapatan / bilTanggunganInt;
            maklumatMurid.penjaga.tanggungan_isi_rumah.pendapatan_per_kapita = parseFloat(perKapita.toFixed(2));
          }
        } else if (typeof bilangan_tanggungan === 'number' && bilangan_tanggungan > 0) {
          const perKapita = jumlah_pendapatan / bilangan_tanggungan;
          maklumatMurid.penjaga.tanggungan_isi_rumah.pendapatan_per_kapita = parseFloat(perKapita.toFixed(2));
        }
      }

      if (!maklumatMurid.nama_murid) catatAmaranEkstraksi('nama_murid', 'header profil');
      if (!maklumatMurid.nombor_pengenalan) catatAmaranEkstraksi('nombor_pengenalan', 'header profil');
      if (!maklumatMurid.nama_kelas) catatAmaranEkstraksi('nama_kelas', 'header profil');
      if (!maklumatMurid.penjaga?.penjaga_utama?.nama)
        catatAmaranEkstraksi('penjaga.penjaga_utama.nama', 'tab penjaga utama');
      if (extractionWarnings.length > 0) {
        console.warn('SBG Ekstrak Profil: medan kritikal berpotensi tidak lengkap.', extractionWarnings);
      }

      return maklumatMurid;
    };

    let semuaProfilMuridGlobal = [];
    let dataTableInstances = {};
    let dependenciesLoaded = false;
    let sbgIsolatedJQuery = null;
    let sbgDataTable = null;
    let isGuruKelas = false;
    let activeDataTableTab = 'semua-maklumat-murid';
    let viewportResizeHandlerRegistered = false;
    let pendingDataTableLayoutFrame = null;
    // Berdasarkan props.tahun_tingkat
    const idTahunTingSemuaProfil = [
      48, 49, 50, 51, 52, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 92, 97, 105,
    ];

    function delay(ms) {
      return new Promise(resolve => {
        setTimeout(resolve, ms);
      });
    }

    function prosesMuridBerurutan(jsonSenaraiMurid) {
      return new Promise(async (resolve, reject) => {
        if (!jsonSenaraiMurid || !jsonSenaraiMurid.length) {
          console.log('Tiada senarai murid untuk diproses.');
          if (window.sbgWriteLog) window.sbgWriteLog('Tiada senarai murid untuk diproses.');
          await notifyUser('Tiada senarai murid untuk diproses.', 'Notifikasi Skrip');
          resolve();
          return;
        }

        // Load existing profiles at start
        let jumlahRekorSediaAda = 0;
        try {
          semuaProfilMuridGlobal = await getStoredData('semuaProfilMuridSBG', []);
          jumlahRekorSediaAda = semuaProfilMuridGlobal.length;
          console.log(`Data sedia ada 'semuaProfilMuridSBG' dimuatkan: ${jumlahRekorSediaAda} rekod.`);
          if (window.sbgWriteLog)
            window.sbgWriteLog(`Data sedia ada 'semuaProfilMuridSBG' dimuatkan: ${jumlahRekorSediaAda} rekod.`);
        } catch (e) {
          console.error('Gagal memuatkan data sedia ada:', e);
          if (window.sbgWriteLog) window.sbgWriteLog(`RALAT: Gagal memuatkan data sedia ada: ${e.message}`);
          reject(e);
          return;
        }

        // Create backup of original data for recovery
        const backupProfilMurid = JSON.parse(JSON.stringify(semuaProfilMuridGlobal));
        let jumlahMuridBerjaya = 0;
        let jumlahMuridGagal = 0;
        const muridGagalSenarai = [];

        let index = 0;
        async function processNext() {
          if (index >= jsonSenaraiMurid.length) {
            // Semua murid telah diproses. Lakukan penyimpanan SEKALI SAHAJA di akhir.
            console.log(
              `Semua ${jsonSenaraiMurid.length} murid telah berjaya diproses. (Berjaya: ${jumlahMuridBerjaya}, Gagal: ${jumlahMuridGagal})`,
            );
            if (window.sbgWriteLog)
              window.sbgWriteLog(
                `✓ Semua ${jsonSenaraiMurid.length} murid telah berjaya diproses. (Berjaya: ${jumlahMuridBerjaya}, Gagal: ${jumlahMuridGagal})`,
              );

            try {
              // Verifikasi data sebelum simpan
              if (!Array.isArray(semuaProfilMuridGlobal)) {
                throw new Error('semuaProfilMuridGlobal bukan array yang sah');
              }
              console.log(
                `[Profil Cache] Menyimpan ${semuaProfilMuridGlobal.length} rekod profil murid ke penyimpanan...`,
              );
              if (window.sbgWriteLog)
                window.sbgWriteLog(
                  `[Profil Cache] Menyimpan ${semuaProfilMuridGlobal.length} rekod profil murid ke penyimpanan...`,
                );

              // SIMPANAN UTAMA: Hanya dilakukan SEKALI di akhir
              await setStoredData('semuaProfilMuridSBG', semuaProfilMuridGlobal);

              // Verifikasi simpanan dengan membaca balik
              const dataDariStorage = await getStoredData('semuaProfilMuridSBG', []);
              if (dataDariStorage.length !== semuaProfilMuridGlobal.length) {
                console.error(
                  `⚠ AMARAN INTEGRITI: Bilangan rekod dalam storage (${dataDariStorage.length}) tidak sepadan dengan cache (${semuaProfilMuridGlobal.length})`,
                );
                if (window.sbgWriteLog)
                  window.sbgWriteLog(
                    `⚠ AMARAN INTEGRITI: Bilangan rekod dalam storage (${dataDariStorage.length}) tidak sepadan dengan cache (${semuaProfilMuridGlobal.length})`,
                  );
              }

              await renderDataTable();
              const mesejSelesai =
                muridGagalSenarai.length > 0 ?
                  `Selesai memproses ${jsonSenaraiMurid.length} profil murid (${jumlahMuridBerjaya} berjaya, ${jumlahMuridGagal} gagal). Sejumlah ${semuaProfilMuridGlobal.length} rekod telah disimpan.`
                : `Selesai memproses ${jsonSenaraiMurid.length} profil murid. Sejumlah ${semuaProfilMuridGlobal.length} rekod telah disimpan.`;

              await notifyUser(mesejSelesai, 'Proses Selesai', false, false, 5000);
              if (window.sbgWriteLog) window.sbgWriteLog(mesejSelesai);

              if (muridGagalSenarai.length > 0) {
                const mesejGagal = `Murid yang gagal diproses: ${muridGagalSenarai.join(', ')}`;
                console.warn(mesejGagal);
                if (window.sbgWriteLog) window.sbgWriteLog(`⚠ ${mesejGagal}`);
              }

              resolve();
            } catch (saveError) {
              console.error('RALAT KRITIKAL: Gagal menyimpan data profil murid ke penyimpanan:', saveError);
              if (window.sbgWriteLog)
                window.sbgWriteLog(`RALAT KRITIKAL: Gagal menyimpan data ke penyimpanan: ${saveError.message}`);

              // Attempt recovery: restore backup
              try {
                console.log('Attempting recovery: Memulihkan data dari backup...');
                if (window.sbgWriteLog) window.sbgWriteLog('Attempting recovery: Memulihkan data dari backup...');
                semuaProfilMuridGlobal = backupProfilMurid;
                await setStoredData('semuaProfilMuridSBG', semuaProfilMuridGlobal);
                await renderDataTable();
                await notifyUser(
                  'Ralat semasa simpan. Data dipulihkan ke keadaan sebelum. Sila cuba lagi.',
                  'Ralat Penyimpanan',
                  true,
                  true,
                  5000,
                );
                reject(saveError);
              } catch (recoveryError) {
                console.error('RALAT KRITIKAL: Kegagalan pemulihan backup:', recoveryError);
                if (window.sbgWriteLog)
                  window.sbgWriteLog(
                    `RALAT KRITIKAL: Kegagalan pemulihan backup: ${recoveryError.message}. Data mungkin hilang.`,
                  );
                await notifyUser(
                  'Ralat kritikal: Gagal menyimpan dan memulihkan data. Sila refresh dan cuba lagi.',
                  'Ralat Kritikal',
                  true,
                  true,
                  8000,
                );
                reject(recoveryError);
              }
            }
            return;
          }

          const dataMurid = jsonSenaraiMurid[index];
          console.log(`Memproses ${index + 1}/${jsonSenaraiMurid.length}: ${dataMurid.nama} (${dataMurid.kelas})`);
          if (window.sbgWriteLog)
            window.sbgWriteLog(
              `Memproses ${index + 1}/${jsonSenaraiMurid.length}: ${dataMurid.nama} (${dataMurid.kelas})`,
            );

          try {
            const responseText = await mohonHalamanProfilMurid(dataMurid);
            if (responseText) {
              const hasilEkstrak = await ekstrakInfoMurid(responseText, dataMurid);
              if (hasilEkstrak) {
                jumlahMuridBerjaya++;
              } else {
                jumlahMuridGagal++;
                muridGagalSenarai.push(`${dataMurid.nama} (parsing gagal)`);
              }
            } else {
              jumlahMuridGagal++;
              muridGagalSenarai.push(`${dataMurid.nama} (tiada respons)`);
            }
            index++;
            setTimeout(processNext, 700);
          } catch (error) {
            if (error.code === 'TOKEN_EXPIRED' || error.status === 419) {
              console.error(`Token expired (419) pada pemprosesan murid ke-${index + 1}. Menghentikan pemprosesan.`);
              if (window.sbgWriteLog)
                window.sbgWriteLog(
                  `⚠ RALAT 419: Token tamat tempoh pada murid ke-${index + 1}. Menghentikan pemprosesan.`,
                );

              // Token expired: Save current state and stop
              try {
                const jumlahDimudiSebelumTokenFailed = semuaProfilMuridGlobal.length;
                console.log(
                  `[Profil Cache] Token expired - Menyimpan ${jumlahDimudiSebelumTokenFailed} rekod sebelum token tamat...`,
                );
                if (window.sbgWriteLog)
                  window.sbgWriteLog(
                    `[Profil Cache] Token expired - Menyimpan ${jumlahDimudiSebelumTokenFailed} rekod sebelum token tamat...`,
                  );
                await setStoredData('semuaProfilMuridSBG', semuaProfilMuridGlobal);

                await renderDataTable();
                await notifyUser(
                  `Token telah tamat tempoh pada murid ke-${index + 1}. Telah menyimpan ${semuaProfilMuridGlobal.length} rekod. Sila login semula dan teruskan.`,
                  'Token Tamat Tempoh (419)',
                  false,
                  true,
                  5000,
                );
                if (window.sbgWriteLog)
                  window.sbgWriteLog(
                    `Token telah tamat tempoh pada murid ke-${index + 1}. Telah menyimpan ${semuaProfilMuridGlobal.length} rekod.`,
                  );
                resolve();
              } catch (tokenError) {
                console.error('Ralat semasa menangani token expired:', tokenError);
                if (window.sbgWriteLog)
                  window.sbgWriteLog(`Ralat semasa menangani token expired: ${tokenError.message}`);
                reject(tokenError);
              }
            } else {
              // Non-critical error: log and continue to next student
              console.error(`Ralat semasa memproses murid ke-${index + 1}: ${error.message}`);
              if (window.sbgWriteLog)
                window.sbgWriteLog(
                  `⚠ Ralat pada murid ke-${index + 1}: ${error.message} (teruskan ke murid berikutnya)`,
                );
              jumlahMuridGagal++;
              muridGagalSenarai.push(`${dataMurid.nama} (${error.message.substring(0, 40)})`);
              index++;
              setTimeout(processNext, 700);
            }
          }
        }
        processNext();
      });
    }

    function mohonHalamanProfilMurid(dataMurid) {
      return new Promise((resolve, reject) => {
        if (!dataMurid || !dataMurid.action) {
          console.error('Data murid tidak sah untuk permintaan POST:', dataMurid);
          if (window.sbgWriteLog) window.sbgWriteLog(`⚠ Data murid tidak sah untuk permintaan POST`);
          reject(new Error('Invalid student data'));
          return;
        }
        const url = dataMurid.action.replace(/^http:\/\/moeispel\.moe\.gov\.my/i, 'https://moeispel.moe.gov.my');
        const params = new URLSearchParams();
        params.append('id', dataMurid.id);
        params.append('txtJenis_id', dataMurid.txtJenis_id);
        params.append('txtNama', dataMurid.txtNama);
        params.append('tidak', dataMurid.tidak);
        params.append('_token', dataMurid._token);
        const requestBody = params.toString();
        const requestHeaders = {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        };

        GM.xmlHttpRequest({
          method: 'POST',
          url,
          data: requestBody,
          headers: requestHeaders,
          onload: response => {
            if (response.status === 419) {
              const error = new Error('Token expired (419)');
              error.status = 419;
              error.code = 'TOKEN_EXPIRED';
              console.error(`Token tamat tempoh untuk ${dataMurid.nama}: Status 419`);
              if (window.sbgWriteLog) window.sbgWriteLog(`⚠ HTTP 419: Token tamat tempoh untuk ${dataMurid.nama}`);
              reject(error);
            } else if (response.status >= 200 && response.status < 300) {
              resolve(response.responseText);
            } else {
              console.error(`Ralat mendapatkan butiran untuk ${dataMurid.nama}: Status ${response.status}`);
              if (window.sbgWriteLog)
                window.sbgWriteLog(`⚠ HTTP ${response.status}: Ralat mendapatkan butiran untuk ${dataMurid.nama}`);
              const error = new Error(`HTTP ${response.status}`);
              error.status = response.status;
              reject(error);
            }
          },
          onerror: () => {
            console.error(`Ralat sambungan untuk murid ${dataMurid.nama}`);
            if (window.sbgWriteLog) window.sbgWriteLog(`⚠ Ralat sambungan: Sambungan gagal untuk ${dataMurid.nama}`);
            reject(new Error('Network error'));
          },
        });
      });
    }

    async function ekstrakInfoMurid(responseText, dataMurid) {
      if (!responseText) return null;
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(responseText, 'text/html');
        if (doc.querySelector('parsererror')) {
          throw new Error('HTML profil murid tidak dapat diparse dengan sempurna.');
        }
        if (!isProfilMuridDocument(doc)) {
          const tajukHalaman = doc.querySelector('title')?.textContent?.trim() || 'Tiada tajuk';
          const pratontonTeks = doc.body?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 250) || '';
          throw new Error(
            `Respons bukan halaman profil murid penuh. Tajuk: ${tajukHalaman}. Pratonton: ${pratontonTeks}`,
          );
        }
        const maklumatDiekstrak = ekstrakInfo(doc);

        const infoMuridLengkap = {
          id_moeis: dataMurid.id_moeis,
          nama: dataMurid.nama,
          kelas: dataMurid.kelas,
          maklumat: maklumatDiekstrak,
        };
        console.log(maklumatDiekstrak);

        const profilMuridIndex = semuaProfilMuridGlobal.findIndex(p => p.id_moeis === infoMuridLengkap.id_moeis);
        if (profilMuridIndex > -1) {
          semuaProfilMuridGlobal[profilMuridIndex] = infoMuridLengkap;
          console.log(
            `[Profil Cache] Murid ${infoMuridLengkap.nama} (ID: ${infoMuridLengkap.id_moeis}) dikemaskini dalam cache (jumlah: ${semuaProfilMuridGlobal.length})`,
          );
        } else {
          semuaProfilMuridGlobal.push(infoMuridLengkap);
          console.log(
            `[Profil Cache] Murid ${infoMuridLengkap.nama} (ID: ${infoMuridLengkap.id_moeis}) ditambah ke cache (jumlah: ${semuaProfilMuridGlobal.length})`,
          );
        }
        // PENTING: Jangan simpan setiap kali. Simpanan akan dilakukan sekali sahaja di akhir proses untuk mengelakkan race condition.
        return infoMuridLengkap;
      } catch (error) {
        console.error(`Ralat semasa ekstrak maklumat untuk ${dataMurid.nama}:`, error);
        return null;
      }
    }

    function ekstrakJsonSenaraiMurid(dataJson) {
      if (!dataJson?.data?.length) return [];
      return dataJson.data.map(item => {
        const dataCapaianMurid = {
          id_moeis: item.id_individu,
          nama: '',
          kelas: `${item.keterangan} ${item.nama_kelas}`,
        };
        const namaHTML = item.nama;
        const parser = new DOMParser();
        const doc = parser.parseFromString(namaHTML, 'text/html');
        const anchor = doc.querySelector('a');
        const form = doc.querySelector('form');
        dataCapaianMurid.nama =
          anchor ? anchor.textContent.trim() : namaHTML.match(/>([^<]+)</)?.[1] || 'Nama Tidak Ditemui';
        if (form) {
          dataCapaianMurid.action = normalizeMoeispelUrl(form.getAttribute('action'));
          form.querySelectorAll('input[type="hidden"]').forEach(input => {
            dataCapaianMurid[input.name] = input.value;
          });
        }
        return dataCapaianMurid;
      });
    }

    function ekstrakNamaKelasHtml(htmlString) {
      if (!htmlString) return 'Kelas Tidak Diketahui';

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      const alertElement = doc.querySelector('div.alert.alert-infox[role="alert"]');
      const alertText = alertElement?.textContent?.replace(/\s+/g, ' ').trim();

      if (!alertText) return 'Kelas Tidak Diketahui';
      return alertText.replace(/^Senarai\s+Murid\s+TINGKATAN\s+/i, '').trim() || 'Kelas Tidak Diketahui';
    }

    function ekstrakHtmlSenaraiMurid(htmlString, namaKelasLengkap) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      const barisMurid = doc.querySelectorAll('#tbl_senarai tbody tr');
      const dataCapaianMurid = [];
      const namaKelasDaripadaHtml = ekstrakNamaKelasHtml(htmlString);
      const kelasUntukDiguna = namaKelasDaripadaHtml || namaKelasLengkap || 'Kelas Tidak Diketahui';

      barisMurid.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) return;

        const strukturData = {
          id_moeis: '',
          nama: '',
          kelas: kelasUntukDiguna,
          action: '',
          _token: '',
          id: '',
          txtJenis_id: '',
          txtNama: '',
          tidak: '',
        };

        const formElement = row.querySelector('form[action*="/profil/pelajar/details"]');
        if (formElement) {
          strukturData.action = normalizeMoeispelUrl(formElement.getAttribute('action'));
          const anchorElement = formElement.querySelector('a');
          if (anchorElement) strukturData.nama = anchorElement.textContent.trim();
          formElement.querySelectorAll('input[type="hidden"]').forEach(input => {
            if (strukturData.hasOwnProperty(input.name)) strukturData[input.name] = input.value;
          });
        }

        if (!strukturData.nama) {
          strukturData.nama = strukturData.txtNama || cells[2]?.textContent?.trim() || '';
        }

        const radioElement = row.querySelector('input.ada-radio[data-id]');
        const dataId = radioElement?.getAttribute('data-id') || '';
        if (dataId.includes('_')) {
          strukturData.id_moeis = dataId.split('_').pop() || '';
        }

        if (strukturData.id_moeis && strukturData.nama && strukturData.action) dataCapaianMurid.push(strukturData);
      });
      return dataCapaianMurid;
    }

    async function prosesJsonSenaraiMurid(
      token,
      idTahunTingDariSelect,
      idKelasDariSelect = null,
      labelKumpulan = null,
    ) {
      const payload = new URLSearchParams({
        _token: token,
        statusmurid: '3',
        selTahunTing: idTahunTingDariSelect,
      });
      if (idKelasDariSelect) payload.append('selKelas', idKelasDariSelect);

      const responseData = await makeRequest(
        'POST',
        'https://moeispel.moe.gov.my/senaraimurid/ajaxLoadSenaraiMurid',
        payload.toString(),
        'json',
        { 'Content-Type': 'application/x-www-form-urlencoded' },
      );

      if (!responseData?.data) {
        await notifyUser('Respons dari pelayan tidak mengandungi data murid.', 'Ralat Data', false, true);
        return 0;
      }

      const senaraiMuridDiproses = ekstrakJsonSenaraiMurid(responseData);
      if (senaraiMuridDiproses.length === 0) {
        const mesejKriteria = labelKumpulan ? ` untuk ${labelKumpulan}` : ' untuk kriteria yang dipilih';
        await notifyUser(`Tiada murid ditemui${mesejKriteria}.`, 'Notifikasi Skrip');
        return 0;
      }

      const mesejMuat =
        labelKumpulan ?
          `Memuatkan ${senaraiMuridDiproses.length} murid bagi ${labelKumpulan}...`
        : `Memuatkan ${senaraiMuridDiproses.length} murid...`;
      await notifyUser(mesejMuat, 'Muat Senarai Murid');
      await prosesMuridBerurutan(senaraiMuridDiproses);
      return senaraiMuridDiproses.length;
    }

    async function handleKumpulSemuaProfilClick(buttonId) {
      const teksBtn = document.getElementById(buttonId).textContent;
      showLoading(buttonId, teksBtn.replace('Kumpul ', 'Mengumpul '), teksBtn);

      try {
        const tokenEl = document.querySelector('#logout-form > input[type=hidden][name="_token"]');
        if (!tokenEl) {
          await notifyUser('Token CSRF tidak ditemui.', 'Ralat Kritikal', false, true);
          return;
        }

        let jumlahMuridDiproses = 0;

        for (const [index, idTahunTing] of idTahunTingSemuaProfil.entries()) {
          jumlahMuridDiproses += await prosesJsonSenaraiMurid(
            tokenEl.value,
            idTahunTing,
            null,
            `ID Tahun/Tingkatan ${idTahunTing}`,
          );

          if (index < idTahunTingSemuaProfil.length - 1) {
            await delay(2000);
          }
        }

        await renderDataTable();
        await notifyUser(
          `Selesai memproses ${jumlahMuridDiproses} murid bagi ${idTahunTingSemuaProfil.join(', ')}.`,
          'Proses Selesai',
        );
      } catch (error) {
        console.error('Ralat semasa memuatkan semua profil murid:', error);
        await notifyUser('Gagal memuatkan semua profil murid. Sila semak konsol.', 'Ralat Rangkaian', false, true);
      } finally {
        hideLoading(buttonId);
      }
    }

    async function handleKumpulProfilClick(buttonId, idKelasDariSelect, idTahunTingDariSelect = null) {
      const teksBtn = document.getElementById(buttonId).textContent;
      showLoading(buttonId, teksBtn.replace('Kumpul ', 'Mengumpul '), teksBtn);

      try {
        const tokenEl = document.querySelector('#logout-form > input[type=hidden][name="_token"]');
        if (!tokenEl) {
          await notifyUser('Token CSRF tidak ditemui.', 'Ralat Kritikal', false, true);
          return;
        }

        if (isGuruKelas) {
          if (!idKelasDariSelect) {
            await notifyUser('Sila pilih kelas terlebih dahulu.', 'Input Diperlukan', false, true);
            return;
          }
          const url = `https://moeispel.moe.gov.my/kurikulum/pengurusankelas/kelassaya/paparsemua/${idKelasDariSelect}`;
          const responseHtml = await makeRequest('GET', url, null, 'text');

          if (responseHtml) {
            const namaKelasLengkap = ekstrakNamaKelasHtml(responseHtml);
            const senaraiMuridDiproses = ekstrakHtmlSenaraiMurid(responseHtml, namaKelasLengkap);
            if (senaraiMuridDiproses.length > 0) {
              await notifyUser(
                `Memuatkan ${senaraiMuridDiproses.length} murid dari kelas ${namaKelasLengkap}...`,
                'Muat Senarai Murid',
              );
              await prosesMuridBerurutan(senaraiMuridDiproses);
              await renderDataTable();
            } else {
              await notifyUser('Tiada murid ditemui dalam kelas ini dari HTML.', 'Notifikasi Skrip');
            }
          } else {
            await notifyUser('Gagal mendapatkan data HTML senarai murid kelas.', 'Ralat Data', false, true);
          }
        } else {
          await prosesJsonSenaraiMurid(tokenEl.value, idTahunTingDariSelect, idKelasDariSelect);
          await renderDataTable();
        }
      } catch (error) {
        console.error('Ralat semasa memuatkan senarai murid:', error);
        await notifyUser('Gagal memuatkan senarai murid. Sila semak konsol.', 'Ralat Rangkaian', false, true);
      } finally {
        hideLoading(buttonId);
      }
    }

    function binaBhgnAnalisisProfil() {
      const originalSelectedElement = document.querySelector('section.card');
      const parentElement = originalSelectedElement ? originalSelectedElement.parentElement : null;
      if (!parentElement || parentElement.querySelector('.tab-container-sbg')) return;

      const localSenaraiKelasArray = typeof senaraikelasArray !== 'undefined' ? senaraikelasArray : null;
      const senaraikelasObject = {};
      if (localSenaraiKelasArray) {
        localSenaraiKelasArray.forEach(item => {
          if (!senaraikelasObject[item.id_thn_ting]) senaraikelasObject[item.id_thn_ting] = [];
          senaraikelasObject[item.id_thn_ting].push({
            Value: item.id_profil_kelas,
            Text: item.nama_kelas,
          });
        });
      }

      const tabContainer = document.createElement('div');
      tabContainer.className = 'tab-container-sbg';
      const tabHeaders = document.createElement('div');
      tabHeaders.className = 'tab-headers';
      const tabContent = document.createElement('div');
      tabContent.className = 'tab-content';
      const firstTabHeader = document.createElement('button');
      firstTabHeader.className = 'tab-header active';
      firstTabHeader.textContent = 'Senarai Murid Untuk Pengurusan Profil';
      const secondTabHeader = document.createElement('button');
      secondTabHeader.className = 'tab-header';
      secondTabHeader.textContent = '✨ Analisis Profil Murid (SolusiBestariGuru)';
      const firstTabContent = document.createElement('div');
      firstTabContent.className = 'tab-pane active';
      if (originalSelectedElement) firstTabContent.appendChild(originalSelectedElement);
      const secondTabContent = document.createElement('div');
      secondTabContent.className = 'tab-pane';
      tabHeaders.append(firstTabHeader, secondTabHeader);
      tabContent.append(firstTabContent, secondTabContent);
      tabContainer.append(tabHeaders, tabContent);
      parentElement.appendChild(tabContainer);

      tabHeaders.querySelectorAll('.tab-header').forEach((header, index) => {
        header.addEventListener('click', () => {
          tabHeaders.querySelector('.active').classList.remove('active');
          header.classList.add('active');
          tabContent.querySelector('.active').classList.remove('active');
          tabContent.children[index].classList.add('active');
        });
      });

      const styleId = 'sbg-userscript-styles';
      if (!document.getElementById(styleId)) {
        GM_addStyle(`
          table.dataTable thead th, table.dataTable thead td { white-space: wrap !important; }
          div.dt-button-collection {
            max-height: min(70vh, 420px) !important;
            width: auto !important;
            display: flex !important;
            flex-direction: column;
            padding: 0 !important;
            overflow: hidden !important;
            overflow-x: hidden !important;
            box-sizing: border-box;
            scrollbar-width: thin;
          }
          div.dt-button-collection > * {
            box-sizing: border-box;
            margin-top: 0 !important;
          }
          div.dt-button-collection div.dt-button-collection-title,
          div.dt-button-collection .dt-button-collection-title {
            flex: 0 0 auto;
            position: sticky;
            top: 0;
            z-index: 1;
            background: #fff;
            margin: 0 !important;
            padding-top: 0 !important;
          }
          div.dt-button-collection div[role="menu"],
          div.dt-button-collection .dropdown-menu,
          div.dt-button-collection .dt-button-collection-buttons {
            flex: 1 1 auto;
            min-height: 0;
            margin: 0 !important;
            padding-top: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          #sbg-datatable-host {
            display: flex;
            flex-direction: column;
            min-height: 0;
          }
          .sbg-datatables-shell {
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-height: 0;
          }
          .sbg-datatables-tabs {
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-height: 0;
          }
          .sbg-datatables-tab-headers {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
          }
          .sbg-datatables-tab-button {
            border: 1px solid #c7d2da;
            background: linear-gradient(180deg, #f9fbfc 0%, #edf3f6 100%);
            color: #24404f;
            padding: 8px 14px;
            border-radius: 999px;
            font-weight: 600;
            line-height: 1.2;
            cursor: pointer;
          }
          .sbg-datatables-tab-button.active {
            background: linear-gradient(180deg, #1f6f8b 0%, #165369 100%);
            border-color: #165369;
            color: #fff;
            box-shadow: 0 6px 16px rgba(22, 83, 105, 0.18);
          }
          .sbg-datatables-tab-pane {
            display: none;
            min-height: 0;
          }
          .sbg-datatables-tab-pane.active {
            display: block;
          }
          .sbg-datatables-tab-pane .dt-container,
          .sbg-datatables-tab-pane .dt-layout-row,
          .sbg-datatables-tab-pane .dt-scroll,
          .sbg-datatables-tab-pane .dt-scroll-head,
          .sbg-datatables-tab-pane .dt-scroll-body {
            min-height: 0;
          }
          #jadualSenaraiPenjagaSBG th.sbg-col-penjaga-nama,
          #jadualSenaraiPenjagaSBG td.sbg-col-penjaga-nama,
          #jadualSenaraiPenjagaSBG th.sbg-col-hubungan-penjaga,
          #jadualSenaraiPenjagaSBG td.sbg-col-hubungan-penjaga,
          #jadualSenaraiPenjagaSBG th.sbg-col-murid-jagaan,
          #jadualSenaraiPenjagaSBG td.sbg-col-murid-jagaan {
            white-space: normal !important;
            word-break: break-word;
          }
          #jadualSenaraiPenjagaSBG th.sbg-col-jantina-penjaga,
          #jadualSenaraiPenjagaSBG td.sbg-col-jantina-penjaga {
            white-space: nowrap !important;
          }
          #jadualSenaraiPenjagaSBG th.sbg-col-no-kp,
          #jadualSenaraiPenjagaSBG td.sbg-col-no-kp,
          #jadualSenaraiPenjagaSBG th.sbg-col-telefon,
          #jadualSenaraiPenjagaSBG td.sbg-col-telefon {
            white-space: nowrap !important;
          }
          #jadualSenaraiPenjagaSBG th.sbg-col-no-kp,
          #jadualSenaraiPenjagaSBG td.sbg-col-no-kp {
            min-width: 140px;
          }
          #jadualSenaraiPenjagaSBG th.sbg-col-telefon,
          #jadualSenaraiPenjagaSBG td.sbg-col-telefon {
            min-width: 130px;
          }
          .tab-container-sbg .tab-headers { display: flex; margin-bottom: 0; border-bottom: 1px solid #ccc; }
          .tab-container-sbg .tab-header { padding: 10px 15px; cursor: pointer; border: 1px solid transparent; border-bottom: none; background-color: #f0f0f0; position: relative; top: 1px; }
          .tab-container-sbg .tab-header.active { background-color: #fff; border-color: #ccc; border-bottom-color: transparent; font-weight: bold; }
          .tab-container-sbg .tab-content { border: 1px solid #ccc; border-top: none; padding: 15px; background-color: #fff; }
          .tab-container-sbg .tab-pane { display: none; } .tab-container-sbg .tab-pane.active { display: block; }
          .form-group.row { align-items: center; }
          .userscript-spinner { display: inline-block; width: 1em; height: 1em; border: 2px solid rgba(0,0,0,.1); border-radius: 50%; border-top-color: #007bff; animation: spin 1s ease-in-out infinite; margin-right: 5px; vertical-align: middle; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `);
        const styleCheck = document.createElement('style');
        styleCheck.id = styleId;
        document.head.appendChild(styleCheck);
      }

      secondTabContent.innerHTML = /*html*/ `
        <div class="form-group row">
          <div class="col-md-2">
            <div class="cui-utils-title head_underline"><strong>Kumpul Profil Murid</strong>
                <h5 class="mb-0" style="text-transform: initial !important;">Muat Turun Data Profil</h5>
            </div>
          </div>
          <div class="col-md-10" id="sbg-controls-container"></div>
        </div>
        <div class="form-actions">
          <div class="d-flex justify-content-between align-items-center">
            <div class="cui-utils-title head_underline">
              <strong>Jadual Maklumat Profil</strong>
            </div>
            <button id="btnSegarSemulaDTSbg" class="btn btn-outline-secondary btn-sm">Segar Semula Jadual</button>
          </div>
          <div id="sbg-datatable-host"></div>
        </div>`;

      const controlsContainer = secondTabContent.querySelector('#sbg-controls-container');
      const kelasRow = document.createElement('div');
      kelasRow.className = 'form-group row';

      let clonedSelTahunTing = null;
      if (!isGuruKelas) {
        const tahunRow = document.createElement('div');
        tahunRow.className = 'form-group row';
        if (document.querySelector('select#selTahunTing')) {
          clonedSelTahunTing = document.querySelector('select#selTahunTing').cloneNode(true);
          clonedSelTahunTing.id = 'normalSelTahunTingSbg';
          clonedSelTahunTing.className = 'form-control';
          Array.from(clonedSelTahunTing.options).forEach(opt => {
            if (opt.value === '' || !senaraikelasObject[opt.value]) opt.remove();
          });
          const isTingkatanLabel = Array.from(clonedSelTahunTing.options).some(opt =>
            opt.textContent.includes('TINGKATAN'),
          );
          tahunRow.innerHTML = `<label for="normalSelTahunTingSbg" class="col-md-2 col-form-label text-md-right">${
            isTingkatanLabel ? 'Tingkatan' : 'Tahun'
          }:</label>`;
          const divSelect = document.createElement('div');
          divSelect.className = 'col-md-4';
          divSelect.appendChild(clonedSelTahunTing);
          const divBtn = document.createElement('div');
          divBtn.className = 'col-md-6';
          const btn = document.createElement('button');
          btn.id = 'btnKumpulProfilTahunSbg';
          btn.className = 'btn btn-primary';
          btn.textContent = `Kumpul Semua Profil Murid Dalam ${isTingkatanLabel ? 'Tingkatan' : 'Tahun'}`;
          btn.addEventListener('click', () => {
            const tahunTingValue = clonedSelTahunTing.value;
            handleKumpulProfilClick(btn.id, null, tahunTingValue);
          });

          divBtn.append(btn);
          tahunRow.append(divSelect, divBtn);
          controlsContainer.appendChild(tahunRow);
        }
      }

      const clonedSelKelas = document.createElement('select');
      clonedSelKelas.id = 'normalSelKelasSbg';
      clonedSelKelas.className = 'form-control';
      if (isGuruKelas) {
        const namaTingkatanElement = document.querySelector('div.div-kelas.label-thnting > div.text-white');
        const namaKelasElement = document.querySelector('div.div-kelas.label-namakelas > div > a');
        const idKelasElement = document.querySelector('div.div-kelas.label-namakelas > span > a');

        if (namaTingkatanElement && namaKelasElement && idKelasElement) {
          const tingkatanText = namaTingkatanElement.textContent.split('\n\n')[1]?.trim() || '';
          const kelasText = namaKelasElement.textContent.trim();
          const optionText = `${tingkatanText} ${kelasText}`;
          const optionValue = idKelasElement.getAttribute('data-id');
          clonedSelKelas.add(new Option(optionText, optionValue));
          clonedSelKelas.selectedIndex = 0;
        } else {
          console.error('Tidak dapat mencari elemen DOM yang diperlukan untuk mod Guru Kelas.');
          clonedSelKelas.innerHTML = '<option value="">Ralat: Kelas tidak dijumpai</option>';
        }
      } else {
        clonedSelKelas.innerHTML = '<option value="">Sila Pilih Kelas</option>';
      }
      kelasRow.innerHTML = `<label for="normalSelKelasSbg" class="col-md-2 col-form-label text-md-right">Kelas:</label>`;
      const divSelectKelas = document.createElement('div');
      divSelectKelas.className = 'col-md-4';
      divSelectKelas.appendChild(clonedSelKelas);

      const divBtnKelas = document.createElement('div');
      divBtnKelas.className = 'col-md-6';
      const btnKelas = document.createElement('button');
      btnKelas.id = 'btnKumpulProfilKelasSbg';
      btnKelas.className = 'btn btn-primary';
      btnKelas.textContent = 'Kumpul Semua Profil Murid Dalam Kelas';
      btnKelas.addEventListener('click', () => {
        const kelasValue = clonedSelKelas.value;
        if (isGuruKelas) {
          handleKumpulProfilClick(btnKelas.id, kelasValue, null);
        } else {
          const tahunTingValue = clonedSelTahunTing ? clonedSelTahunTing.value : null;
          if (!tahunTingValue) {
            notifyUser('Sila pilih Tahun/Tingkatan dahulu.', 'Input Diperlukan', false, true);
            return;
          }
          handleKumpulProfilClick(btnKelas.id, kelasValue, tahunTingValue);
        }
      });

      const btnSemua = document.createElement('button');
      btnSemua.id = 'btnKumpulSemuaProfilSbg';
      btnSemua.className = 'btn btn-second';
      btnSemua.textContent = 'Kumpul Semua Profil Murid';
      btnSemua.style.marginLeft = '8px';
      btnSemua.style.display = 'none';
      btnSemua.addEventListener('click', () => {
        handleKumpulSemuaProfilClick(btnSemua.id);
      });

      divBtnKelas.append(btnKelas, btnSemua);
      kelasRow.append(divSelectKelas, divBtnKelas);

      // Tambah textarea untuk log
      const logLabelRow = document.createElement('div');
      logLabelRow.className = 'form-group row mt-3';
      logLabelRow.innerHTML = `<label for="logMesej" class="col-md-2 col-form-label text-md-right">Log Mesej:</label>`;
      const logTextareaDiv = document.createElement('div');
      logTextareaDiv.className = 'col-md-10';
      const logTextarea = document.createElement('textarea');
      logTextarea.id = 'logMesej';
      logTextarea.className = 'form-control';
      logTextarea.placeholder = 'Log proses akan dipaparkan di sini...';
      logTextarea.style.width = '100%';
      logTextarea.style.height = '80px';
      logTextarea.style.resize = 'vertical';
      logTextarea.readOnly = true;
      logTextareaDiv.appendChild(logTextarea);
      logLabelRow.appendChild(logTextareaDiv);

      kelasRow.append(divSelectKelas, divBtnKelas);
      controlsContainer.appendChild(kelasRow);
      controlsContainer.appendChild(logLabelRow);

      // Fungsi untuk menulis ke textarea
      const writeLog = message => {
        const textarea = document.getElementById('logMesej');
        if (textarea) {
          const timestamp = new Date().toLocaleTimeString('ms-MY');
          const logEntry = `[${timestamp}] ${message}`;
          textarea.value += (textarea.value ? '\n' : '') + logEntry;
          textarea.scrollTop = textarea.scrollHeight;
        }
      };

      // Simpan writeLog ke window untuk akses global
      window.sbgWriteLog = writeLog;

      if (!isGuruKelas && clonedSelTahunTing && Object.keys(senaraikelasObject).length > 0) {
        clonedSelTahunTing.addEventListener('change', function () {
          clonedSelKelas.innerHTML = '<option value="">Sila Pilih Kelas</option>';
          const teksTahunTing = this.options[this.selectedIndex].textContent;
          const kelasOptions = senaraikelasObject[this.value] || [];
          kelasOptions.forEach(k => clonedSelKelas.add(new Option(`${teksTahunTing} ${k.Text}`, k.Value)));
        });
        clonedSelTahunTing.dispatchEvent(new Event('change'));
      }

      document.getElementById('btnSegarSemulaDTSbg').addEventListener('click', renderDataTable);
      renderDataTable();
    }

    async function loadDependencies() {
      if (sbgIsolatedJQuery && sbgDataTable) return sbgIsolatedJQuery;
      if (dependenciesLoaded) {
        return new Promise(resolve => {
          const interval = setInterval(() => {
            if (sbgIsolatedJQuery && sbgDataTable) {
              clearInterval(interval);
              resolve(sbgIsolatedJQuery);
            }
          }, 100);
        });
      }
      dependenciesLoaded = true;

      const cssFiles = [
        'https://cdn.datatables.net/2.3.2/css/dataTables.bootstrap4.css',
        'https://cdn.datatables.net/2.3.1/css/dataTables.dataTables.min.css',
        'https://cdn.datatables.net/searchbuilder/1.8.2/css/searchBuilder.dataTables.css',
        'https://cdn.datatables.net/buttons/3.2.3/css/buttons.dataTables.min.css',
        'https://cdn.datatables.net/columncontrol/1.0.3/css/columnControl.dataTables.min.css',
        'https://cdn.datatables.net/columncontrol/1.0.6/css/columnControl.bootstrap4.css',
        'https://cdn.datatables.net/colreorder/2.1.1/css/colReorder.dataTables.min.css',
        'https://cdn.datatables.net/fixedcolumns/5.0.4/css/fixedColumns.dataTables.min.css',
        'https://cdn.datatables.net/datetime/1.5.5/css/dataTables.dateTime.min.css',
      ];
      cssFiles.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      });

      try {
        const jqText = await makeRequest('GET', 'https://code.jquery.com/jquery-3.7.1.min.js', null, 'text');
        const originalJQuery = unsafeWindow.jQuery;
        const original$ = unsafeWindow.$;
        new Function(jqText)();
        const $_ = unsafeWindow.jQuery.noConflict(true);
        sbgIsolatedJQuery = $_;
        unsafeWindow.jQuery = originalJQuery;
        unsafeWindow.$ = original$;

        const scriptsToLoad = [
          'https://cdn.datatables.net/2.3.1/js/dataTables.js',
          'https://cdn.datatables.net/searchbuilder/1.8.2/js/dataTables.searchBuilder.js',
          'https://cdn.datatables.net/searchbuilder/1.8.2/js/searchBuilder.dataTables.js',
          'https://cdn.datatables.net/buttons/3.2.3/js/dataTables.buttons.js',
          'https://cdn.datatables.net/buttons/3.2.3/js/buttons.dataTables.js',
          'https://cdn.datatables.net/buttons/3.2.3/js/buttons.colVis.js',
          'https://cdn.datatables.net/buttons/3.2.3/js/buttons.print.js',
          'https://cdn.datatables.net/buttons/3.2.3/js/buttons.html5.js',
          'https://cdn.datatables.net/columncontrol/1.0.3/js/dataTables.columnControl.js',
          'https://cdn.datatables.net/columncontrol/1.0.6/js/columnControl.dataTables.js',
          'https://cdn.datatables.net/colreorder/2.1.1/js/dataTables.colReorder.js',
          'https://cdn.datatables.net/colreorder/2.1.1/js/colReorder.dataTables.js',
          'https://cdn.datatables.net/fixedcolumns/5.0.4/js/dataTables.fixedColumns.js',
          'https://cdn.datatables.net/datetime/1.5.5/js/dataTables.dateTime.js',
          'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js',
        ];

        for (const scriptUrl of scriptsToLoad) {
          const scriptText = await makeRequest('GET', scriptUrl, null, 'text');
          new Function('jQuery', '$', 'window', 'document', scriptText)($_, $_, unsafeWindow, unsafeWindow.document);
        }

        sbgDataTable = $_.fn.dataTable;
        console.log('All DataTables dependencies loaded and isolated.');
        return $_;
      } catch (error) {
        console.error('Failed to load dependencies:', error);
        throw error;
      }
    }

    function toTitleCase(str) {
      return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function generateDesiredColumnOrderFromSchema(schema, currentPathSegmentsForDataKey = []) {
      let orderedKeys = [];
      for (const keyInSchema in schema) {
        if (Object.prototype.hasOwnProperty.call(schema, keyInSchema)) {
          const newPathSegmentsForDataKey = currentPathSegmentsForDataKey.concat(toTitleCase(keyInSchema));
          const dataKey = newPathSegmentsForDataKey.join('_').toLowerCase().replace(/ /g, '_');

          const value = schema[keyInSchema];
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            orderedKeys = orderedKeys.concat(generateDesiredColumnOrderFromSchema(value, newPathSegmentsForDataKey));
          } else {
            orderedKeys.push(dataKey);
          }
        }
      }
      return orderedKeys;
    }

    function flattenObject(ob, path = []) {
      return Object.entries(ob).reduce((acc, [key, value]) => {
        const newPath = path.concat(toTitleCase(key));
        const dataKey = newPath.join('_').toLowerCase().replace(/ /g, '_');
        const title = newPath.join(' > ');

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(acc, flattenObject(value, newPath));
        } else {
          acc[dataKey] = { value, title };
        }
        return acc;
      }, {});
    }

    function processDataForTable(rawData) {
      if (!rawData || rawData.length === 0) return { columns: [], data: [] };

      const allColumns = new Map();
      const data = rawData.map(student => {
        const flattened = flattenObject(student.maklumat);
        const processedRow = {};

        for (const [key, { value, title }] of Object.entries(flattened)) {
          if (!allColumns.has(key)) {
            allColumns.set(key, { data: key, title: title });
          }
          if (value === false || value === null || value === undefined || value === '') {
            processedRow[key] = null;
          } else if (value === true) {
            processedRow[key] = 'Ya';
          } else if (Array.isArray(value)) {
            processedRow[key] = value
              .map(item => (typeof item === 'object' && item !== null ? Object.values(item).join(', ') : item))
              .join(' | ');
          } else {
            processedRow[key] = String(value);
          }
        }
        return processedRow;
      });

      const columns = Array.from(allColumns.values());
      const DESIRED_COLUMN_ORDER = generateDesiredColumnOrderFromSchema(MAKLUMAT_MURID);

      columns.sort((a, b) => {
        const indexA = DESIRED_COLUMN_ORDER.indexOf(a.data);
        const indexB = DESIRED_COLUMN_ORDER.indexOf(b.data);

        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) {
          return -1;
        }
        if (indexB !== -1) {
          return 1;
        }
        return a.data.localeCompare(b.data);
      });

      columns.forEach(col => {
        col.visible = ['nama_murid', 'nama_kelas', 'nombor_pengenalan', 'umur', 'jantina'].includes(col.data);
        col.defaultContent = '';
      });

      return { columns, data };
    }

    function normalizeIdentityNumber(value) {
      return `${value ?? ''}`.replace(/\D/g, '');
    }

    function pilihNilaiLebihBaik(nilaiSediaAda, nilaiBaharu) {
      if (!nilaiBaharu) return nilaiSediaAda;
      if (!nilaiSediaAda) return nilaiBaharu;
      return nilaiBaharu.length > nilaiSediaAda.length ? nilaiBaharu : nilaiSediaAda;
    }

    function processGuardianDataForTable(rawData) {
      const penjagaMap = new Map();

      const joinDistinctValues = valueSet =>
        Array.from(valueSet)
          .sort((a, b) => a.localeCompare(b, 'ms'))
          .join(', ');

      const daftarPenjaga = (penjaga, student, jenisPenjaga, indexPenjaga) => {
        if (!penjaga || typeof penjaga !== 'object') return;

        const namaPenjaga = penjaga.nama ? String(penjaga.nama).trim() : '';
        const noKpPenjaga = penjaga.nombor_pengenalan ? String(penjaga.nombor_pengenalan).trim() : '';
        const telefonPenjaga = penjaga.telefon ? String(penjaga.telefon).trim() : '';
        const jantinaPenjaga = penjaga.jantina ? String(penjaga.jantina).trim() : '';
        const hubunganPenjaga =
          penjaga.hubungan_dengan_anak_jagaan ? String(penjaga.hubungan_dengan_anak_jagaan).trim() : '';

        if (!namaPenjaga && !noKpPenjaga && !telefonPenjaga && !jantinaPenjaga && !hubunganPenjaga) return;

        const identitiPenjaga = normalizeIdentityNumber(noKpPenjaga);
        const kunciPenjaga =
          identitiPenjaga || `tanpa-kp:${jenisPenjaga}:${student.id_moeis || student.nama || 'murid'}:${indexPenjaga}`;
        const namaMurid = student?.maklumat?.nama_murid || student?.nama || '';
        const namaKelas = student?.maklumat?.nama_kelas || student?.kelas || '';
        const labelMurid = namaKelas ? `${namaMurid} (${namaKelas})` : namaMurid;

        if (!penjagaMap.has(kunciPenjaga)) {
          penjagaMap.set(kunciPenjaga, {
            nama_penjaga: namaPenjaga || null,
            jantina_penjaga_set: new Set(),
            hubungan_dengan_anak_jagaan_set: new Set(),
            no_kp: noKpPenjaga || null,
            telefon: telefonPenjaga || null,
            murid_jagaan_set: new Set(),
          });
        }

        const rekodPenjaga = penjagaMap.get(kunciPenjaga);
        rekodPenjaga.nama_penjaga = pilihNilaiLebihBaik(rekodPenjaga.nama_penjaga, namaPenjaga) || null;
        rekodPenjaga.no_kp = pilihNilaiLebihBaik(rekodPenjaga.no_kp, noKpPenjaga) || null;
        rekodPenjaga.telefon = pilihNilaiLebihBaik(rekodPenjaga.telefon, telefonPenjaga) || null;
        if (jantinaPenjaga) {
          rekodPenjaga.jantina_penjaga_set.add(jantinaPenjaga);
        }
        if (hubunganPenjaga) {
          rekodPenjaga.hubungan_dengan_anak_jagaan_set.add(hubunganPenjaga);
        }
        if (labelMurid) {
          rekodPenjaga.murid_jagaan_set.add(labelMurid);
        }
      };

      rawData.forEach((student, studentIndex) => {
        const penjagaUtama = student?.maklumat?.penjaga?.penjaga_utama;
        const penjagaKedua = student?.maklumat?.penjaga?.penjaga_kedua;

        daftarPenjaga(penjagaUtama, student, 'utama', `${studentIndex}-1`);
        daftarPenjaga(penjagaKedua, student, 'kedua', `${studentIndex}-2`);
      });

      const columns = [
        {
          data: 'nama_penjaga',
          title: 'Nama Penjaga',
          visible: true,
          defaultContent: '',
          width: '20%',
          className: 'sbg-col-penjaga-nama',
        },
        {
          data: 'jantina_penjaga',
          title: 'Jantina',
          visible: true,
          defaultContent: '',
          width: '8%',
          className: 'sbg-col-jantina-penjaga',
        },
        {
          data: 'hubungan_dengan_anak_jagaan',
          title: 'Hubungan',
          visible: true,
          defaultContent: '',
          width: '10%',
          className: 'sbg-col-hubungan-penjaga',
        },
        {
          data: 'no_kp',
          title: 'No KP',
          visible: true,
          defaultContent: '',
          width: '100px',
          className: 'sbg-col-no-kp',
        },
        {
          data: 'telefon',
          title: 'Telefon',
          visible: true,
          defaultContent: '',
          width: '100px',
          className: 'sbg-col-telefon',
        },
        {
          data: 'murid_jagaan',
          title: 'Murid Jagaan',
          visible: true,
          defaultContent: '',
          width: '40%',
          className: 'sbg-col-murid-jagaan',
        },
      ];

      const data = Array.from(penjagaMap.values())
        .map(rekod => ({
          nama_penjaga: rekod.nama_penjaga,
          jantina_penjaga: joinDistinctValues(rekod.jantina_penjaga_set) || null,
          hubungan_dengan_anak_jagaan: joinDistinctValues(rekod.hubungan_dengan_anak_jagaan_set) || null,
          no_kp: rekod.no_kp,
          telefon: rekod.telefon,
          murid_jagaan: joinDistinctValues(rekod.murid_jagaan_set) || null,
        }))
        .sort((a, b) => {
          const namaA = a.nama_penjaga || '';
          const namaB = b.nama_penjaga || '';
          const perbandinganNama = namaA.localeCompare(namaB, 'ms');
          if (perbandinganNama !== 0) return perbandinganNama;
          return (a.no_kp || '').localeCompare(b.no_kp || '', 'ms');
        });

      return { columns, data };
    }

    function getViewportAwareScrollHeight(host) {
      const hostRect = host.getBoundingClientRect();
      const ruangBawah = Math.max(window.innerHeight - hostRect.top - 140, 280);
      return Math.round(ruangBawah);
    }

    function applyViewportHeightToTables(host) {
      if (!host) return;
      const scrollHeight = `${getViewportAwareScrollHeight(host)}px`;
      host.querySelectorAll('.dt-scroll-body').forEach(scrollBody => {
        scrollBody.style.height = scrollHeight;
        scrollBody.style.maxHeight = scrollHeight;
      });
    }

    function refreshVisibleDataTableLayout(instance, host) {
      applyViewportHeightToTables(host);
      if (!instance || !host) return;

      const tableApi = typeof instance.table === 'function' ? instance.table() : null;
      const tableNode = typeof tableApi?.node === 'function' ? tableApi.node() : null;
      const containerNode = typeof tableApi?.container === 'function' ? tableApi.container() : null;

      if (!(tableNode instanceof Element) || !(containerNode instanceof Element)) return;
      if (!tableNode.isConnected || !containerNode.isConnected) return;

      const pane = tableNode.closest('.sbg-datatables-tab-pane');
      if (pane && !pane.classList.contains('active')) return;

      if (typeof instance.columns?.adjust === 'function') {
        instance.columns.adjust();
      }
      if (typeof instance.fixedColumns === 'function') {
        const fixedColumnsApi = instance.fixedColumns();
        if (typeof fixedColumnsApi?.relayout === 'function') {
          fixedColumnsApi.relayout();
        }
      }
      if (typeof instance.draw === 'function') {
        instance.draw(false);
      }
    }

    function scheduleVisibleDataTableLayout(instance, host) {
      if (pendingDataTableLayoutFrame !== null) {
        cancelAnimationFrame(pendingDataTableLayoutFrame);
        pendingDataTableLayoutFrame = null;
      }

      pendingDataTableLayoutFrame = requestAnimationFrame(() => {
        pendingDataTableLayoutFrame = null;
        refreshVisibleDataTableLayout(instance, host);
      });
    }

    function ensureViewportResizeHandler() {
      if (viewportResizeHandlerRegistered) return;
      window.addEventListener('resize', () => {
        const host = document.getElementById('sbg-datatable-host');
        if (!host) return;
        applyViewportHeightToTables(host);

        const activeInstance = dataTableInstances[activeDataTableTab];
        if (activeInstance) {
          scheduleVisibleDataTableLayout(activeInstance, host);
        }
      });
      viewportResizeHandlerRegistered = true;
    }

    function createSharedDataTable($_, tableElement, columns, data, host, extraOptions = {}) {
      return $_(tableElement).DataTable({
        data,
        columns,
        autoWidth: true,
        paging: false,
        scrollX: true,
        scrollY: getViewportAwareScrollHeight(host),
        pageLength: 25,
        ordering: { handler: false, indicators: false },
        fixedColumns: {
          start: 1,
        },
        stateSave: true,
        layout: {
          topStart: {
            buttons: [
              {
                extend: 'colvis',
                columns: ':not(.always-visible)',
                className: 'btn-primary',
                columnText: (dt, idx, title) => {
                  const colvisColumns = dt.columns(':not(.always-visible)').indexes().toArray();
                  const buttonIndex = colvisColumns.indexOf(idx);
                  return `${buttonIndex + 1}) ${title}`;
                },
              },
              {
                extend: 'searchBuilder',
                config: {
                  columns: ':not(.always-visible)',
                },
              },
            ],
          },
          topEnd: ['buttons'],
          bottomStart: 'info',
          bottomEnd: {
            buttons: [{ extend: 'ccSearchClear', text: 'Padam semua carian' }],
          },
        },
        language: {
          url: 'https://cdn.datatables.net/plug-ins/2.3.1/i18n/ms.json',
          searchBuilder: {
            clearAll: 'Reset',
            title: {
              0: 'Binaan Kriteria',
              1: 'Binaan Kriteria (%d)',
              _: 'Binaan Kriteria (%d)',
            },
            button: {
              0: 'Kriteria Carian',
              1: 'Kriteria Carian (%d)',
              _: 'Kriteria Carian (%d)',
            },
          },
        },
        columnDefs: [
          {
            targets: 0,
            className: 'always-visible',
          },
        ],
        columnControl: [
          {
            target: 'thead:0',
            content: [
              'order',
              [
                'orderAsc',
                'orderDesc',
                'spacer',
                'orderAddAsc',
                'orderAddDesc',
                'spacer',
                'orderRemove',
                'spacer',
                'reorderLeft',
                'reorderRight',
              ],
            ],
          },
          {
            target: 'thead:1',
            content: ['search', ['searchList']],
          },
        ],
        buttons: [
          {
            extend: 'excelHtml5',
            text: 'Excel',
            className: 'btn-success',
            exportOptions: { columns: ':visible' },
          },
          {
            extend: 'copyHtml5',
            text: 'Salin',
            className: 'btn-primary',
            exportOptions: { columns: ':visible' },
          },
          {
            extend: 'print',
            text: 'Cetak',
            className: 'btn-warning',
            exportOptions: { columns: ':visible' },
          },
          {
            extend: 'pdfHtml5',
            text: 'PDF',
            className: 'btn-danger',
            exportOptions: { columns: ':visible' },
            orientation: 'portrait',
          },
        ],
        ...extraOptions,
      });
    }

    async function handlePadamProfilTerkumpul() {
      const confirmDelete = window.confirm(
        'Padamkan Profil Terkumpul?\n\nPadamkan keseluruhan data profil murid yang terkumpul dalam sesi pelayar (browser) ini?',
      );

      if (!confirmDelete) {
        return;
      }

      try {
        await GM.deleteValue('semuaProfilMuridSBG');
        semuaProfilMuridGlobal = [];

        await notifyUser(
          'Data profil murid terkumpul telah dipadamkan. Anda boleh mengumpul profil murid semula dalam sesi pelayar baharu.',
          'Padam Berjaya',
          false,
          false,
          4000,
        );

        renderDataTable();
      } catch (error) {
        console.error('Ralat semasa memadamkan profil cache:', error);
        await notifyUser('Gagal memadamkan data profil cache. Sila semak konsol.', 'Ralat', true, true);
      }
    }

    async function renderDataTable() {
      const host = document.getElementById('sbg-datatable-host');
      if (!host) return;

      if (pendingDataTableLayoutFrame !== null) {
        cancelAnimationFrame(pendingDataTableLayoutFrame);
        pendingDataTableLayoutFrame = null;
      }

      Object.values(dataTableInstances).forEach(instance => {
        if (instance?.destroy) {
          instance.destroy();
        }
      });
      dataTableInstances = {};
      host.innerHTML = '';

      let $_;
      try {
        $_ = await loadDependencies();
      } catch (error) {
        host.innerHTML = `<p style="color:red;">Gagal memuatkan sumber-sumber yang diperlukan untuk jadual. Sila semak konsol.</p>`;
        console.error('Dependency loading failed:', error);
        return;
      }

      semuaProfilMuridGlobal = await getStoredData('semuaProfilMuridSBG', []);
      if (semuaProfilMuridGlobal.length === 0) {
        host.innerHTML =
          '<p class="text-center">Tiada maklumat profil untuk dipaparkan. Sila kumpul profil murid terlebih dahulu.</p><div style="margin-top: 15px; text-align: center;"><button id="sbgPadamProfilTerkumpulBtn" class="btn btn-danger" style="display: none;">Padam Profil Terkumpul</button></div>';
        return;
      }

      const { columns: dynamicColumns, data } = processDataForTable(semuaProfilMuridGlobal);
      const { columns: guardianColumns, data: guardianData } = processGuardianDataForTable(semuaProfilMuridGlobal);

      host.innerHTML = /*html*/ `
        <div class="sbg-datatables-shell">
          <div class="sbg-datatables-tabs">
            <div class="sbg-datatables-tab-headers" role="tablist" aria-label="Jadual analisis profil murid">
              <button type="button" class="sbg-datatables-tab-button" data-sbg-tab="semua-maklumat-murid">Semua Maklumat Murid</button>
              <button type="button" class="sbg-datatables-tab-button" data-sbg-tab="senarai-penjaga">Senarai Penjaga</button>
            </div>
            <div class="sbg-datatables-tab-pane" data-sbg-pane="semua-maklumat-murid">
              <table id="jadualProfilMuridSBG" class="table table-striped table-bordered display responsive nowrap" style="width:100%"></table>
            </div>
            <div class="sbg-datatables-tab-pane" data-sbg-pane="senarai-penjaga">
              <table id="jadualSenaraiPenjagaSBG" class="table table-striped table-bordered display responsive nowrap" style="width:100%"></table>
            </div>
          </div>
        </div>
        <div style="margin-top: 15px; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
          <button id="sbgPadamProfilTerkumpulBtn" class="btn btn-danger">Padam Profil Terkumpul</button>
        </div>`;

      const tabButtons = Array.from(host.querySelectorAll('.sbg-datatables-tab-button'));
      const tabPanes = Array.from(host.querySelectorAll('.sbg-datatables-tab-pane'));

      const initializeTableByTab = tabKey => {
        if (dataTableInstances[tabKey]) return dataTableInstances[tabKey];

        if (tabKey === 'senarai-penjaga') {
          const guardianTable = host.querySelector('#jadualSenaraiPenjagaSBG');
          dataTableInstances[tabKey] = createSharedDataTable($_, guardianTable, guardianColumns, guardianData, host, {
            autoWidth: false,
          });
        } else {
          const studentTable = host.querySelector('#jadualProfilMuridSBG');
          dataTableInstances[tabKey] = createSharedDataTable($_, studentTable, dynamicColumns, data, host);
        }

        scheduleVisibleDataTableLayout(dataTableInstances[tabKey], host);
        return dataTableInstances[tabKey];
      };

      const activateTab = tabKey => {
        activeDataTableTab = tabKey;

        tabButtons.forEach(button => {
          button.classList.toggle('active', button.dataset.sbgTab === tabKey);
        });
        tabPanes.forEach(pane => {
          pane.classList.toggle('active', pane.dataset.sbgPane === tabKey);
        });

        const instance = initializeTableByTab(tabKey);
        scheduleVisibleDataTableLayout(instance, host);
      };

      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          activateTab(button.dataset.sbgTab);
        });
      });

      const deleteBtn = host.querySelector('#sbgPadamProfilTerkumpulBtn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', handlePadamProfilTerkumpul);
      }

      ensureViewportResizeHandler();
      activateTab(activeDataTableTab === 'senarai-penjaga' ? 'senarai-penjaga' : 'semua-maklumat-murid');
    }

    async function getStoredData(key, defaultValue = []) {
      const rawData = await GM.getValue(key, JSON.stringify(defaultValue));
      try {
        return JSON.parse(rawData);
      } catch {
        return defaultValue;
      }
    }

    async function setStoredData(key, value) {
      await GM.setValue(key, JSON.stringify(value));
    }

    const showLoading = (id, text, orig) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = true;
        btn.dataset.originalText = orig;
        btn.innerHTML = `<span class="userscript-spinner"></span> ${text}`;
      }
    };

    const hideLoading = id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText || '';
      }
    };

    async function notifyUser(message, title = 'Skrip MOEISPEL') {
      GM.notification({ text: message, title, timeout: 4000 });
    }

    async function initializeScript() {
      const observerTargetNode = document.querySelector('section.card');
      if (!observerTargetNode) {
        setTimeout(initializeScript, 1000);
        return;
      }

      let observer = null;
      let fallbackTimeoutId = null;

      const tryBuildAndCleanup = async obsToDisconnect => {
        if (document.querySelector('.tab-container-sbg')) {
          if (obsToDisconnect) {
            obsToDisconnect.disconnect();
          }
          if (fallbackTimeoutId) {
            clearTimeout(fallbackTimeoutId);
            fallbackTimeoutId = null;
          }
          return true;
        }

        const targetElement = document.querySelector('section.card > div > div.cui-utils-title.head_underline');
        if (!targetElement) {
          return false;
        }

        const labelBahagian = targetElement.textContent?.toUpperCase();
        if (labelBahagian) {
          const isSenaraiMurid = labelBahagian.includes('SENARAI MURID');
          const isKelasSaya = labelBahagian.includes('KELAS SAYA');

          if (isSenaraiMurid || isKelasSaya) {
            if (isKelasSaya) {
              isGuruKelas = true;
              const modalKelasSayaLink = document.querySelector("a[data-target='#modalKelasSaya']");
              if (modalKelasSayaLink) {
                const kelasSayaId = modalKelasSayaLink.getAttribute('data-id');
                if (kelasSayaId) {
                  const url = `https://moeispel.moe.gov.my/kurikulum/pengurusankelas/kelassaya/paparsemua/${kelasSayaId}`;
                  const responseHtml = await makeRequest('GET', url, null, 'text');
                  const cardBody = document.querySelector('div.card-body');
                  if (cardBody) {
                    const tableContainerDiv = document.createElement('div');
                    tableContainerDiv.className = 'col-lg-12';

                    const tempDoc = new DOMParser().parseFromString(responseHtml, 'text/html');
                    const originalTable = tempDoc.getElementById('tbl_senarai');
                    if (originalTable) {
                      const newTable = document.createElement('table');
                      newTable.className = 'table editable-table table-striped table-bordered';
                      newTable.id = 'tbl_senarai_filtered';
                      newTable.style.width = '100%';

                      const newThead = document.createElement('thead');
                      const newTbody = document.createElement('tbody');

                      const headerRow = document.createElement('tr');
                      headerRow.innerHTML = `<th>Nama</th><th>MyKad</th>`;
                      newThead.appendChild(headerRow);
                      newTable.appendChild(newThead);

                      const originalRows = originalTable.querySelectorAll('tbody tr');
                      originalRows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 4) {
                          const newRow = document.createElement('tr');

                          const namaCell = document.createElement('td');
                          namaCell.appendChild(cells[2].querySelector('form').cloneNode(true));
                          newRow.appendChild(namaCell);

                          const noKpCell = document.createElement('td');
                          const nomborKP = cells[3].textContent;
                          noKpCell.innerHTML =
                            /^\d{12}$/.test(nomborKP) ?
                              nomborKP.replace(/(\d{6})(\d{2})(\d{4})/, '$1-$2-$3')
                            : nomborKP;
                          newRow.appendChild(noKpCell);

                          newTbody.appendChild(newRow);
                        }
                      });

                      newTable.appendChild(newTbody);
                      tableContainerDiv.appendChild(newTable);
                      cardBody.appendChild(tableContainerDiv);

                      const NAMA_SEKOLAH = document.querySelectorAll('span.first_head')?.[0]?.textContent?.trim() ?? '';
                      const NAMA_KELAS =
                        document
                          .querySelector('div.div-kelas.label-thnting > div.text-white')
                          .textContent.split('\n\n')[1]
                          .trim() +
                          ' ' +
                          document.querySelector('div.div-kelas.label-namakelas > div > a').textContent.trim() || '';

                      $('#tbl_senarai_filtered').DataTable({
                        order: [[0, 'asc']],
                        paging: false,
                        searching: false,
                        ordering: { handler: true, indicators: true },
                        info: true,
                        responsive: true,
                        language: {
                          url: 'https://cdn.datatables.net/plug-ins/2.3.1/i18n/ms.json',
                        },
                        buttons: [
                          {
                            extend: 'excelHtml5',
                            text: 'Excel',
                            className: 'btn-success',
                            exportOptions: { columns: ':visible' },
                            title: NAMA_KELAS,
                            messageTop: NAMA_SEKOLAH,
                          },
                          {
                            extend: 'copyHtml5',
                            text: 'Salin',
                            className: 'btn-info',
                            exportOptions: { columns: ':visible' },
                            title: NAMA_KELAS,
                            messageTop: NAMA_SEKOLAH,
                          },
                          {
                            extend: 'pdfHtml5',
                            text: 'PDF',
                            className: 'btn-danger',
                            exportOptions: { columns: ':visible' },
                            orientation: 'portrait',
                            title: NAMA_KELAS,
                            messageTop: NAMA_SEKOLAH,
                          },
                          {
                            extend: 'print',
                            text: 'Cetak',
                            className: 'btn-warning',
                            exportOptions: { columns: ':visible' },
                            title: NAMA_KELAS,
                            messageTop: NAMA_SEKOLAH,
                          },
                        ],
                        dom: 'tBi',
                      });
                    }
                  }
                }
              }
            }
            binaBhgnAnalisisProfil();

            if (obsToDisconnect) {
              obsToDisconnect.disconnect();
            }
            if (fallbackTimeoutId) {
              clearTimeout(fallbackTimeoutId);
              fallbackTimeoutId = null;
            }
            return true;
          }
        }
        return false;
      };

      if (await tryBuildAndCleanup(null)) {
        return;
      }

      observer = new MutationObserver(async (_mutationsList, obs) => {
        await tryBuildAndCleanup(obs);
      });

      observer.observe(observerTargetNode, { childList: true, subtree: true });

      fallbackTimeoutId = setTimeout(async () => {
        const currentObserverInstance = observer;
        observer = null;

        if (currentObserverInstance) {
          if (!(await tryBuildAndCleanup(currentObserverInstance))) {
            if (typeof currentObserverInstance.disconnect === 'function') {
              currentObserverInstance.disconnect();
            }
          }
        } else {
          await tryBuildAndCleanup(null);
        }
        fallbackTimeoutId = null;
      }, 2500);
    }

    initializeScript();
  }
})();
