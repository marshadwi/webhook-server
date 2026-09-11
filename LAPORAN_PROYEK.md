# LAPORAN TEKNIS PROYEK
# IMPLEMENTASI WEBHOOK NOTIFICATION SERVER
## Terintegrasi dengan Aplikasi Mobile Frontend & Cloud Deployment 24/7

* **Penyusun:** Marsha Dwi Lucyana
* **Repositori GitHub:** [github.com/marshadwi/webhook-server](https://github.com/marshadwi/webhook-server)
* **Live Dashboard URL:** [webhook-server-sand.vercel.app](https://webhook-server-sand.vercel.app)
* **Endpoint Webhook (POST):** `https://webhook-server-sand.vercel.app/webhook`
* **Status Proyek:** Selesai & Aktif di Cloud (Production Ready)

---

## 1. Ringkasan Eksekutif (Executive Summary)

Proyek ini bertujuan untuk merancang, mengimplementasikan, dan mendistribusikan sistem **Webhook Notification Server** yang berfungsi sebagai gerbang (*gateway*) penerima data secara *real-time* dari aplikasi mobile tim frontend. 

Sistem ini menggantikan metode polling konvensional yang tidak efisien, dengan menyediakan mekanisme *push event* otomatis. Ketika aplikasi mobile mendeteksi transaksi atau notifikasi baru (seperti pembayaran QRIS di aplikasi e-wallet DANA, ShopeePay, GoPay), data tersebut langsung ditransmisikan via HTTP POST, divalidasi, dan dicatat secara permanen ke basis data relasional **PostgreSQL di Neon Cloud**. 

Seluruh sistem di-hosting secara *serverless* di **Vercel** sehingga dapat diakses 24 jam nonstop di internet tanpa bergantung pada komputer lokal, dengan biaya infrastruktur **$0 (100% Free Tier)**.

---

## 2. Alat dan Teknologi yang Digunakan (Technology Stack)

Seluruh perangkat lunak dan layanan cloud yang digunakan dalam proyek ini dipilih berdasarkan keandalan, efisiensi performa, dan kemudahan integrasi:

| Kategori | Teknologi / Alat | Fungsi dalam Proyek |
| :--- | :--- | :--- |
| **Runtime Environment** | **Node.js (v22+)** | Menjalankan kode JavaScript di sisi server dengan arsitektur non-blocking asynchronous. |
| **Backend Framework** | **Express.js (v4.x)** | Menangani perutean API (*routing*), middleware parser JSON, dan penyajian dashboard web. |
| **Cloud Database** | **Neon PostgreSQL** | Basis data relasional (SQL) berbasis cloud terkelola untuk penyimpanan permanen tabel `webhook_notif`. |
| **Cloud Hosting Platform** | **Vercel Serverless** | Menjalankan aplikasi backend di jaringan edge global selama 24 jam nonstop tanpa perlu mengelola server fisik. |
| **Local Tunneling** | **Ngrok (v3.x)** | Menyediakan *static domain* aman untuk proses pengujian lokal langsung dari handphone fisik. |
| **Version Control** | **Git & GitHub** | Manajemen kode sumber dan integrasi CI/CD otomatis (*Continuous Deployment* ke Vercel). |
| **Libraries & Drivers** | `pg` (node-postgres) | Driver koneksi terenkripsi (SSL) antara Node.js dan database Neon. |
| | `cors` | Mengizinkan permintaan lintas domain dari aplikasi mobile (Cross-Origin Resource Sharing). |
| | `dotenv` | Manajemen variabel lingkungan rahasia (`.env`) seperti kredensial koneksi basis data. |

---

## 3. Arsitektur dan Cara Kerja Sistem

### 3.1. Alur Transmisi Data (Data Flow)

Sistem bekerja dengan arsitektur berorientasi peristiwa (*Event-Driven Architecture*):

```
[Aplikasi Mobile (DompetKu)]
            │
            ▼  HTTP POST /webhook (JSON Payload)
[Vercel Serverless Gateway]
            │
            ├─► Validasi & Sanitasi Data
            │
            ▼  SQL INSERT INTO webhook_notif
[Neon Cloud PostgreSQL DB]
            │
            ├─► Simpan Permanen (ID Serial)
            │
            ▼  SELECT * FROM webhook_notif
[Web Dashboard Monitor (GET /)]
```

### 3.2. Hubungan dengan Aplikasi Mobile Frontend

Aplikasi mobile bertindak sebagai **Produsen Peristiwa (Event Producer)**:
1. Saat notifikasi sistem masuk di Android (misalnya aplikasi e-wallet merchant), listener menangkap teks notifikasi.
2. Mobile memformat teks tersebut ke dalam payload JSON standar.
3. Mobile mengirimkan data via HTTP POST ke endpoint server: `https://webhook-server-sand.vercel.app/webhook`.
4. Server bertindak sebagai **Penerima Peristiwa (Event Consumer)** yang menyimpan data dan menyajikannya ke dashboard manajemen secara real-time.

---

## 4. Tahap dan Langkah-Langkah Pengerjaan Proyek

Pengerjaan proyek dilakukan secara sistematis melalui 6 tahapan utama:

```
Tahap 1: Setup Proyek & Express Server
   ↓
Tahap 2: Perancangan Skema Database PostgreSQL
   ↓
Tahap 3: Pembuatan Endpoint POST & Dashboard Awal
   ↓
Tahap 4: Implementasi Tunneling Lokal (Ngrok Static)
   ↓
Tahap 5: Migrasi ke Cloud Database Neon & Deployment Vercel
   ↓
Tahap 6: Redesain UI/UX Dashboard Enterprise & Uji Coba Multi-Format
```

### Tahap 1: Inisialisasi Proyek dan Server Backend
- Melakukan inisialisasi direktori kerja `C:\Users\LENOVO\webhook-server` menggunakan `npm init`.
- Memasang pustaka dasar: `express`, `cors`, dan `dotenv`.
- Mengonfigurasi struktur awal: `server.js` untuk logika rute dan `database.js` untuk lapisan abstraksi data.

### Tahap 2: Perancangan Skema Database `webhook_notif`
- Merancang tabel SQL `webhook_notif` dengan spesifikasi kolom:
  - `id`: `SERIAL PRIMARY KEY` (Auto-increment 1, 2, 3...).
  - `message`: `TEXT NOT NULL` (Menyimpan payload notifikasi baik teks biasa maupun string JSON terstruktur).
  - `created_at`: `TIMESTAMPTZ DEFAULT NOW()` (Merekam waktu kedatangan data secara otomatis).
- Memilih **PostgreSQL di Neon Cloud** guna menjamin persistensi data saat server di-deploy ke cloud.

### Tahap 3: Pembuatan Endpoint POST `/webhook` & Dashboard
- Membuat fungsi penerima di `app.post('/webhook')` dengan sanitasi data.
- Menambahkan logika penerimaan fleksibel: dapat menerima string biasa `{"message": "Halo"}`, objek JSON bersarang, ataupun objek data transaksi langsung.
- Membuat endpoint pemantauan `app.get('/')` yang menampilkan halaman web visual.

### Tahap 4: Pengujian Lokal Menggunakan Ngrok Static Domain
- Memasang biner `ngrok.exe` versi 3.x di lingkungan Windows.
- Mengonfigurasi authtoken dan mendaftarkan domain statis gratis: `greeter-breeching-tinfoil.ngrok-free.dev`.
- Mengintegrasikan peluncur otomatis di `START.bat` agar server lokal dan tunnel ngrok dapat dinyalakan dengan satu klik.

### Tahap 5: Deployment ke Cloud 24/7 (Vercel Serverless)
- Menginisialisasi repositori Git lokal dan menghubungkannya ke repositori jarak jauh: `https://github.com/marshadwi/webhook-server`.
- Menyesuaikan arsitektur untuk platform serverless Vercel:
  - Membuat wrapper fungsi di `api/index.js`.
  - Mengonfigurasi rute URL di `vercel.json`.
- Memasukkan variabel lingkungan `DATABASE_URL` di dashboard Vercel untuk menghubungkan serverless function ke kluster database Neon di AWS region us-east-2.
- Hasil: Server berhasil aktif 24 jam nonstop tanpa perlu menyalakan laptop.

### Tahap 6: Redesain UI/UX Konsol Monitor (FinTech Standard)
- Menghapus seluruh emotikon visual untuk mencapai standar antarmuka aplikasi enterprise yang bersih dan formal.
- Menambahkan metrik ringkasan (*Metrics Grid*):
  - Total Notifikasi Masuk
  - Akumulasi Nominal Transaksi QRIS (Rupiah)
  - Jumlah Objek JSON Terstruktur
  - Jumlah Pesan Teks Sederhana
- Mengimplementasikan tab penyaring (*Filter Tabs*) dan pencarian real-time (*Client-side Live Search*).
- Menambahkan modal dialog untuk simulasi kirim data uji (*Built-in Event Tester*) dan konfirmasi reset database.

---

## 5. Spesifikasi Teknis Antarmuka Pemrograman (API Contract)

### 5.1. Endpoint Utama: Ingestion Webhook

* **URL:** `https://webhook-server-sand.vercel.app/webhook`
* **Method:** `POST`
* **Headers:** `Content-Type: application/json`

#### Variasi Payload yang Didukung:

**1. Tipe Transaksi E-Wallet / QRIS (Data Riil Mobile):**
```json
{
  "appSource": "DANA",
  "amount": 50000.0,
  "formattedAmount": "Rp 50.000",
  "payerName": "BUDI SANTOSO",
  "type": "qris_in",
  "dateTime": "2026-09-10T09:46:22",
  "rawMessage": "DANA\nKamu menerima Saldo DANA sebesar Rp 50.000 dari BUDI SANTOSO"
}
```

**2. Tipe Teks Sederhana (Pemula):**
```json
{
  "message": "Halo dari aplikasi mobile tim frontend!"
}
```

**3. Tipe Objek Data Bebas:**
```json
{
  "user": "Rina",
  "status": "checkout",
  "total": 85000
}
```

#### Respon Standar Server:

* **HTTP 201 Created (Berhasil Disimpan):**
```json
{
  "success": true,
  "message": "Webhook berhasil diterima dan disimpan!",
  "data": {
    "id": 9,
    "message": "{\"appSource\":\"DANA\",\"amount\":50000.0,...}",
    "created_at": "2026-09-10T03:00:51.879Z"
  }
}
```

* **HTTP 400 Bad Request (Validasi Gagal):**
```json
{
  "success": false,
  "error": "Data notifikasi tidak boleh kosong!"
}
```

---

## 6. Hasil Pengujian Nyata (Live Test Results)

Integrasi telah berhasil diuji secara langsung menggunakan aplikasi mobile *DompetKu Xiaomi* dan simulator data:

| ID | Kategori | Ringkasan Payload | Waktu Masuk (WIB) |
| :---: | :---: | :--- | :--- |
| **10** | ShopeePay | QRIS Rp 150.000 (Pengirim: Pelanggan) | 10 Sep 2026, 10:01:30 |
| **9** | DANA | QRIS Rp 50.000 (Pengirim: BUDI SANTOSO) | 10 Sep 2026, 10:00:51 |
| **8** | DANA | QRIS Rp 125.000 (Pengirim: SITI RAHMAWATI) | 10 Sep 2026, 10:00:46 |
| **11** | Teks | "Halo dari Budi yang baru belajar!" | 10 Sep 2026, 10:09:05 |
| **12** | JSON | `{"user":"Rina","status":"checkout","total":85000}` | 10 Sep 2026, 10:09:06 |

---

## 7. Nilai Tambah dan Kesimpulan

1. **Efisiensi Finansial ($0 Biaya Operasional):** Memanfaatkan paket gratis tanpa batas waktu dari Vercel Serverless dan Neon PostgreSQL tanpa memerlukan kartu kredit.
2. **Ketersediaan Tinggi (24/7 Availability):** Tidak lagi mengandalkan perangkat laptop pengembang. Sistem berada di cloud data center global.
3. **Fleksibilitas Lintas Tim:** Mampu menampung kebutuhan rekan tim frontend yang baru belajar (*simple string*) maupun integrasi modul pembayaran kompleks (*structured e-wallet QRIS*).
4. **Keamanan Data:** Komunikasi diamankan dengan enkripsi HTTPS pada lapisan web dan SSL Certificate pada lapisan basis data.
