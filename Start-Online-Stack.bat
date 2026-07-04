@echo off
chcp 65001 >nul
title The Master FC - Online Stack (API + Tunnel)
cd /d "%~dp0"

echo.
echo  เปิด 2 หน้าต่าง: Home API + Cloudflare Tunnel
echo  อย่าปิดทั้งคู่ — ปิด = เกมออนไลน์หยุด
echo.

start "The Master FC - Home API" cmd /k "%~dp0Start-Home-Server.bat"
timeout /t 3 /nobreak >nul
start "The Master FC - Tunnel" cmd /k "%~dp0Start-Home-Tunnel.bat"

echo  เปิดแล้ว — ทดสอบ https://api.themasterfc.com/health
pause
