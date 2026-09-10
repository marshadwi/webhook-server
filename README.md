# Webhook Notification Server

Server backend berbasis Node.js dan Express untuk menangani penerimaan data notifikasi secara real-time via HTTP POST dari aplikasi mobile frontend, dengan penyimpanan permanen pada database cloud PostgreSQL (Neon) dan deployment serverless di Vercel.

---

## Ringkasan Proyek

| Komponen | Spesifikasi |
| :--- | :--- |
| **Endpoint Webhook** | `POST https://webhook-server-sand.vercel.app/webhook` |
| **Live Dashboard** | [https://webhook-server-sand.vercel.app](https://webhook-server-sand.vercel.app) |
| **Runtime / Framework** | Node.js & Express.js |
| **Database** | Neon Cloud PostgreSQL (SSL Secured) |
| **Hosting Platform** | Vercel Serverless (24/7 Always-On) |
| **Tabel Database** | `webhook_notif` (`id`, `message`, `created_at`) |

---

## Arsitektur Sistem

```
[Aplikasi Mobile (Frontend)]
            │
            ▼  HTTP POST /webhook (JSON / Text)
   [Vercel Serverless Function]
            │
      ┌─────┴─────────────────────────┐
      │ Validasi & Sanitasi Payload   │
      └─────┬─────────────────────────┘
            │
            ▼  SQL INSERT INTO webhook_notif
  [Neon Cloud PostgreSQL Database]
            │
            ▼
 [Web Dashboard Monitor (GET /)]
```

---

## Struktur Database

Tabel: **`webhook_notif`**

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | Nomor urut unik otomatis |
| `message` | `TEXT NOT NULL` | Data notifikasi / payload yang diterima |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | Timestamp waktu kedatangan data (WIB) |

---

## Spesifikasi API

### 1. Ingestion Webhook

* **URL:** `/webhook`
* **Method:** `POST`
* **Header:** `Content-Type: application/json`

#### Format Payload yang Didukung:

**A. Format Teks Sederhana**
```json
{
  "message": "Transaksi pembayaran berhasil diterima."
}
```

**B. Format Transaksi E-Wallet / QRIS Lengkap**
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

**C. Format Objek JSON Custom**
```json
{
  "user": "Rina",
  "status": "checkout",
  "total": 85000
}
```

#### Response:

* **201 Created (Sukses):**
```json
{
  "success": true,
  "message": "Webhook berhasil diterima dan disimpan!",
  "data": {
    "id": 12,
    "message": "{\"user\":\"Rina\",\"status\":\"checkout\",\"total\":85000}",
    "created_at": "2026-09-10T03:09:06.622Z"
  }
}
```

* **400 Bad Request (Data Kosong):**
```json
{
  "success": false,
  "error": "Data notifikasi tidak boleh kosong!"
}
```

---

### 2. Monitoring & Pengambilan Data

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/` | Web Dashboard Monitor real-time dengan filter & pencarian |
| `GET` | `/webhook` | Mengambil seluruh riwayat notifikasi dalam format JSON |
| `GET` | `/webhook/latest` | Mengambil 5 notifikasi terbaru |
| `DELETE` | `/webhook/reset` | Menghapus seluruh riwayat data (reset counter ID ke 1) |

---

## Struktur Folder

```text
webhook-server/
├── api/
│   └── index.js         # Entry point Serverless Function untuk Vercel
├── database.js          # Koneksi pool & query PostgreSQL (Neon)
├── server.js            # Router Express & render Dashboard Monitor
├── vercel.json          # Konfigurasi routing rewrite Vercel
├── package.json         # Konfigurasi dependencies proyek
├── START.bat            # Launcher cepat untuk lingkungan lokal Windows
└── README.md            # Dokumentasi teknis proyek
```

---

## Menjalankan di Lingkungan Lokal (Development)

1. **Clone repository:**
   ```bash
   git clone https://github.com/marshadwi/webhook-server.git
   cd webhook-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable (`.env`):**
   ```env
   PORT=3000
   DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
   ```

4. **Jalankan server:**
   ```bash
   npm start
   # atau dobel klik START.bat (Windows)
   ```

5. Akses dashboard di browser: `http://localhost:3000`
