@echo off
chcp 65001 >nul
title The Socker Manager
cd /d "C:\Users\arnlo\OneDrive\Desktop\OLARN Projects\Made your club"

echo.
echo  ========================================
echo    THE SOCKER MANAGER - กำลังเปิดเกม...
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
)

echo เริ่มเกม (เว็บ local)...
start "The Socker Manager" cmd /k "cd /d "C:\Users\arnlo\OneDrive\Desktop\OLARN Projects\Made your club" && npm run dev -w client"

echo รอเซิร์ฟเวอร์พร้อม...
timeout /t 4 /nobreak >nul

start "" "http://localhost:5173"

echo.
echo  เปิดเบราว์เซอร์แล้ว: http://localhost:5173
echo  กดปุ่ม "ลองเล่นเลย" ในหน้าเกม
echo  ปิดหน้าต่าง Server เพื่อหยุดเกม
echo.
pause
