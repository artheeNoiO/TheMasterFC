@echo off
chcp 65001 >nul
title The Socker Manager - Game Cron
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] ไม่พบ Node.js
  exit /b 1
)

if not exist "server\.env" (
  echo [ERROR] ไม่พบ server\.env — รัน Start-Home-Server.bat ก่อน
  exit /b 1
)

set JOB=%~1
if "%JOB%"=="" set JOB=day-tick

node server/scripts/run-cron.js %JOB%
