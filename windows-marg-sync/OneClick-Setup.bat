@echo off
title MARG ERP 9+ to B2B App - 1-Click Windows Setup
color 0B
echo ================================================================
echo   MARG ERP 9+ to Next.js B2B App - 1-Click Windows Setup
echo                  (Tailscale Network Bridge)
echo ================================================================
echo.

cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0OneClick-Setup.ps1"

echo.
echo ================================================================
echo Setup finished. Press any key to close.
pause
