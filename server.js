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

  const protocol = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const publicUrl = `${protocol}://${host}/webhook`;

  // Hitung metrik agregat
  let countPayment = 0;
  let countJson = 0;
  let countText = 0;
  let totalNominal = 0;

  const rows = notifs.map(n => {
    const tglObj = new Date(n.created_at);
    const tglFormatted = tglObj.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let category = 'text'; // 'payment' | 'json' | 'text'
    let contentHtml = '';
    let searchText = `${n.id} ${n.created_at} `;

    try {
      if (typeof n.message === 'string' && (n.message.startsWith('{') || n.message.startsWith('['))) {
        const p = JSON.parse(n.message);
        if (p && typeof p === 'object') {
          if (p.appSource || p.amount || p.payerName || p.rawMessage) {
            category = 'payment';
            countPayment++;
            if (p.amount && !isNaN(p.amount)) totalNominal += Number(p.amount);

            let badgeColor = '#475569';
            let badgeBg = '#f1f5f9';
            let badgeBorder = '#cbd5e1';

            const src = (p.appSource || '').toLowerCase();
            if (src.includes('dana')) {
              badgeColor = '#0284c7'; badgeBg = '#f0f9ff'; badgeBorder = '#bae6fd';
            } else if (src.includes('shopee')) {
              badgeColor = '#ea580c'; badgeBg = '#fff7ed'; badgeBorder = '#fed7aa';
            } else if (src.includes('gopay') || src.includes('gojek')) {
              badgeColor = '#059669'; badgeBg = '#ecfdf5'; badgeBorder = '#a7f3d0';
            } else if (src.includes('bca')) {
              badgeColor = '#1d4ed8'; badgeBg = '#eff6ff'; badgeBorder = '#bfdbfe';
            }

            const nominalStr = p.formattedAmount || (p.amount ? 'Rp ' + Number(p.amount).toLocaleString('id-ID') : '');
            searchText += `${p.appSource || ''} ${p.payerName || ''} ${p.type || ''} ${nominalStr} ${p.rawMessage || ''} `;

            contentHtml = `
              <div class="payload-card">
                <div class="meta-badges">
                  <span class="badge" style="color: ${badgeColor}; background: ${badgeBg}; border-color: ${badgeBorder};">${p.appSource || 'Payment Gateway'}</span>
                  ${nominalStr ? `<span class="badge-amount">${nominalStr}</span>` : ''}
                  ${p.payerName ? `<span class="meta-item">Pengirim: <strong>${p.payerName}</strong></span>` : ''}
                  ${p.type ? `<span class="badge-pill">${p.type}</span>` : ''}
                </div>
                ${p.rawMessage ? `<div class="message-quote" style="border-left-color: ${badgeColor};">${p.rawMessage.replace(/\\n/g, '<br>')}</div>` : ''}
                <details class="json-details">
                  <summary>Lihat Struktur JSON</summary>
                  <pre class="json-block">${JSON.stringify(p, null, 2)}</pre>
                </details>
              </div>
            `;
          } else {
            category = 'json';
            countJson++;
            const keys = Object.keys(p).slice(0, 6);
            const pills = keys.map(k => `<span class="pill-field"><strong>${k}:</strong> ${typeof p[k] === 'object' ? JSON.stringify(p[k]) : p[k]}</span>`).join('');
            searchText += `${JSON.stringify(p)} `;

            contentHtml = `
              <div class="payload-card">
                <div class="meta-badges">
                  <span class="badge badge-json">Objek JSON</span>
                </div>
                <div class="pill-container">${pills}</div>
                <details class="json-details">
                  <summary>Lihat Seluruh Payload JSON</summary>
                  <pre class="json-block">${JSON.stringify(p, null, 2)}</pre>
                </details>
              </div>
            `;
          }
        }
      }
    } catch (e) {}

    if (!contentHtml) {
      category = 'text';
      countText++;
      searchText += `${n.message} `;
      contentHtml = `
        <div class="payload-card">
          <div class="meta-badges">
            <span class="badge badge-text">Pesan Teks</span>
          </div>
          <div class="text-bubble">${n.message}</div>
        </div>
      `;
    }

    return `
      <tr class="event-row" data-category="${category}" data-search="${searchText.toLowerCase()}">
        <td class="col-id">${n.id}</td>
        <td class="col-content">${contentHtml}</td>
        <td class="col-date">${tglFormatted}</td>
      </tr>
    `;
  }).join('');

  const nominalFormatted = 'Rp ' + totalNominal.toLocaleString('id-ID');

  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Webhook Monitor — Konsol Manajemen Acara</title>
      <style>
        :root {
          --bg-main: #f8fafc;
          --card-bg: #ffffff;
          --border: #e2e8f0;
          --border-dark: #cbd5e1;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-muted: #94a3b8;
          --accent-blue: #0284c7;
          --accent-green: #16a34a;
          --accent-purple: #6366f1;
          --radius: 8px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: var(--bg-main);
          color: var(--text-primary);
          padding: 24px;
          line-height: 1.5;
        }

        .container {
          max-width: 1140px;
          margin: 0 auto;
        }

        /* Top Header */
        header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .header-title h1 {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--accent-green);
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent-green);
        }

        .header-title p {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: var(--radius);
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
          text-decoration: none;
        }

        .btn-primary {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .btn-primary:hover { background: #1e293b; }

        .btn-outline {
          background: #ffffff;
          color: var(--text-secondary);
          border-color: var(--border);
        }
        .btn-outline:hover {
          background: #f1f5f9;
          color: var(--text-primary);
        }

        .btn-danger {
          background: #ffffff;
          color: #dc2626;
          border-color: #fecaca;
        }
        .btn-danger:hover { background: #fef2f2; }

        /* Endpoint Card */
        .endpoint-banner {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 16px 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .endpoint-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .endpoint-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .endpoint-url-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .method-tag {
          font-size: 11px;
          font-weight: 700;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #dbeafe;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .endpoint-url {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 16px 18px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .stat-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        /* Controls: Search & Tabs */
        .controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 14px;
        }

        .filter-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .tab-btn {
          background: #ffffff;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.1s;
        }

        .tab-btn:hover { background: #f1f5f9; color: var(--text-primary); }
        .tab-btn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .search-box {
          position: relative;
          min-width: 240px;
        }

        .search-input {
          width: 100%;
          padding: 7px 12px;
          font-size: 13px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: #ffffff;
          color: var(--text-primary);
          outline: none;
        }
        .search-input:focus { border-color: #94a3b8; }

        /* Table Card */
        .table-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          margin-bottom: 24px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          background: #f8fafc;
          border-bottom: 1px solid var(--border);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-secondary);
          padding: 12px 18px;
        }

        td {
          border-bottom: 1px solid var(--border);
          padding: 14px 18px;
          vertical-align: top;
        }

        tr:last-child td { border-bottom: none; }
        tr.event-row:hover td { background: #fafafa; }

        .col-id {
          width: 70px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .col-date {
          width: 200px;
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        /* Payload Formatting */
        .payload-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .meta-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid transparent;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .badge-json { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }
        .badge-text { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }

        .badge-amount {
          font-size: 15px;
          font-weight: 700;
          color: var(--accent-green);
          letter-spacing: -0.01em;
        }

        .meta-item {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .badge-pill {
          font-size: 11px;
          background: #f1f5f9;
          color: #64748b;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .message-quote {
          font-size: 13px;
          color: #334155;
          background: #f8fafc;
          border-left: 3px solid #cbd5e1;
          padding: 6px 12px;
          border-radius: 4px;
        }

        .text-bubble {
          font-size: 14px;
          color: #1e293b;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 6px;
        }

        .pill-container {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .pill-field {
          font-size: 12px;
          background: #f1f5f9;
          color: #334155;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .json-details {
          margin-top: 4px;
        }

        .json-details summary {
          font-size: 12px;
          color: var(--accent-blue);
          cursor: pointer;
          user-select: none;
        }

        .json-block {
          background: #0f172a;
          color: #e2e8f0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          padding: 10px 12px;
          border-radius: 6px;
          margin-top: 6px;
          overflow-x: auto;
          line-height: 1.4;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: var(--text-muted);
          font-size: 14px;
        }

        /* Bottom Reference & Auto-refresh status */
        .bottom-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 12px;
        }

        .refresh-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .toggle-btn {
          font-size: 11px;
          background: none;
          border: 1px solid var(--border);
          padding: 2px 8px;
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .toggle-btn:hover { background: #f1f5f9; }

        /* Modal Dialog */
        .modal-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          z-index: 100;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-box {
          background: #ffffff;
          border-radius: var(--radius);
          width: 100%;
          max-width: 480px;
          padding: 24px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .modal-box h3 {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .modal-box p {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 18px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        
        <!-- Header -->
        <header>
          <div class="header-title">
            <h1>
              Webhook Monitor
              <span class="status-pill">
                <span class="status-dot"></span>
                Cloud 24/7 Aktif
              </span>
            </h1>
            <p>Konsol Pemantauan dan Penerimaan Data Notifikasi dari Aplikasi Mobile</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline" onclick="openTestModal()">Kirim Data Uji</button>
            <button class="btn btn-danger" onclick="openResetModal()">Reset Riwayat</button>
          </div>
        </header>

        <!-- Endpoint Banner -->
        <div class="endpoint-banner">
          <div class="endpoint-info">
            <span class="endpoint-label">Endpoint URL Publik (HTTP POST)</span>
            <div class="endpoint-url-wrap">
              <span class="method-tag">POST</span>
              <span class="endpoint-url" id="endpointUrl">${publicUrl}</span>
            </div>
          </div>
          <button class="btn btn-primary" id="copyBtn" onclick="copyEndpoint()">Salin Endpoint</button>
        </div>

        <!-- Metric Statistics -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Notifikasi Masuk</div>
            <div class="stat-value" id="statTotal">${notifs.length}</div>
            <div class="stat-sub">Tersimpan di Neon PostgreSQL</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Transaksi QRIS</div>
            <div class="stat-value" style="color: var(--accent-green);">${nominalFormatted}</div>
            <div class="stat-sub">${countPayment} transaksi e-wallet tercatat</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Data Terstruktur (JSON)</div>
            <div class="stat-value">${countJson}</div>
            <div class="stat-sub">Payload objek terurai otomatis</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Pesan Sederhana (Teks)</div>
            <div class="stat-value">${countText}</div>
            <div class="stat-sub">Format string dasar pemula</div>
          </div>
        </div>

        <!-- Controls: Filters & Real-time Search -->
        <div class="controls-bar">
          <div class="filter-tabs">
            <button class="tab-btn active" onclick="filterCategory('all', this)">Semua (${notifs.length})</button>
            <button class="tab-btn" onclick="filterCategory('payment', this)">E-Wallet & QRIS (${countPayment})</button>
            <button class="tab-btn" onclick="filterCategory('json', this)">Data JSON (${countJson})</button>
            <button class="tab-btn" onclick="filterCategory('text', this)">Pesan Teks (${countText})</button>
          </div>
          <div class="search-box">
            <input type="text" class="search-input" id="searchInput" placeholder="Cari ID, pengirim, nominal..." onkeyup="handleSearch()">
          </div>
        </div>

        <!-- Event Table -->
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th style="width: 70px;">ID</th>
                <th>Rincian Data Notifikasi / Payload</th>
                <th style="width: 200px;">Waktu Masuk (WIB)</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              ${rows || '<tr><td colspan="3" class="empty-state">Belum ada acara notifikasi masuk. Silakan kirim data ke endpoint di atas.</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Bottom Footer -->
        <div class="bottom-bar">
          <div>Basis Data: <strong>Neon PostgreSQL Cloud</strong> (Tabel <code>webhook_notif</code>)</div>
          <div class="refresh-status">
            <span id="refreshLabel">Pembaruan otomatis aktif (5 detik)</span>
            <button class="toggle-btn" id="refreshToggle" onclick="toggleAutoRefresh()">Jeda</button>
          </div>
        </div>

      </div>

      <!-- Modal Kirim Data Uji (Built-in Testing) -->
      <div class="modal-backdrop" id="testModal">
        <div class="modal-box">
          <h3>Kirim Data Uji Langsung</h3>
          <p>Pilih salah satu template payload untuk mencoba endpoint secara instan:</p>
          
          <div style="margin-bottom: 14px;">
            <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">Pilihan Template</label>
            <select id="templateSelect" onchange="loadTemplate()" style="width: 100%; padding: 8px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius);">
              <option value="text">Template 1: Pesan Teks Sederhana (Pemula)</option>
              <option value="dana">Template 2: Transaksi DANA QRIS Rp 75.000</option>
              <option value="shopee">Template 3: Transaksi ShopeePay Rp 200.000</option>
              <option value="custom">Template 4: Data Objek Custom Bebas</option>
            </select>
          </div>

          <div style="margin-bottom: 18px;">
            <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">Isi Body JSON</label>
            <textarea id="testPayload" rows="6" style="width: 100%; font-family: ui-monospace, monospace; font-size: 12px; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: #f8fafc;"></textarea>
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" onclick="closeTestModal()">Batal</button>
            <button class="btn btn-primary" id="btnSendTest" onclick="sendTestEvent()">Kirim Sekarang</button>
          </div>
        </div>
      </div>

      <!-- Modal Reset Confirmation -->
      <div class="modal-backdrop" id="resetModal">
        <div class="modal-box">
          <h3>Reset Riwayat Notifikasi</h3>
          <p>Tindakan ini akan menghapus seluruh catatan riwayat notifikasi dari basis data PostgreSQL. Gunakan tindakan ini untuk keperluan demonstrasi ulang.</p>
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="closeResetModal()">Batal</button>
            <button class="btn btn-danger" onclick="executeReset()">Ya, Hapus Semua</button>
          </div>
        </div>
      </div>

      <!-- Interactive Scripts -->
      <script>
        let currentCategory = 'all';
        let refreshTimer = null;
        let isAutoRefreshActive = true;

        // Auto Refresh Timer
        function scheduleRefresh() {
          if (refreshTimer) clearTimeout(refreshTimer);
          if (isAutoRefreshActive) {
            refreshTimer = setTimeout(() => {
              location.reload();
            }, 5000);
          }
        }
        scheduleRefresh();

        function toggleAutoRefresh() {
          isAutoRefreshActive = !isAutoRefreshActive;
          const btn = document.getElementById('refreshToggle');
          const lbl = document.getElementById('refreshLabel');
          if (isAutoRefreshActive) {
            btn.innerText = 'Jeda';
            lbl.innerText = 'Pembaruan otomatis aktif (5 detik)';
            scheduleRefresh();
          } else {
            btn.innerText = 'Lanjutkan';
            lbl.innerText = 'Pembaruan otomatis dijeda';
            if (refreshTimer) clearTimeout(refreshTimer);
          }
        }

        // Salin Endpoint
        function copyEndpoint() {
          const url = document.getElementById('endpointUrl').innerText;
          navigator.clipboard.writeText(url).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalText = btn.innerText;
            btn.innerText = 'Tersalin!';
            setTimeout(() => btn.innerText = originalText, 2000);
          });
        }

        // Filter Kategori
        function filterCategory(cat, el) {
          currentCategory = cat;
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          el.classList.add('active');
          applyFilters();
        }

        // Search Box
        function handleSearch() {
          applyFilters();
        }

        function applyFilters() {
          const query = document.getElementById('searchInput').value.toLowerCase().trim();
          const rows = document.querySelectorAll('.event-row');

          rows.forEach(row => {
            const rowCat = row.getAttribute('data-category');
            const rowSearch = row.getAttribute('data-search') || '';

            const matchCat = (currentCategory === 'all' || rowCat === currentCategory);
            const matchQuery = (query === '' || rowSearch.includes(query));

            if (matchCat && matchQuery) {
              row.style.display = '';
            } else {
              row.style.display = 'none';
            }
          });
        }

        // Templates Uji Coba
        const templates = {
          text: JSON.stringify({ message: "Halo dari aplikasi mobile tim frontend!" }, null, 2),
          dana: JSON.stringify({
            appSource: "DANA",
            amount: 75000,
            formattedAmount: "Rp 75.000",
            payerName: "AHMAD FAUZI",
            type: "qris_in",
            rawMessage: "DANA\\nKamu menerima Saldo DANA sebesar Rp 75.000 dari AHMAD FAUZI"
          }, null, 2),
          shopee: JSON.stringify({
            appSource: "ShopeePay",
            amount: 200000,
            formattedAmount: "Rp 200.000",
            payerName: "RUDI HERMAWAN",
            type: "qris_in",
            rawMessage: "ShopeePay\\nQRIS Rp200.000 berhasil diterima."
          }, null, 2),
          custom: JSON.stringify({
            user: "Dewi",
            event: "order_payment_success",
            order_id: "ORD-88231",
            total_items: 3
          }, null, 2)
        };

        function openTestModal() {
          document.getElementById('testModal').style.display = 'flex';
          loadTemplate();
        }

        function closeTestModal() {
          document.getElementById('testModal').style.display = 'none';
        }

        function loadTemplate() {
          const key = document.getElementById('templateSelect').value;
          document.getElementById('testPayload').value = templates[key] || '';
        }

        function sendTestEvent() {
          const payloadRaw = document.getElementById('testPayload').value;
          let bodyData;
          try {
            bodyData = JSON.parse(payloadRaw);
          } catch (err) {
            alert('Format JSON tidak valid: ' + err.message);
            return;
          }

          const btn = document.getElementById('btnSendTest');
          btn.disabled = true;
          btn.innerText = 'Mengirim...';

          fetch('/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
          })
          .then(res => res.json())
          .then(data => {
            closeTestModal();
            location.reload();
          })
          .catch(err => {
            alert('Gagal mengirim data: ' + err.message);
            btn.disabled = false;
            btn.innerText = 'Kirim Sekarang';
          });
        }

        // Reset Modal
        function openResetModal() {
          document.getElementById('resetModal').style.display = 'flex';
        }

        function closeResetModal() {
          document.getElementById('resetModal').style.display = 'none';
        }

        function executeReset() {
          fetch('/webhook/reset', { method: 'DELETE' })
            .then(r => r.json())
            .then(data => {
              closeResetModal();
              location.reload();
            });
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

  let message = req.body.message;

  // Jika tim mobile mengirim objek langsung tanpa field 'message',
  // atau mengirim field 'message' dalam bentuk objek JSON
  if (typeof message === 'object' && message !== null) {
    message = JSON.stringify(message);
  } else if (!message && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    message = JSON.stringify(req.body);
  }

  if (!message || (typeof message === 'string' && message.trim() === '')) {
    return res.status(400).json({
      success: false,
      error  : 'Data notifikasi tidak boleh kosong!',
      contoh : { message: 'Halo dari aplikasi mobile!' }
    });
  }

  const record = await db.insert(typeof message === 'string' ? message.trim() : JSON.stringify(message));
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
