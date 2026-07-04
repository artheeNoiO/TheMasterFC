@echo off
chcp 65001 >nul
title The Master FC - Reset Server (Local)
cd /d "%~dp0"

echo.
echo ========================================
echo   Reset Server — เริ่มต้นใหม่ทั้งหมด (Local)
echo ========================================
echo.
echo จะลบข้อมูลใน:
echo   - server\prisma\dev.db  (ผู้ใช้ / สโมสร / ลีก)
echo   - server\data\feedback.json
echo.
echo ไม่กระทบ Cloudflare KV (บัญชีบน themasterfc.com)
echo ถ้าต้องการล้างบัญชี production ให้รัน Reset-Cloudflare-KV.bat
echo.
set /p CONFIRM=พิมพ์ YES แล้ว Enter เพื่อยืนยัน: 
if /I not "%CONFIRM%"=="YES" (
  echo ยกเลิก
  pause
  exit /b 0
)

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found
  pause
  exit /b 1
)

echo.
echo [1/2] Reset SQLite database...
cd /d "%~dp0server"
set PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=YES
call npx prisma db push --force-reset --accept-data-loss
if errorlevel 1 (
  echo DB RESET FAILED — ปิด server ที่รันอยู่ก่อน แล้วลองใหม่
  cd /d "%~dp0"
  pause
  exit /b 1
)

echo.
echo [2/2] Reset feedback.json...
cd /d "%~dp0"
echo {"entries":[],"votes":{}}> "server\data\feedback.json"

echo.
echo SUCCESS — Local server ว่างแล้ว
echo รัน Start-Game-Server.bat เพื่อเปิด server ใหม่
echo.
pause
