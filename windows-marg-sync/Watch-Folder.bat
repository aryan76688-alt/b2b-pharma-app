@echo off
title MARG ERP 9+ Live Export Folder Watcher
color 0E
echo ========================================================
echo   MARG ERP 9+ Continuous Background Sync Watcher
echo ========================================================
echo.
echo Monitoring configured folder for new MARG exports...
echo Keep this window minimized to auto-sync 24/7.
echo (Press Ctrl+C to close)
echo.

cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sync-Marg.ps1" -Watch

pause
