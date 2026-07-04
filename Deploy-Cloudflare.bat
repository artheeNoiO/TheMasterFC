@echo off
title The Master FC - Deploy Cloudflare Pages
cd /d "%~dp0"

echo.
echo ========================================
echo   The Master FC - Cloudflare Deploy
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Install Node.js from https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo [1/2] Building website...
call npm run build --workspace=client
if errorlevel 1 (
  echo.
  echo BUILD FAILED
  echo.
  pause
  exit /b 1
)

echo.
echo [2/2] Deploying to Cloudflare Pages (dist + functions)...
echo First time: browser opens for Cloudflare login.
echo Project name: themasterfc
echo KV binding: ONLINE_KV (auth + online count ใช้ KV ตัวเดียวกัน)
echo.

cd /d "%~dp0client"
call npx wrangler pages deploy dist --project-name=themasterfc --commit-dirty=true --branch=master
set WR_EXIT=%ERRORLEVEL%
cd /d "%~dp0"
if not %WR_EXIT%==0 (
  echo.
  echo DEPLOY FAILED
  echo Try manual upload: see DEPLOY-CLOUDFLARE.txt
  echo Or run Publish-Website.bat and upload client\dist in Cloudflare dashboard.
  echo.
  pause
  exit /b 1
)

echo.
echo SUCCESS!
echo Next: Cloudflare Dashboard - Workers and Pages - themasterfc - Custom domains
echo Add: www.themasterfc.com and themasterfc.com
echo.
echo Online mode: run Setup-Online-Bridge.bat once, then set same GAME_PROVISION_SECRET on Render
echo.
pause
