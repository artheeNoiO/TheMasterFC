@echo off
title The Master FC - Setup Online Bridge
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup-Online-Bridge.ps1"
