<div align="center">

# 🔒 WaBLUR
### *Privacy Blur for WhatsApp Web*

**Jaga privasi percakapan WhatsApp Web Anda dari tatapan orang lain di sekitar!**  
Efek blur otomatis yang mulus untuk pesan, nama kontak, foto profil, dan media. Arahkan kursor (*hover*) untuk mengintip.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Browser](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge%20%7C%20Brave-success?style=flat-square)](https://www.google.com/chrome/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Zero Tracking](https://img.shields.io/badge/Privacy-100%25%20Offline-green?style=flat-square)](#-keamanan--privasi)

---

[Fitur Utama](#-fitur-utama) • 
[Cara Pasang](#-cara-pemasangan-instalasi) • 
[Panduan Penggunaan](#-panduan-penggunaan) • 
[Tombol Pintas](#-tombol-pintas-shortcut) • 
[Privasi & Keamanan](#-keamanan--privasi) • 
[Solusi Masalah](#-solusi-masalah-troubleshooting)

---

</div>

## 🌟 Mengapa Memakai WaBLUR?

Sering buka WhatsApp Web di kantor, kafe, perpustakaan, atau ruang publik? WaBLUR melindungi layar Anda dari intipan orang di sebelah (*shoulder surfing*). 

Semua teks pesan, nama, preview, dan gambar akan otomatis diburamkan (**blur**). Anda cukup mengarahkan mouse ke bagian yang ingin dibaca untuk melihatnya secara normal.

---

## ✨ Fitur Utama

- 👁️ **Hover to Reveal**: Arahkan kursor mouse untuk membuka teks/media yang diblur seketika.
- 🎛️ **Kontrol Fleksibel**:
  - Blur Pesan Obrolan (*Chat Messages*)
  - Blur Nama Kontak (*Contact Names*)
  - Blur Pesan Terakhir di Daftar Chat (*Last Message Preview*)
  - Blur Foto Profil / Avatar
  - Blur Gambar, Stiker, dan Video
- 📏 **Atur Tingkat Ketebalan Blur**: Sesuaikan intensitas blur dari tipis (1px) hingga tebal tak terbaca (30px).
- ⏱️ **Temporary Reveal**: Buka seluruh blur selama beberapa detik dengan satu tombol saat Anda sedang butuh melihat semua pesan.
- 📋 **Whitelist & Blacklist Kontak**:
  - **Whitelist**: Jangan pernah blur kontak tertentu (misal: grup kerjaan penting).
  - **Blacklist**: Selalu blur kontak tertentu meskipun tombol utama dimatikan.
- ⚡ **Ringan & Cepat**: Menggunakan CSS murni berbasis GPU, tidak membuat browser lag atau boros baterai.

---

## 🚀 Cara Pemasangan (Instalasi)

Ekstensi ini kompatibel dengan semua browser Chromium (**Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi**).

```
Langkah Cepat:
1. Download / Clone Repo ➔ 2. Buka Menu Extensions ➔ 3. Nyalakan Developer Mode ➔ 4. Load Unpacked
```

### Panduan Langkah Demi Langkah:

#### 1. Download Folder Ekstensi
- Klik tombol hijau **Code** di atas, lalu pilih **Download ZIP** (atau clone via git: `git clone https://github.com/SoftwareTheCore/WaBLUR.git`).
- Ekstrak file ZIP tersebut di komputer Anda ke folder biasa.

#### 2. Buka Halaman Ekstensi Browser
- **Google Chrome**: Ketik `chrome://extensions` di address bar, lalu tekan Enter.
- **Microsoft Edge**: Ketik `edge://extensions` di address bar, lalu tekan Enter.
- **Brave**: Ketik `brave://extensions` di address bar, lalu tekan Enter.

#### 3. Aktifkan Mode Pengembang (*Developer Mode*)
- Geser sakelar **Developer mode** (Mode Pengembang) di pojok kanan atas (atau kiri bawah pada Edge) ke posisi **ON**.

#### 4. Pasang Ekstensi
- Klik tombol **Load unpacked** (*Muat yang belum dibongkar*) di pojok kiri atas.
- Pilih folder hasil ekstrak `WaBLUR` (folder yang langsung berisi file `manifest.json`).
- Selesai! Ikon WaBLUR akan muncul di toolbar browser Anda.

#### 5. Buka WhatsApp Web
- Buka [web.whatsapp.com](https://web.whatsapp.com).
- WaBLUR sudah otomatis aktif dan melindungi percakapan Anda!

> 💡 **Tips**: Klik ikon puzzle (🧩) di toolbar browser Anda, lalu klik ikon pin (📌) pada **WaBLUR** agar menu popup mudah diakses kapan saja.

---

## 📖 Panduan Penggunaan

### 1. Menu Cepat (Klik Ikon WaBLUR)
Klik ikon WaBLUR di pojok kanan atas browser untuk membuka menu:
* **Master Switch**: Tombol on/off utama untuk mengaktifkan atau mematikan blur secara instan.
* **Elemen Pilihan**: Centang apa saja yang ingin diblur (Nama, Pesan, Media, Foto Profil, Preview).
* **Slider Intensitas**: Geser ke kanan untuk efek blur lebih tebal.
* **Temp Reveal**: Tombol darurat untuk membuka semua blur sementara waktu.
* **Pengaturan Lanjutan**: Membuka halaman opsi penuh (*Options Page*).

### 2. Pengaturan Lanjutan (Options)
Buka dengan cara klik kanan ikon ekstensi ➔ pilih **Options** (Opsi):
* **Kecepatan Transisi**: Atur seberapa cepat animasi fade saat kursor diarahkan.
* **Jeda Hover (Hover Delay)**: Beri sedikit jeda waktu sebelum teks terbuka saat kursor lewat agar tidak terbuka secara tidak sengaja.
* **Durasi Temp Reveal**: Tentukan berapa detik pesan terbuka saat tombol pintas ditekan.
* **Daftar Kontak Whitelist**: Masukkan nama kontak (satu baris per nama) yang tidak boleh diblur.
* **Daftar Kontak Blacklist**: Masukkan nama kontak yang wajib selalu diblur.

---

## ⌨️ Tombol Pintas (Shortcut)

| Tombol | Fungsi |
| :--- | :--- |
| `Alt + Shift + B` | Nyalakan / Matikan blur seketika (*Toggle Master*) |
| `Alt + Shift + R` | Intip semua pesan sementara (*Temporary Reveal*) |
| `Esc` | Batalkan mode intip sementara dan kunci blur kembali |

*(Anda bisa mengubah tombol pintas ini kapan saja melalui menu browser di `chrome://extensions/shortcuts` atau `edge://extensions/shortcuts`)*.

---

## 🛡️ Keamanan & Privasi

Privasi Anda adalah prioritas mutlak. WaBLUR dirancang dengan standar keamanan tertinggi:

- 🔒 **100% Berjalan Lokal**: Ekstensi berjalan sepenuhnya di browser Anda.
- 🚫 **Nol Pengumpulan Data**: Tidak ada analitik, tidak ada pelacakan, tidak ada cookie eksternal.
- 🚫 **Tanpa Akses Jaringan**: Ekstensi tidak pernah menghubungi server mana pun (`0 outgoing requests`).
- 🚫 **Tidak Membaca Pesan Anda**: Efek blur diterapkan murni menggunakan CSS layer, skrip tidak membaca teks chat Anda.
- 🛡️ **Bebas Kode Berbahaya**: Mengikuti aturan ketat Google Chrome Manifest V3 (bebas dari `eval()` dan skrip CDN luar).

---

## ❓ Solusi Masalah (Troubleshooting)

<details>
<summary><b>1. Kenapa efek blur tidak muncul di WhatsApp Web?</b></summary>

- Pastikan badge di ikon ekstensi berwarna hijau dan tertulis **ON**.
- Lakukan refresh pada tab WhatsApp Web Anda (`Ctrl + F5`).
- Pastikan Anda membuka situs resmi WhatsApp Web (`https://web.whatsapp.com`).
</details>

<details>
<summary><b>2. WhatsApp Web melakukan update tampilan dan blur bergeser/lepas?</b></summary>

- WhatsApp Web terkadang memperbarui struktur tampilannya secara berkala.
- WaBLUR menggunakan selector berbasis atribut yang stabil (`data-testid`), namun jika ada pembaruan WhatsApp yang merusak selector, silakan laporkan di menu **Issues** pada repository ini agar segera kami perbarui.
</details>

<details>
<summary><b>3. Tombol pintas (Shortcut) tidak berfungsi?</b></summary>

- Pastikan jendela browser sedang dalam keadaan aktif/fokus.
- Cek apakah tombol bentrok dengan ekstensi lain di `chrome://extensions/shortcuts`.
</details>

---

## 🛠️ Untuk Pengembang (Developer)

Jika ingin memodifikasi atau berkontribusi pada kode:

```bash
WaBLUR/
├── manifest.json       # Konfigurasi Manifest V3
├── icons/              # Aset ikon ekstensi
├── src/
│   ├── background/     # Service worker (hotkeys & badge)
│   ├── content/        # CSS & script pengelola DOM WhatsApp
│   ├── popup/          # Antarmuka menu cepat
│   └── options/        # Antarmuka pengaturan lengkap
└── tests/              # File pengujian unit & E2E
```

- **CSS-First**: Menggunakan `filter: blur()` dengan akselerasi GPU.
- **Aman**: Hanya menggunakan manipulasi DOM berbasis `textContent` dan manipulasi class `classList`.

---

## 📄 Lisensi

Proyek ini berada di bawah lisensi [MIT License](LICENSE). Anda bebas menggunakan, memodifikasi, dan mendistribusikannya.
