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

echo ปิดเซิร์ฟเวอร์เก่าที่ค้างพอร์ต 5173 และ 3001...
powershell -NoProfile -Command ^
  "foreach ($p in 5173,3001) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
timeout /t 1 /nobreak >nul

echo เริ่มเกม (client + API server)...
start "The Master Football Club" "%~dp0Start-Game-Server.bat"

echo รอเซิร์ฟเวอร์พร้อม...
set /a WAIT=0
:wait_loop
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 2).StatusCode | Out-Null; exit 0 } catch { exit 1 }"
if %errorlevel%==0 goto server_ready
set /a WAIT+=1
if %WAIT% GEQ 40 (
  echo [WARN] รอนานเกิน 40 วินาที — ลองเปิดเบราว์เซอร์เองที่ http://localhost:5173/play
  goto open_browser
)
timeout /t 1 /nobreak >nul
goto wait_loop

:server_ready
echo เซิร์ฟเวอร์พร้อมแล้ว!

:open_browser
start "" "http://localhost:5173/play"

echo.
echo  เปิดเบราว์เซอร์แล้ว: http://localhost:5173/play
echo  API server: http://localhost:3001
echo  โหมดโลกจำลอง: เล่นในเบราว์เซอร์ได้เลย
echo.
echo  ถ้ายังไม่ขึ้น: ดูหน้าต่าง "The Master Football Club — Server"
echo  ปิดหน้าต่าง Server เพื่อหยุดเกม
echo.
pause
