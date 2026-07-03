@echo off
title The Master FC - Build Website
cd /d "%~dp0"

echo.
echo ========================================
echo   The Master FC - Build Website
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Install Node.js from https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo Building...
call npm run build --workspace=client
if errorlevel 1 (
  echo.
  echo BUILD FAILED
  echo.
  pause
  exit /b 1
)

echo.
echo DONE. Website files are in:
echo %~dp0client\dist
echo.
echo Next: Cloudflare - Workers and Pages - Create - Pages - Upload assets
echo Select ALL files inside client\dist (Ctrl+A) and drag to upload.
echo.

start "" "%~dp0client\dist"
pause
