// ============================================================
// 📦 database.js — Koneksi ke PostgreSQL (Neon Cloud)
//
// Sebelumnya pakai JSON file → sekarang pakai PostgreSQL cloud
// Kenapa? Karena di cloud (Koyeb), file JSON hilang saat restart
//
// Neon = PostgreSQL gratis di cloud, tanpa kartu kredit!
// Daftar di: https://neon.tech
// ============================================================

const { Pool } = require('pg'); // Package untuk koneksi ke PostgreSQL

// Koneksi ke database menggunakan DATABASE_URL dari file .env
// Format: postgresql://user:password@host/dbname
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Wajib untuk koneksi cloud (Neon)
});

// ── INISIALISASI TABEL ────────────────────────────────────────
// Buat tabel webhook_notif kalau belum ada
// Struktur tetap sama: id, message, created_at
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_notif (
      id         SERIAL      PRIMARY KEY,
      message    TEXT        NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ Database siap! Tabel webhook_notif tersedia.');
}

// ── AMBIL SEMUA DATA ─────────────────────────────────────────
// Seperti: SELECT * FROM webhook_notif ORDER BY id DESC
async function getAll() {
  const result = await pool.query(
    'SELECT * FROM webhook_notif ORDER BY id DESC'
  );
  return result.rows;
}

// ── SIMPAN DATA BARU ─────────────────────────────────────────
// Seperti: INSERT INTO webhook_notif (message) VALUES (?)
async function insert(message) {
  const result = await pool.query(
    'INSERT INTO webhook_notif (message) VALUES ($1) RETURNING *',
    [message]
  );
  return result.rows[0]; // Kembalikan data yang baru disimpan
}

// ── HAPUS SEMUA DATA ─────────────────────────────────────────
// Seperti: DELETE FROM webhook_notif (untuk reset demo)
async function deleteAll() {
  await pool.query('DELETE FROM webhook_notif');
  // Reset ID kembali ke 1 supaya demo terlihat bersih
  await pool.query('ALTER SEQUENCE webhook_notif_id_seq RESTART WITH 1');
}

module.exports = { init, getAll, insert, deleteAll };
