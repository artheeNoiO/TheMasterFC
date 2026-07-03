@echo off
chcp 65001 >nul
title The Socker Manager - Cloudflare Tunnel
cd /d "%~dp0"

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo.
  echo  [ERROR] ไม่พบ cloudflared
  echo.
  echo  ติดตั้ง:
  echo    winget install Cloudflare.cloudflared
  echo  หรือดาวน์โหลดจาก https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
  echo.
  echo  ครั้งแรก: cloudflared tunnel login
  echo  อ่านขั้นตอนเต็มใน HOME-SERVER.txt
  echo.
  pause
  exit /b 1
)

if not exist "cloudflared-config.yml" (
  echo.
  echo  ยังไม่มี cloudflared-config.yml
  echo  คัดลอก cloudflared-config.example.yml แล้วแก้ hostname / credentials-file
  echo.
  if exist "cloudflared-config.example.yml" copy /Y "cloudflared-config.example.yml" "cloudflared-config.yml" >nul
  echo  สร้าง cloudflared-config.yml จาก template แล้ว — แก้ค่าให้ถูกก่อนรันอีกครั้ง
  pause
  exit /b 1
)

echo  เปิด tunnel — ต้องรัน Start-Home-Server.bat คู่กัน
echo  กด Ctrl+C เพื่อหยุด tunnel
echo.

cloudflared tunnel --config "%~dp0cloudflared-config.yml" run
