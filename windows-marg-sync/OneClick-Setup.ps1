<#
.SYNOPSIS
    MARG ERP 9+ to B2B App - Automated 1-Click Windows Setup (Tailscale Edition)
.DESCRIPTION
    Configures Tailscale connection, creates Desktop shortcuts, and sets up
    the Chrome Extension and folder watcher for instant synchronization.
#>

[CmdletBinding()]
param()

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir = Split-Path -Parent $ScriptDir
$ExtensionDir = Join-Path $BaseDir "marg-bridge-extension"

$TailscaleServerUrl = "http://100.69.194.11:3000"
$SecretKey = "shreeji-marg-sync-secret-2026"

Clear-Host
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "     MARG ERP 9+ -> Next.js B2B App 1-Click Windows Setup         " -ForegroundColor Yellow
Write-Host "                  (Tailscale Network Bridge)                      " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check & Verify Tailscale Server Connection
Write-Host "[1/4] Testing Tailscale Connection to Server ($TailscaleServerUrl)..." -ForegroundColor Cyan

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $SecretKey"
    "x-api-key" = $SecretKey
}
$body = @{ ping = $true } | ConvertTo-Json

$serverOnline = $false
try {
    $res = Invoke-RestMethod -Uri "$TailscaleServerUrl/api/import/stock" -Method Post -Headers $headers -Body $body -TimeoutSec 5 -ErrorAction Stop
    if ($res.success) {
        Write-Host "  -> [SUCCESS] Connected to Next.js server via Tailscale!" -ForegroundColor Green
        Write-Host "     Status: $($res.message)" -ForegroundColor Green
        $serverOnline = $true
    }
} catch {
    Write-Host "  -> [INFO] Server at $TailscaleServerUrl is currently waiting or starting." -ForegroundColor Yellow
    Write-Host "     Make sure Tailscale is connected on this PC and server is running." -ForegroundColor Gray
}

# 2. Configure config.json
Write-Host ""
Write-Host "[2/4] Configuring windows-marg-sync/config.json..." -ForegroundColor Cyan

$configPath = Join-Path $ScriptDir "config.json"
$configObj = @{
    appUrl = $TailscaleServerUrl
    secretKey = $SecretKey
    margExportFolder = "./exports"
    archiveFolder = "./exports/archive"
    autoArchive = $true
    syncIntervalSeconds = 60
    supportedExtensions = @(".xlsx", ".xls", ".csv")
}

$configObj | ConvertTo-Json -Depth 4 | Set-Content -Path $configPath -Encoding UTF8
Write-Host "  -> [SUCCESS] config.json pre-configured with Tailscale endpoint!" -ForegroundColor Green

# 3. Create Windows Desktop Shortcuts
Write-Host ""
Write-Host "[3/4] Creating Desktop Shortcuts..." -ForegroundColor Cyan

try {
    $WshShell = New-Object -ComObject WScript.Shell
    $DesktopPath = [Environment]::GetFolderPath("Desktop")

    # Shortcut 1: Sync Now
    $syncBatPath = Join-Path $ScriptDir "Sync-Now.bat"
    $shortcut1 = $WshShell.CreateShortcut((Join-Path $DesktopPath "Sync MARG Stock Now.lnk"))
    $shortcut1.TargetPath = $syncBatPath
    $shortcut1.WorkingDirectory = $ScriptDir
    $shortcut1.Description = "1-Click Sync MARG ERP Stock to B2B App via Tailscale"
    $shortcut1.IconLocation = "shell32.dll,238"
    $shortcut1.Save()

    # Shortcut 2: Watch Folder
    $watchBatPath = Join-Path $ScriptDir "Watch-Folder.bat"
    $shortcut2 = $WshShell.CreateShortcut((Join-Path $DesktopPath "Watch MARG Export Folder.lnk"))
    $shortcut2.TargetPath = $watchBatPath
    $shortcut2.WorkingDirectory = $ScriptDir
    $shortcut2.Description = "Continuous Auto-Sync for MARG Export Folder"
    $shortcut2.IconLocation = "shell32.dll,246"
    $shortcut2.Save()

    Write-Host "  -> [SUCCESS] Created 'Sync MARG Stock Now' shortcut on Desktop!" -ForegroundColor Green
    Write-Host "  -> [SUCCESS] Created 'Watch MARG Export Folder' shortcut on Desktop!" -ForegroundColor Green
} catch {
    Write-Host "  -> [WARN] Could not create desktop shortcuts: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. Chrome Extension Setup
Write-Host ""
Write-Host "[4/4] Setting up Chrome Extension Bridge..." -ForegroundColor Cyan
Write-Host "  Extension Path: $ExtensionDir" -ForegroundColor Yellow

$openChrome = Read-Host "Would you like to open Google Chrome Extensions page now? (Y/N)"
if ($openChrome -eq 'Y' -or $openChrome -eq 'y' -or [string]::IsNullOrWhiteSpace($openChrome)) {
    try {
        Start-Process "chrome.exe" "chrome://extensions"
    } catch {
        try {
            Start-Process "chrome://extensions"
        } catch {
            Write-Host "  Please open chrome://extensions in Google Chrome." -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Yellow
    Write-Host "               3 QUICK STEPS TO ACTIVATE IN CHROME:               " -ForegroundColor Cyan
    Write-Host "==================================================================" -ForegroundColor Yellow
    Write-Host " 1. Turn ON 'Developer mode' (toggle in top-right corner of Chrome)" -ForegroundColor White
    Write-Host " 2. Click 'Load unpacked' (button in top-left corner)" -ForegroundColor White
    Write-Host " 3. Select this folder:" -ForegroundColor White
    Write-Host "    $ExtensionDir" -ForegroundColor Yellow
    Write-Host ""
    Write-Host " -> The extension is ALREADY pre-configured with Tailscale URL!" -ForegroundColor Green
    Write-Host "    Just click the extension icon to test link or upload files." -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup Completed Successfully!" -ForegroundColor Green
Write-Host "Tailscale is isolated specifically for the extension & MARG bridge." -ForegroundColor Gray
Write-Host "The mobile APK and public webapp remain on their public domains." -ForegroundColor Gray
Write-Host ""
