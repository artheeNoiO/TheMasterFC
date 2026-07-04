@echo off
chcp 65001 >nul
title The Master FC - Reset Cloudflare KV (Auth + Online)
cd /d "%~dp0client"

echo.
echo ========================================
echo   Reset Cloudflare KV — themasterfc.com
echo ========================================
echo.
echo จะลบ key ทั้งหมด prefix auth:* และ hb:*
echo Namespace: online-status
echo.
set /p CONFIRM=พิมพ์ YES แล้ว Enter เพื่อยืนยัน: 
if /I not "%CONFIRM%"=="YES" (
  echo ยกเลิก
  pause
  exit /b 0
)

node scripts/reset-kv.mjs auth: hb:
echo.
pause
