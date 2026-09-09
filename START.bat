@echo off
title 🚀 Webhook Server + ngrok
color 0A
cls
echo.
echo  =============================================
echo    WEBHOOK SERVER + NGROK STATIC URL
echo  =============================================
echo.
echo  Memulai server + ngrok otomatis...
echo  URL tetap akan muncul di bawah.
echo.
cd /d %~dp0
node server.js
pause
