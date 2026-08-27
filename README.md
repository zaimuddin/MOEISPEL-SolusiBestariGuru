# 🎓 MOEISPEL–SolusiBestariGuru

**Userscript Pintar untuk Pengurusan Kehadiran, Profil Murid dan Senarai Nama di Sistem MOEISPEL KPM**

---

## 📋 Daftar Isi

1. [Tentang Projek](#tentang-projek)
2. [Fitur Utama](#fitur-utama)
3. [Keperluan Sistem & Cara Pemasangan](#keperluan-sistem--cara-pemasangan)
4. [Panduan Penggunaan Lengkap](#panduan-penggunaan-lengkap)
5. [Ciri-Ciri Lanjutan](#ciri-ciri-lanjutan)
6. [Pemecahan Masalah](#pemecahan-masalah)
7. [Privasi & Keselamatan](#privasi--keselamatan)
8. [Penyumbang & Lesen](#penyumbang--lesen)
9. [Hubungi Kami](#hubungi-kami)

---

## 🎯 Tentang Projek

**MOEISPEL–SolusiBestariGuru** ialah userscript inovatif yang dirancang khusus untuk memudahkan guru-guru di seluruh Malaysia dalam mengurusan sistem MOEISPEL (Ministry of Education Information System for Teachers and Learning).

### Latar Belakang

Sistem MOEISPEL merupakan platform yang digunakan oleh Kementerian Pendidikan Malaysia (KPM) untuk pengurusan maklumat pendidikan. Userscript ini membantu guru-guru untuk:

- 📊 Mengurus kehadiran pelajar dengan lebih efisien
- 👥 Mengakses maklumat profil pelajar dengan mudah
- 📁 Memuat turun senarai nama pelajar dalam pelbagai format

Dengan fitur-fitur canggih seperti cache otomatis, notifikasi pintar, dan antara muka yang mesra pengguna, userscript ini menghemat masa dan mengurangkan kerja manual guru-guru.

---

## ⭐ Fitur Utama

### 1️⃣ **Kumpul Kehadiran Harian/Mingguan**

Fitur ini membolehkan guru untuk mengurus dan mengumpul data kehadiran pelajar dengan cepat dan tepat.

**Keupayaan:**
- ✅ Tanda kehadiran harian secara spontan
- ✅ Lihat laporan kehadiran mingguan dan bulanan
- ✅ Kemampuan untuk membuat perubahan (jika diperlukan)
- ✅ Notifikasi otomatis untuk data yang belum lengkap
- ✅ Sistem cache lokal untuk akses pantas
- ✅ Tanda sistem untuk kehadiran, sakit, dan tidak hadir

**Cara Penggunaan:**
1. Navigasi ke halaman kehadiran di MOEISPEL
2. Klik butang **"Kumpul Kehadiran"** yang akan muncul
3. Pilih tarikh yang ingin diperiksa
4. Data akan dikumpulkan dan disimpan di cache lokal

---

### 2️⃣ **Ekstrak Maklumat Profil Murid**

Fitur ini memudahkan guru mengakses dan mengekstrak maklumat terperinci tentang setiap pelajar.

**Keupayaan:**
- ✅ Papar nama penuh, nombor matrik, dan kelas pelajar
- ✅ Lihat maklumat perhubungan (No. Telefon Ibu Bapa/Penjaga)
- ✅ Akses maklumat kebersihan dan kesihatan pelajar
- ✅ Ekstrak data dalam pelbagai format (CSV, PDF, JSON)
- ✅ Carian pantas berdasarkan nama atau nombor matrik
- ✅ Filter mengikut kelas, kehadiran, atau status lain

**Cara Penggunaan:**
1. Buka halaman profil pelajar di MOEISPEL
2. Pilih pelajar yang ingin diperiksa maklumatnya
3. Klik butang **"Ekstrak Maklumat"** yang tersedia
4. Pilih format yang diingini (CSV, PDF, Excel)
5. Data akan dimuat turun dengan format yang dipilih

---

### 3️⃣ **Muat Turun Senarai Nama**

Fitur ini membolehkan guru memuat turun senarai nama pelajar dalam pelbagai format dan pilihan.

**Keupayaan:**
- ✅ Muat turun senarai nama dalam format Excel (.xlsx)
- ✅ Muat turun dalam format CSV untuk kebolehan ubahan
- ✅ Pilihan untuk muat turun mengikut kelas atau keseluruhan
- ✅ Sertakan atau asingkan maklumat perhubungan
- ✅ Susun senarai mengikut abjad, nombor matrik, atau kelas
- ✅ Pilihan untuk mengemas kini atau menambah lajur tambahan

**Cara Penggunaan:**
1. Dari halaman utama MOEISPEL, klik **"Muat Turun Senarai Nama"**
2. Pilih:
   - Kelas yang ingin diambil (atau semua kelas)
   - Format fail (Excel, CSV, PDF)
   - Maklumat tambahan yang diperlukan
3. Klik **"Mula Muat Turun"**
4. Fail akan dimuat turun ke folder download komputer anda

---

## 🛠️ Keperluan Sistem & Cara Pemasangan

### Keperluan Minimum

- **Pelayar Web:** Chrome, Firefox, Edge, Safari (versi terkini)
- **Sistem Pengurusan Userscript:** Tampermonkey atau Violentmonkey
- **Sambungan Internet:** Stabil untuk akses MOEISPEL
- **Akaun MOEISPEL:** Akaun guru yang sah dari KPM

### Langkah Pemasangan Terperinci

#### **Langkah 1: Pasang Pengurus Userscript**

Pilih salah satu:

**Untuk Chrome/Edge:**
1. Lawati [Tampermonkey Chrome Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobela)
2. Klik **"Add to Chrome"**
3. Sahkan penambahan

**Untuk Firefox:**
1. Lawati [Tampermonkey Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)
2. Klik **"Add to Firefox"**
3. Sahkan penambahan

**Untuk Safari:**
1. Lawati [Tampermonkey App Store](https://apps.apple.com/app/tampermonkey/id1482490089)
2. Pasang melalui App Store

---

#### **Langkah 2: Pasang MOEISPEL–SolusiBestariGuru**

**Kaedah A: Pemasangan Automatik**

1. Klik pautan ini: [Pasang SolusiBestariGuru](https://raw.githubusercontent.com/zaimuddin/MOEISPEL-SolusiBestariGuru/main/MOEISPEL-SolusiBestariGuru.user.js)
2. Tampermonkey akan menunjukkan tetingkap pemasangan
3. Klik **"Install"** untuk mengesahkan
4. Userscript akan aktif serta-merta

**Kaedah B: Pemasangan Manual**

1. Buka [Repository GitHub](https://github.com/zaimuddin/MOEISPEL-SolusiBestariGuru)
2. Klik fail `MOEISPEL-SolusiBestariGuru.user.js`
3. Salin semua kod (Ctrl+A, Ctrl+C)
4. Di Tampermonkey, buat script baru
5. Tampal kod dan simpan
6. Tutup Tampermonkey

---

#### **Langkah 3: Sahkan Pemasangan**

1. Bukak [MOEISPEL](https://moeispel.moe.gov.my)
2. Log masuk dengan akaun guru anda
3. Pastikan anda dapat melihat butang-butang baru:
   - 🎯 Tombol "Kumpul Kehadiran"
   - 📊 Tombol "Ekstrak Maklumat"
   - 📥 Tombol "Muat Turun Senarai Nama"
4. Jika butang tidak muncul, tunggu 2-3 saat dan muat semula halaman (F5)

---

## 📖 Panduan Penggunaan Lengkap

### Mengurus Kehadiran Harian

**Senario:** Anda ingin merekodkan kehadiran kelas anda hari ini.

1. Log masuk ke MOEISPEL
2. Navigasi ke **Kehadiran → Kelas Anda**
3. Tekan butang **"Kumpul Kehadiran"** (berwarna biru)
4. Pilih tarikh: 
   - Ambil tarikh hari ini secara automatik
   - Atau pilih tarikh lain dari kalender
5. Sistem akan memaparkan senarai pelajar:
   - ✅ untuk Hadir
   - 🏥 untuk Sakit
   - ❌ untuk Tidak Hadir
6. Ubah status mengikut keperluan dengan mengklik nama pelajar
7. Klik **"Simpan Kehadiran"** untuk menyimpan

**Tip Pantas:**
- Gunakan pintasan keyboard: `S` untuk Sakit, `H` untuk Hadir, `T` untuk Tidak Hadir
- Tekan `Ctrl+S` untuk simpan pantas
- Sistem secara automatik menyimpan draf setiap 30 saat

---

### Mengekstrak Maklumat Profil

**Senario:** Anda perlukan maklumat hubungan semua pelajar untuk keperluan projek.

1. Pergi ke halaman **Profil Pelajar**
2. Klik butang **"Ekstrak Maklumat"** (berwarna hijau)
3. Tetapan akan muncul:
   - Pilih maklumat yang diperlukan (nama, no. matrik, kelas, no. telefon, dll)
   - Pilih format output: Excel, CSV, atau PDF
   - Pilih kelas atau semua pelajar
4. Klik **"Mula Ekstrak"**
5. Data akan dimproses dan dimuat turun

**Format Output:**
- **Excel (.xlsx):** Sempurna untuk editing dan penggunaan lanjutan
- **CSV:** Untuk import ke aplikasi lain
- **PDF:** Untuk cetakan profesional

---

### Memuat Turun Senarai Nama

**Senario:** Anda perlu menyediakan senarai nama pelajar untuk aktiviti pengajaran dan pembelajaran.

1. Dari halaman utama MOEISPEL, klik **"Muat Turun Senarai Nama"** (berwarna jingga)
2. Tetapan Muka Depan akan terbuka:
   - **Pilih Kelas:** Satu kelas atau semua kelas?
   - **Format:** Excel atau CSV?
   - **Urutan:** Abjad, no. matrik, atau kelas?
   - **Maklumat Tambahan:** Kiriman No. Telefon? Alamat?
3. Klik **"Mula Muat Turun"**
4. Semak folder "Downloads" anda untuk fail baru

**Contoh Nama Fail:**
- `Senarai_Nama_2H_20260825.xlsx`
- `Senarai_Nama_Semua_Kelas_20260825.csv`

---

## 🚀 Ciri-Ciri Lanjutan

### Sistem Cache Pintar

Userscript ini menggunakan sistem cache lokal yang canggih:

- **Cache Data:** Maklumat pelajar dan kehadiran disimpan untuk akses pantas
- **Sinkronisasi Automatik:** Cache diperbarui setiap kali anda melawat halaman
- **Pengurangan Beban:** Mengurangkan beban pada server MOEISPEL
- **Akses Luring:** Akses data lepas walaupun sambungan sesaat terputus

**Menguruskan Cache:**
- Kosongkan cache: Klik ⚙️ Tetapan → Padam Cache
- Paksakan penyegarkan: Tekan `Ctrl+Shift+R` di halaman MOEISPEL

---

### Pengurusan Tarikh Cuti

Userscript ini secara automatik mengenali tarikh cuti dan hujung minggu:

- 🏖️ **Hari Cuti Umum:** Tidak benarkan pencatatan kehadiran
- 🏫 **Hujung Minggu:** Sistem mencegah kekeliruan
- 📅 **Cuti Sekolah:** Dipaparkan dalam kalender
- ⚠️ **Amaran:** Papar notifikasi jika anda mencuba memasukkan data pada hari cuti

**Konfigurasi Cuti:**
Anda boleh menambah cuti khusus atau hari persekolahan melalui tetapan (⚙️):
1. Klik ⚙️ **Tetapan**
2. Pilih **Pengurusan Tarikh Cuti**
3. Tambah atau buang tarikh mengikut perlu

---

### Sistem Notifikasi Pintar

Dapatkan pemberitahuan penting dalam masa nyata:

- 🔔 **Kehadiran Tidak Lengkap:** Amaran untuk kelas yang belum merekodkan kehadiran
- ✅ **Berjaya Simpan:** Pengesahan apabila data berjaya disimpan
- ⚠️ **Ralat Sistem:** Amaran jika terdapat masalah semasa upload
- 💾 **Draft Disimpan:** Pemberitahuan ketika draf secara automatik disimpan

**Menyesuaikan Notifikasi:**
1. Buka tetapan userscript (Tampermonkey → ⚙️)
2. Taipkan notifikasi yang ingin diterima/dimatikan
3. Tetapkan bunyi atau senyap untuk setiap jenis notifikasi

---

### Carian dan Penapis Maju

Cari pelajar dan data dengan mudah:

- 🔍 **Carian Real-time:** Taip nama atau no. matrik untuk carian pantas
- 🏷️ **Penapis Dinamik:** Saring mengikut kelas, kehadiran, atau status
- 📊 **Pengurutan Pelbagai:** Susun mengikut berbagai kriteria
- 💾 **Simpan Penapis:** Ingat tetapan penapis kegemaran anda

---

### Sokongan untuk Pelbagai Format Export

Semua data boleh dieksport dalam format:

- 📊 **Excel (.xlsx):** Dengan format warna dan formula
- 📄 **CSV:** Untuk kompatibilitas universal
- 📑 **PDF:** Untuk cetakan profesional
- 🔗 **JSON:** Untuk integrasi sistem lain

---

## 🔧 Pemecahan Masalah

### Butang Tidak Muncul

**Masalah:** Anda tidak melihat butang-butang userscript di MOEISPEL.

**Solusi:**
1. Periksa bahawa Tampermonkey terpasang dan aktif
2. Buka halaman halaman MOEISPEL semula (tekan F5)
3. Tunggu 3-5 saat untuk skrip dimuat sepenuhnya
4. Buka Konsol Browser (F12) dan periksa untuk ralat
5. Cuba matikan awal Caching (Tetapan → Keluarkan Cache)
6. Pasang semula userscript jika masalah berterusan

---

### Data Kehadiran Tidak Simpan

**Masalah:** Anda masukkan data kehadiran tetapi tidak muncul di sistem.

**Solusi:**
1. Periksa sambungan internet anda
2. Pastikan anda log masuk dengan akaun yang betul
3. Buka Konsol Browser (F12) dan cari mesej ralat merah
4. Periksa bahawa token CSRF masih sah (log keluar dan log masuk semula)
5. Jika ralat "Session Expired", log masuk semula ke MOEISPEL
6. Tunggu 10 saat dan cuba lagi

**Mesej Ralat Biasa:**
- "HTML response (bukan JSON)" → Kemungkinan session tamat, log masuk semula
- "Endpoint tidak ditemui (404)" → Halaman mungkin berubah, hubungi sokongan
- "Server error (500)" → Masalah pelayar, coba nanti

---

### Fail Muat Turun Rosak

**Masalah:** Fail Excel atau CSV yang dimuat turun tidak dapat dibuka atau data hilang.

**Solusi:**
1. Pastikan anda menggunakan pelayar terkini (Chrome/Edge versi terbaru)
2. Cuba muat turun dalam format berbeza (CSV bukan Excel, atau sebaliknya)
3. Periksa folder "Downloads" untuk fail temporer
4. Bersihkan cache pelayar (Ctrl+Shift+Delete)
5. Pasang semula userscript

---

### Sistem Perlahan atau Beku

**Masalah:** MOEISPEL menjadi perlahan atau beku selepas menggunakan userscript.

**Solusi:**
1. Kosongkan cache userscript: Tetapan → Padam Cache Semua
2. Kurangkan data cache: Tetapan → Saiz Cache Maksimum (pilih nilai lebih kecil)
3. Pastikan hanya 1 tab MOEISPEL yang terbuka
4. Tutup dan buka semula pelayar
5. Kurangkan bilangan pelajar dalam satu proses ekstrak
6. Jika masalah berterusan, matikan cache sementara

---

### Notifikasi Tidak Muncul

**Masalah:** Anda tidak menerima notifikasi dari userscript.

**Solusi:**
1. Periksa tetapan notifikasi: Tetapan → Notifikasi
2. Pastikan notifikasi untuk userscript tidak dimatikan di pelayar
3. Buka Konsol Browser dan periksa untuk ralat
4. Pasang semula Tampermonkey
5. Coba di tab/pelayar lain untuk mengesahkan

---

### Sokongan Lanjutan

Jika masalah belum diselesaikan:
1. Ambil tangkapan skrin untuk membantu diagnosis
2. Buka Konsol Browser (F12) dan salin mesej ralat
3. Hubungi saluran sokongan telegram (lihat di bawah)

---

## 🔐 Privasi & Keselamatan

### Perlindungan Data Pelajar

Kami mengambil privasi dan keselamatan data pelajar dengan sangat serius:

**Komitmen Kami:**
- ✅ **Tiada Pengumpulan Data:** Kami tidak mengumpulkan atau menyimpan data pelajar di pelayan kami
- ✅ **Penyimpanan Lokal:** Semua data disimpan hanya di komputer anda
- ✅ **Tiada Penghantaran:** Data tidak dihantar ke mana-mana kecuali ke MOEISPEL KPM
- ✅ **Kod Terbuka:** Kod userscript boleh disemak oleh sesiapa sahaja

---

### Keselamatan Kata Laluan

- 🔒 **Kata Laluan Tidak Disimpan:** Kami tidak pernah menyimpan kata laluan anda
- 🔑 **Autentikasi Penuh:** Anda tetap log masuk melalui MOEISPEL seperti biasa
- 🛡️ **Token Keselamatan:** Menggunakan token CSRF untuk mencegah serangan tidak sah

---

### Keselamatan Sambungan Internet

**Amaran Penting:**
- ⚠️ **Jangan Gunakan WiFi Umum:** Elakkan menggunakan MOEISPEL di WiFi warung internet atau kafeteria
- 🔒 **Gunakan VPN:** Jika mengakses dari rumah, boleh menggunakan VPN tepercaya
- 🏢 **Gunakan Rangkaian Sekolah:** Sambungan rangkaian sekolah yang dilindungi adalah pilihan terbaik
- 🔐 **HTTPS Sahaja:** Pastikan URL bermula dengan "https://" (bukan "http://")

---

### Kebenaran Aksès dan Sambungan

Userscript memerlukan kebenaran untuk:

| Kebenaran | Tujuan |
|-----------|--------|
| `moeispel.moe.gov.my` | Akses halaman MOEISPEL utama |
| `idme.moe.gov.my` | Autentikasi login KPM |
| `cdnjs.cloudflare.com` | Perpustakaan pihak ketiga yang dipercaya |
| `cdn.datatables.net` | Jadual data untuk paparan |
| `code.jquery.com` | Rangka kerja JavaScript yang dipercaya |

---

### Penghapusan Data

Untuk memadamkan semua data yang disimpan oleh userscript:

1. Buka tetapan userscript (Tampermonkey)
2. Klik **"Padam Cache Semua"**
3. Atau buka Konsol Browser (F12) dan jalankan:
   ```javascript
   GM.deleteValue('kehadiran_cache');
   GM.deleteValue('profil_cache');
   GM.deleteValue('senarai_cache');
   ```

---

## 👥 Penyumbang & Lesen

### Maklumat Penyumbang

**Penulis Utama:**
- **Ustaz Zaimuddin Hassan**
  - 🏫 Guru Al-Quran dan Bahasa Arab
  - 🏠 SMK Padang Pak Amat, Pasir Puteh, Kelantan
  - 💬 Telegram: [@zaimuddinhassan](https://t.me/zaimuddinhassan)

---

### Lesen - Creative Commons CC0 1.0

Projek ini dilisensikan di bawah **Creative Commons CC0 1.0 Universal** (Waiver Hak Cipta Awam).

Ini bermakna:
- ✅ **Bebas Guna:** Anda boleh menggunakan kod ini untuk tujuan apa pun
- ✅ **Bebas Ubah:** Anda boleh mengubah dan menyesuaikan kod mengikut keperluan
- ✅ **Bebas Kongsi:** Anda boleh berkongsi kod dengan guru lain
- ✅ **Tiada Atribusi Wajib:** Anda tidak perlu memberikan kredit (walaupun dihargai)
- ℹ️ **Tiada Jaminan:** Kod diberikan "sebagaimana adanya" tanpa jaminan

**Teks Penuh Lesen:** Lihat fail `LICENSE` dalam repository ini.

---

### Panduan Penyumbang

Kami menyambut sumbangan dari komuniti guru dan pemaja! Untuk menyumbang:

**Langkah-langkah:**

1. **Fork Repository**
   - Lawati: https://github.com/zaimuddin/MOEISPEL-SolusiBestariGuru
   - Klik butang "Fork"

2. **Buat Branch Baru**
   ```bash
   git clone https://github.com/[username-anda]/MOEISPEL-SolusiBestariGuru.git
   cd MOEISPEL-SolusiBestariGuru
   git checkout -b fitur/nama-fitur-anda
   ```

3. **Buat Perubahan Anda**
   - Ubah kod mengikut keperluan
   - Pastikan kod berfungsi dengan baik
   - Tambahkan ulasan dalam bahasa Melayu

4. **Commit Perubahan**
   ```bash
   git add .
   git commit -m "Tambah fitur baru: [penerangan ringkas]"
   ```

5. **Push ke GitHub**
   ```bash
   git push origin fitur/nama-fitur-anda
   ```

6. **Buka Pull Request**
   - Klik butang "Compare & pull request"
   - Tulis penerangan terperinci tentang perubahan anda
   - Hantar pull request untuk semakan

**Arahan Penyumbangan:**
- Tulis kod dengan ulasan yang jelas
- Pastikan fungsi baru tidak melanggar fungsi sedia ada
- Uji kod di beberapa pelayar (Chrome, Firefox, Edge)
- Ikuti gaya pengekodan yang ada dalam projek
- Tulis pesan commit dalam bahasa Melayu yang jelas

---

## 📞 Hubungi Kami

Kami di sini untuk membantu! Hubungi kami melalui pelbagai saluran:

### 💬 Telegram (Saluran Sokongan Rasmi)

**Bincang & Sokongan:**
- 📱 **Kumpulan Sokongan:** [@bincangsolusibestariguru](https://t.me/bincangsolusibestariguru)
- 📱 **Saluran Maklumat:** [@solusibeariguru](https://t.me/solusibeariguru)
- 📱 **Hubungi Ustaz:** [@zaimuddinhassan](https://t.me/zaimuddinhassan)

**Peraturan Kumpulan:**
- ✅ Sambutan untuk semua guru dan pemaja
- ✅ Bertanya untuk bantuan adalah digalakkan
- ⚠️ Elakkan spam atau iklan tidak berkaitan
- 🤝 Bantu guru lain jika anda tahu jawapannya

---

### 🐛 Laporan Bug & Permintaan Fitur

**Via GitHub Issues:**
1. Lawati: https://github.com/zaimuddin/MOEISPEL-SolusiBestariGuru/issues
2. Klik **"New Issue"**
3. Pilih kategori:
   - 🐛 **Bug Report** - untuk melaporkan masalah
   - ✨ **Feature Request** - untuk idea fitur baru
4. Tulis perihalan terperinci
5. Attach tangkapan skrin jika mungkin
6. Submit issue

---

### 📧 Email Sokongan

Untuk pertanyaan umum atau cadangan:
- **Email:** solusibestariguru@gmail.com
- ⏱️ **Masa Respons:** Biasanya dalam 24-48 jam

---

### 💡 Soalan Umum (FAQ)

**S: Adakah userscript ini selamat digunakan di sekolah?**
A: Ya, userscript ini hanya memproses data untuk memudahkan kerja, tidak mengubah data asal di sistem MOEISPEL.

**S: Berapa kali saya perlu memasang userscript?**
A: Hanya sekali sahaja. Tampermonkey akan menguruskan kemas kini otomatis untuk anda.

**S: Bolehkah saya menggunakan userscript di beberapa komputer?**
A: Ya, pasang Tampermonkey dan userscript di setiap komputer yang anda gunakan.

**S: Bagaimana jika sistem MOEISPEL berubah?**
A: Kami akan mengemas kini userscript dengan cepat. Anda akan menerima pemberitahuan kemas kini otomatis.

**S: Adakah ada kos atau bayaran untuk menggunakan userscript ini?**
A: Tidak, userscript ini 100% percuma untuk semua guru Malaysia.

---

## 📈 Statistik Penggunaan

Terima kasih telah menggunakan MOEISPEL–SolusiBestariGuru! 

Bersama-sama kita mempermudahkan pengurusan pendidikan di Malaysia:
- 👨‍🏫 **Guru yang Dimudahkan:** Ribuan guru di seluruh Malaysia
- ⏰ **Masa Disimpan:** Puluhan ribu jam kerja dijimatkan
- 📊 **Data Diproses:** Jutaan rekod kehadiran dan profil

---

## 🙏 Terima Kasih

Terima kasih kepada:
- **Kementerian Pendidikan Malaysia (KPM)** kerana sistem MOEISPEL yang berguna
- **Semua guru** yang telah menggunakan dan memberikan maklum balas
- **Komunitas pengembang** yang telah menyumbang idea dan penyelesaian
- **Tautan pihak ketiga** seperti Tampermonkey, DataTables, dan pelbagai perpustakaan

---

**Selamat menggunakan MOEISPEL–SolusiBestariGuru! 🎉**

*Terakhir Diperbarui: Agustus 2026*
