@echo off
title MARG ERP 9+ to B2B App Sync
color 0B
echo ========================================================
echo   MARG ERP 9+ Desktop - 1-Click B2B Stock Sync
echo ========================================================
echo.

cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sync-Marg.ps1"

echo.
echo ========================================================
echo Sync finished.
pause
