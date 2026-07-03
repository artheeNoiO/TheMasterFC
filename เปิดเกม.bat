@echo off
chcp 65001 >nul
title The Master Football Club
cd /d "%~dp0"

echo.
echo  ========================================
echo    The Master Football Club - กำลังเปิดเกม...
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] ไม่พบ Node.js — ติดตั้งจาก https://nodejs.org ก่อน
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo ติดตั้งแพ็กเกจครั้งแรก รอสักครู่...
  call npm install
  call npm run db:generate
  call npm run db:push
)

echo เริ่มเซิร์ฟเวอร์เกม...
start "The Master Football Club - Server" cmd /k "cd /d "%~dp0" && npm run dev"

echo รอเซิร์ฟเวอร์พร้อม...
timeout /t 6 /nobreak >nul

start "" "http://localhost:5173"

echo.
echo  เปิดเบราว์เซอร์แล้ว: http://localhost:5173
echo  ปิดหน้าต่าง "The Master Football Club - Server" เพื่อหยุดเกม
echo.
pause
