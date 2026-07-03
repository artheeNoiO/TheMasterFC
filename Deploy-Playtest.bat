@echo off
chcp 65001 >nul
title Deploy The Master Football Club
cd /d "C:\Users\arnlo\OneDrive\Desktop\OLARN Projects\Made your club"

echo.
echo  ============================================
echo   The Master Football Club — Deploy Playtest
echo  ============================================
echo.
echo  ขั้นที่ 1: Login Vercel (ครั้งแรกเท่านั้น)
echo  ขั้นที่ 2: Deploy ขึ้นเว็บ
echo.
echo  อ่าน DEPLOY.txt สำหรับโดเมน + API ออนไลน์
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] ติดตั้ง Node.js จาก https://nodejs.org ก่อน
  pause
  exit /b 1
)

call npx vercel login
if errorlevel 1 (
  echo Login ไม่สำเร็จ
  pause
  exit /b 1
)

call npm run build -w client
call npx vercel --prod

echo.
echo  เสร็จแล้ว — คัดลอก URL ที่ Vercel แสดง แชร์ให้เพื่อนลองเล่น
echo  ตั้งโดเมน themasterfc.com ตาม DEPLOY.txt
echo.
pause
