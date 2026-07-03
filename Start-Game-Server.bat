@echo off
chcp 65001 >nul
title The Master Football Club - Server
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

echo Starting client :5173 + API :3001 ...
call npm run dev
echo.
echo Server stopped.
pause
