@echo off
chcp 65001 >nul
title อัพเว็บ The Master FC
cd /d "%~dp0"
echo.
echo  ========================================
echo   อัพเว็บ themasterfc.com (Cloudflare)
echo  ========================================
echo.
echo  ใช้เมื่อแก้โค้ดแล้วอยากให้เว็บจริงอัพเดต
echo  ดับเบิลคลิกไฟล์นี้ รอจน SUCCESS
echo.
call "%~dp0Deploy-Cloudflare.bat"
