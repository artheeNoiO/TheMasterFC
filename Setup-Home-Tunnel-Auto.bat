@echo off
title The Master FC - Setup Home Tunnel
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup-Home-Tunnel-Auto.ps1"
pause
