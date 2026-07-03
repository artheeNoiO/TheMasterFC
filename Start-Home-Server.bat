@echo off
chcp 65001 >nul
title The Master Football Club - Home API Server
cd /d "%~dp0"

echo.
echo  ================================================
echo    HOME SERVER — API บนคอม (ไม่รวมระบบ live)
echo  ================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] ไม่พบ Node.js — ติดตั้งจาก https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo กำลังติดตั้ง packages...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install ล้มเหลว
    pause
    exit /b 1
  )
)

if not exist "server\.env" (
  echo ยังไม่มี server\.env — คัดลอกจาก template...
  copy /Y "server\.env.home-server.example" "server\.env" >nul
  echo.
  echo [สำคัญ] เปิด server\.env แล้วตั้ง CRON_SECRET เป็นค่าสุ่มยาวๆ ก่อนเปิดจริง
  echo         อ่าน HOME-SERVER.txt สำหรับ Cloudflare Tunnel + Vercel
  echo.
  pause
)

echo อัปเดตฐานข้อมูล SQLite...
call npm run db:generate -w server
call npm run db:push -w server
if errorlevel 1 (
  echo [ERROR] db:push ล้มเหลว
  pause
  exit /b 1
)

echo.
echo  กำลังเปิด API ที่ http://localhost:3001
echo  ทดสอบ: http://localhost:3001/health
echo.
echo  อย่าปิดหน้าต่างนี้ — ปิด = เกมออนไลน์หยุด
echo  เปิด tunnel อีกหน้าต่าง: Start-Home-Tunnel.bat
echo  เล่น dev ในเครื่อง: Play-Game.bat
echo.

set NODE_ENV=production
call npm start -w server

echo.
echo  API หยุดแล้ว
pause
