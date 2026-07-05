@echo off
chcp 65001 >nul
title The Master Football Club - TEST (isolated, ไม่แตะฐานข้อมูลจริง)
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found — install from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing packages, please wait...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
  )
)

echo ============================================================
echo  TEST SERVER — แยกฐานข้อมูลจากของจริงเต็มที่ (server\prisma\test.db)
echo  Client:  http://localhost:5174/play
echo  API:     http://localhost:3002
echo  ปิดสองหน้าต่างที่เปิดขึ้นเพื่อหยุด
echo ============================================================
echo.

start "TMFC TEST - server:3002" cmd /k "cd /d "%~dp0server" && set DOTENV_CONFIG_PATH=.env.test&& set PORT=3002&& npm run dev"
start "TMFC TEST - client:5174" cmd /k "cd /d "%~dp0client" && set VITE_API_URL=http://localhost:3002&& npx vite --port 5174 --strictPort"

echo เปิด 2 หน้าต่างแล้ว (server + client) — เข้าเล่นทดสอบที่ http://localhost:5174/play
pause
