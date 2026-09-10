// ============================================================
// 🚀 server.js — WEBHOOK SERVER UTAMA
//
// Versi Cloud — berjalan di Koyeb (gratis, 24/7, tanpa CC)
// Database: Neon PostgreSQL (gratis, tanpa CC)
//
// Cara jalankan lokal:  node server.js
// Cara deploy cloud:    push ke GitHub → connect ke Koyeb
// ============================================================

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const { exec } = require('child_process');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000; // Koyeb otomatis set PORT

// ============================================================
// 🔧 MIDDLEWARE
// ============================================================
app.use(express.json());
app.use(cors());

// ============================================================
// 🌐 HALAMAN UTAMA — GET /
// Monitor notifikasi di browser
// ============================================================
app.get('/', async (req, res) => {
  const notifs = await db.getAll();

  const rows = notifs.map(n => {
    // Format tanggal supaya mudah dibaca
    const tgl = new Date(n.created_at).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta'
    });
    return `
      <tr>
        <td style="text-align:center;width:60px;color:#888">${n.id}</td>
        <td style="font-size:15px">${n.message}</td>
        <td style="color:#aaa;font-size:12px;width:190px">${tgl}</td>
      </tr>
    `;
  }).join('');

  const domain = process.env.KOYEB_PUBLIC_DOMAIN
    ? `https://${process.env.KOYEB_PUBLIC_DOMAIN}`
    : (process.env.NGROK_DOMAIN ? `https://${process.env.NGROK_DOMAIN}` : `http://localhost:${PORT}`);
  const publicUrl = `${domain}/webhook`;

  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>📬 Webhook Monitor</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; padding: 30px; }
        h1 { color: #2c3e50; margin-bottom: 4px; }
        .subtitle { color: #7f8c8d; font-size: 14px; margin-bottom: 24px; }
        .row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .stat-box { background: #27ae60; color: white; padding: 12px 24px; border-radius: 8px; text-align: center; }
        .stat-box span { font-size: 28px; font-weight: bold; display: block; }
        .url-box { background: #2c3e50; color: white; padding: 14px 20px; border-radius: 8px; flex: 1; min-width: 300px; }
        .url-box small { font-size: 11px; opacity: .7; display:block; margin-bottom:4px; }
        .url-box code { font-size: 14px; color: #2ecc71; word-break: break-all; font-weight: bold; }
        .copy-btn { margin-top: 8px; background: #2ecc71; color: #2c3e50; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }
        .card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
        table { width: 100%; border-collapse: collapse; }
        th { background: #2c3e50; color: white; padding: 11px 14px; text-align: left; }
        td { padding: 11px 14px; border-bottom: 1px solid #ecf0f1; }
        tr:hover td { background: #f8f9fa; }
        .empty { text-align: center; color: #bbb; padding: 40px; }
        .tip { margin-top: 18px; background: #eaf4fb; border-left: 4px solid #3498db; padding: 14px 16px; border-radius: 4px; font-size: 13px; }
        code.inline { background: #f1f2f6; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #e74c3c; }
        .btn-reset { margin-top: 14px; background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
        .badge { background: #3498db; font-size: 10px; padding: 2px 7px; border-radius: 10px; margin-left: 6px; vertical-align: middle; }
        .refresh-note { font-size: 11px; color: #bbb; margin-top: 6px; }
        .blink { animation: blink 1s step-end infinite; }
        @keyframes blink { 50% { opacity: 0; } }
      </style>
    </head>
    <body>
      <h1>📬 Webhook Monitor <span class="badge">☁️ CLOUD 24/7</span></h1>
      <p class="subtitle">Real-time notifikasi dari aplikasi mobile tim frontend — berjalan di Koyeb Cloud</p>

      <div class="row">
        <div class="stat-box">
          <span>${notifs.length}</span>
          Total Notifikasi
        </div>
        <div class="url-box">
          <small>🔗 Endpoint untuk Tim Frontend Mobile:</small>
          <code id="pubUrl">${publicUrl}</code><br>
          <button class="copy-btn" onclick="copyUrl()">📋 Copy URL</button>
        </div>
      </div>

      <div class="card">
        <table>
          <thead>
            <tr><th>ID</th><th>Message</th><th>Created At (WIB)</th></tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="3" class="empty">📭 Belum ada notifikasi masuk.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="tip">
        💡 <b>Format untuk Tim Frontend Mobile:</b><br><br>
        <code class="inline">POST ${publicUrl}</code><br><br>
        Header: <code class="inline">Content-Type: application/json</code><br>
        Body: <code class="inline">{"message": "isi pesan notifikasi"}</code>
      </div>

      <br>
      <button class="btn-reset" onclick="resetData()">🗑️ Reset Semua Data (demo ulang)</button>
      <p class="refresh-note">⏱ Auto-refresh setiap 5 detik <span class="blink">●</span></p>

      <script>
        setTimeout(() => location.reload(), 5000);
        function resetData() {
          if (confirm('Hapus semua data?')) {
            fetch('/webhook/reset', { method: 'DELETE' })
              .then(r => r.json()).then(d => { alert(d.message); location.reload(); });
          }
        }
        function copyUrl() {
          navigator.clipboard.writeText(document.getElementById('pubUrl').innerText)
            .then(() => alert('✅ URL berhasil dicopy!'));
        }
      </script>
    </body>
    </html>
  `);
});

// ============================================================
// 📨 POST /webhook — Terima notifikasi dari mobile
// ============================================================
app.post('/webhook', async (req, res) => {
  console.log('\n📨 Webhook masuk!', req.body);

  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({
      success: false,
      error  : 'Field "message" wajib diisi!',
      contoh : { message: 'Halo dari aplikasi mobile!' }
    });
  }

  const record = await db.insert(message.trim());
  console.log(`   ✅ Tersimpan! ID: ${record.id}`);

  res.status(201).json({
    success: true,
    message: '✅ Webhook berhasil diterima dan disimpan!',
    data   : record
  });
});

// ============================================================
// 📋 GET /webhook — Semua data JSON
// ============================================================
app.get('/webhook', async (req, res) => {
  const notifs = await db.getAll();
  res.json({ success: true, total: notifs.length, data: notifs });
});

// ============================================================
// 🕐 GET /webhook/latest — 5 terbaru
// ============================================================
app.get('/webhook/latest', async (req, res) => {
  const notifs = await db.getAll();
  res.json({ success: true, data: notifs.slice(0, 5) });
});

// ============================================================
// 🗑️ DELETE /webhook/reset — Hapus semua (reset demo)
// ============================================================
app.delete('/webhook/reset', async (req, res) => {
  await db.deleteAll();
  console.log('\n🗑️  Data direset!');
  res.json({ success: true, message: '🗑️ Semua data berhasil dihapus! Siap demo ulang.' });
});

// ============================================================
// 🚀 JALANKAN SERVER
// ============================================================
async function start() {
  try {
    await db.init(); // Inisialisasi tabel di database

    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ═══════════════════════════════════════════');
      console.log('   WEBHOOK SERVER BERJALAN!');
      console.log('═══════════════════════════════════════════════');
      console.log(`   🖥️  Local   : http://localhost:${PORT}`);

      if (process.env.KOYEB_PUBLIC_DOMAIN) {
        console.log(`   ☁️  Koyeb   : https://${process.env.KOYEB_PUBLIC_DOMAIN}`);
        console.log(`   📡  Endpoint: https://${process.env.KOYEB_PUBLIC_DOMAIN}/webhook`);
        console.log('═══════════════════════════════════════════════');
        console.log('⏳ Menunggu webhook masuk...\n');
        return;
      }

      // Cek apakah ngrok.exe ada di folder lokal
      const ngrokExe = path.join(__dirname, 'ngrok.exe');
      const authtoken = process.env.NGROK_AUTHTOKEN;
      const domain    = process.env.NGROK_DOMAIN;

      if (fs.existsSync(ngrokExe) && authtoken && domain) {
        exec(`"${ngrokExe}" config add-authtoken ${authtoken}`, (err) => {
          if (err) {
            console.log('   ⚠️  Gagal set authtoken ngrok:', err.message);
          }

          const ngrokCmd = `"${ngrokExe}" http --domain=${domain} ${PORT}`;
          const ngrokProcess = exec(ngrokCmd);

          setTimeout(() => {
            console.log('');
            console.log('🔒 ═══════════════════════════════════════════');
            console.log('   NGROK AKTIF — URL TETAP (tidak berubah!)');
            console.log('═══════════════════════════════════════════════');
            console.log('');
            console.log(`   📡  https://${domain}/webhook`);
            console.log('');
            console.log('═══════════════════════════════════════════════');
            console.log('   Info untuk Tim Frontend Mobile:');
            console.log('───────────────────────────────────────────────');
            console.log('   Method  : POST');
            console.log(`   URL     : https://${domain}/webhook`);
            console.log('   Header  : Content-Type: application/json');
            console.log(`   Body    : {"message": "isi pesan"}`);
            console.log('═══════════════════════════════════════════════');
            console.log('');
            console.log('⏳ Menunggu webhook masuk...\n');
          }, 2000);

          ngrokProcess.on('close', (code) => {
            if (code !== 0) console.log('\n⚠️  ngrok berhenti.');
          });
        });
      } else {
        console.log('═══════════════════════════════════════════════');
        console.log('⏳ Menunggu webhook masuk...\n');
      }
    });
  } catch (err) {
    console.error('❌ Gagal koneksi database:', err.message);
    console.error('   Pastikan DATABASE_URL di .env sudah diisi dengan benar!');
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  start();
} else {
  db.init().catch(err => console.error('DB init err:', err.message));
}

module.exports = app;
