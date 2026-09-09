# 📬 Webhook Server — Panduan Demo & Presentasi

> Proyek ini dibuat untuk **belajar bersama** tentang konsep **webhook** dan **REST API POST endpoint**.  
> Dibuat sesederhana mungkin agar mudah dipahami saat demo dan presentasi.

---

## 🤔 Apa itu Webhook?

Webhook adalah cara satu aplikasi memberitahu aplikasi lain secara **otomatis** saat terjadi suatu event.

**Analogi sederhana:**  
> 🔔 **Bel pintu** — Kamu tidak perlu terus-terusan ke pintu untuk cek ada tamu atau tidak.  
> Cukup tunggu bel bunyi, dan kamu tahu ada tamu datang.  

Begitu juga webhook:
- **Tanpa webhook**: Server harus terus-terusan *tanya* ke aplikasi mobile "ada pesan baru?"
- **Dengan webhook**: Aplikasi mobile otomatis *kirim* ke server saat ada pesan baru

---

## 🗂️ Struktur Tabel Database

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | INTEGER | Nomor urut otomatis (1, 2, 3, ...) |
| `message` | TEXT | Isi pesan dari aplikasi mobile |
| `created_at` | DATETIME | Waktu server menerima pesan (otomatis) |

---

## 🚀 Cara Menjalankan

### Langkah 1 — Install dependencies
```bash
npm install
```

### Langkah 2 — Jalankan server
```bash
node server.js
```

### Langkah 3 — Buka browser
```
http://localhost:3000
```

### Langkah 4 — Expose ke internet untuk demo dari HP/mobile
```bash
npx localtunnel --port 3000
```
> Kamu akan dapat URL seperti: `https://xxx.loca.lt`  
> URL ini bisa diakses dari mana saja! Berikan URL ini ke tim frontend mobile.

---

## 📡 Daftar Endpoint

| Method | URL | Fungsi |
|--------|-----|--------|
| `GET` | `/` | Halaman web monitor notifikasi |
| `POST` | `/webhook` | ⭐ **Kirim notifikasi** (dari mobile app) |
| `GET` | `/webhook` | Ambil semua data (format JSON) |
| `GET` | `/webhook/latest` | 5 data terbaru |
| `DELETE` | `/webhook/reset` | Reset semua data (untuk demo ulang) |

---

## 🧪 Cara Test Endpoint (untuk demo)

### Menggunakan curl (Terminal)
```bash
# Kirim webhook
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Halo dari aplikasi mobile!\"}"

# Lihat semua data
curl http://localhost:3000/webhook

# Reset data
curl -X DELETE http://localhost:3000/webhook/reset
```

### Menggunakan Postman / Insomnia
```
Method  : POST
URL     : http://localhost:3000/webhook
Headers : Content-Type: application/json
Body    : {"message": "Halo dari aplikasi mobile!"}
```

### Contoh Response Sukses
```json
{
  "success": true,
  "message": "✅ Webhook berhasil diterima dan disimpan!",
  "data": {
    "id": 1,
    "message": "Halo dari aplikasi mobile!",
    "created_at": "2026-09-09T06:38:00.000Z"
  }
}
```

### Contoh Response Error (message kosong)
```json
{
  "success": false,
  "error": "Field \"message\" wajib diisi!",
  "contoh": { "message": "Halo dari aplikasi mobile!" }
}
```

---

## 🎬 Skenario Demo (untuk presentasi)

1. **Jalankan server** → `node server.js`
2. **Buka browser** → `http://localhost:3000` (tabel masih kosong)
3. **Kirim webhook via Postman/curl** → tunjukkan request & response
4. **Refresh browser** → tabel sekarang ada data baru ✅
5. **Jalankan localtunnel** → `npx localtunnel --port 3000`
6. **Kirim dari HP/mobile** → gunakan URL dari localtunnel
7. **Reset data** → klik tombol reset, siap demo ulang

---

## 🛠️ Tech Stack

| Tools | Versi | Fungsi |
|-------|-------|--------|
| Node.js | v22+ | Runtime JavaScript di server |
| Express.js | v4.x | Framework web (buat endpoint/routing) |
| better-sqlite3 | v9.x | Database file-based, tanpa install DB server |
| cors | v2.x | Izinkan akses dari aplikasi mobile |
| localtunnel | latest | Expose localhost ke internet (gratis, no akun) |
