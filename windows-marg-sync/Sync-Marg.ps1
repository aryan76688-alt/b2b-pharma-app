<#
.SYNOPSIS
    MARG ERP 9+ Desktop to Next.js B2B App Sync Engine (Native Windows PowerShell)
.DESCRIPTION
    Extracts stock, batch, MRP, PTR, and expiry data exported from MARG ERP
    on Windows and synchronizes directly with the Next.js B2B Pharmaceutical app.
.EXAMPLE
    .\Sync-Marg.ps1
    .\Sync-Marg.ps1 -Test
    .\Sync-Marg.ps1 -Watch
    .\Sync-Marg.ps1 -FilePath "C:\MARG\EXPORT\STOCK.CSV"
#>

[CmdletBinding()]
param (
    [switch]$Test,
    [switch]$Watch,
    [string]$FilePath = "",
    [string]$ConfigPath = "config.json"
)

# Set UTF-8 encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Load Configuration
if (-not [System.IO.Path]::IsPathRooted($ConfigPath)) {
    $ResolvedConfig = Join-Path $ScriptDir $ConfigPath
} else {
    $ResolvedConfig = $ConfigPath
}

if (-not (Test-Path $ResolvedConfig)) {
    Write-Host "[ERROR] Configuration file not found at: $ResolvedConfig" -ForegroundColor Red
    exit 1
}

$ConfigRaw = Get-Content -Raw -Path $ResolvedConfig | ConvertFrom-Json
$AppUrl = $ConfigRaw.appUrl.Trim().TrimEnd('/')
$SecretKey = $ConfigRaw.secretKey.Trim()
$ExportFolder = if ([System.IO.Path]::IsPathRooted($ConfigRaw.margExportFolder)) { $ConfigRaw.margExportFolder } else { Join-Path $ScriptDir $ConfigRaw.margExportFolder }
$ArchiveFolder = if ([System.IO.Path]::IsPathRooted($ConfigRaw.archiveFolder)) { $ConfigRaw.archiveFolder } else { Join-Path $ScriptDir $ConfigRaw.archiveFolder }
$SyncInterval = if ($ConfigRaw.syncIntervalSeconds) { [int]$ConfigRaw.syncIntervalSeconds } else { 60 }

# Ensure directories exist
if (-not (Test-Path $ExportFolder)) { New-Item -ItemType Directory -Path $ExportFolder -Force | Out-Null }
if (-not (Test-Path $ArchiveFolder)) { New-Item -ItemType Directory -Path $ArchiveFolder -Force | Out-Null }

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   MARG ERP 9+ Desktop -> Next.js B2B Sync Engine   " -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Target Server : $AppUrl" -ForegroundColor Gray
Write-Host "Export Folder : $ExportFolder" -ForegroundColor Gray
Write-Host ""

# Helper: Parse clean numbers
function Clean-Number([string]$val) {
    if ([string]::IsNullOrWhiteSpace($val)) { return 0 }
    $clean = $val -replace '[^0-9.-]', ''
    $num = 0.0
    if ([double]::TryParse($clean, [ref]$num)) {
        return $num
    }
    return 0
}

# Helper: Parse Expiry to ISO YYYY-MM-DD
function Parse-DateIso([string]$val) {
    if ([string]::IsNullOrWhiteSpace($val) -or $val -eq '-' -or $val -eq '--') { return $null }
    $clean = $val.Trim()

    # YYYY-MM-DD
    if ($clean -match '^\d{4}-\d{2}-\d{2}$') { return $clean }

    # DD/MM/YYYY or DD-MM-YYYY
    if ($clean -match '^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$') {
        $day = $matches[1].PadLeft(2, '0')
        $month = $matches[2].PadLeft(2, '0')
        $year = $matches[3]
        return "$year-$month-$day"
    }

    # MM/YY or MM-YY (e.g. 12/28)
    if ($clean -match '^(\d{1,2})[-/.](\d{2})$') {
        $month = $matches[1].PadLeft(2, '0')
        $year = "20" + $matches[2]
        return "$year-$month-01"
    }

    # .NET Date Parse fallback
    $parsedDate = [DateTime]::MinValue
    if ([DateTime]::TryParse($clean, [ref]$parsedDate)) {
        return $parsedDate.ToString("yyyy-MM-dd")
    }

    return $null
}

# 2. Test Connection Function
function Test-ServerConnection {
    Write-Host "[TEST] Testing connection to $AppUrl/api/import/stock..." -ForegroundColor Cyan
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $SecretKey"
        "x-api-key" = $SecretKey
    }
    $body = @{ ping = $true } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$AppUrl/api/import/stock" -Method Post -Headers $headers -Body $body -ErrorAction Stop
        if ($response.success) {
            Write-Host "[SUCCESS] $($response.message)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[FAILED] Server returned unsuccessful status." -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "[ERROR] Could not connect: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            Write-Host "        HTTP Status: $status" -ForegroundColor Red
        }
        return $false
    }
}

if ($Test) {
    $ok = Test-ServerConnection
    exit $(if ($ok) { 0 } else { 1 })
}

# 3. Parse and Sync Single File
function Sync-StockFile([string]$TargetFile) {
    if (-not (Test-Path $TargetFile)) {
        Write-Host "[WARN] File not found: $TargetFile" -ForegroundColor Yellow
        return $false
    }

    $FileObj = Get-Item $TargetFile
    $Ext = $FileObj.Extension.ToLower()
    Write-Host "[SYNC] Processing file: $($FileObj.Name) ($Ext)" -ForegroundColor Cyan

    $rows = @()

    if ($Ext -eq '.csv') {
        $rows = Import-Csv -Path $TargetFile
    } elseif ($Ext -in @('.xlsx', '.xls')) {
        # Try converting via Excel COM or notify user
        try {
            $excel = New-Object -ComObject Excel.Application
            $excel.Visible = $false
            $excel.DisplayAlerts = $false
            $wb = $excel.Workbooks.Open($TargetFile)
            $tempCsv = Join-Path ([System.IO.Path]::GetTempPath()) ("marg_" + [Guid]::NewGuid().ToString() + ".csv")
            $wb.SaveAs($tempCsv, 6) # 6 = xlCSV
            $wb.Close($false)
            $excel.Quit()
            [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
            [GC]::Collect()

            $rows = Import-Csv -Path $tempCsv
            Remove-Item -Path $tempCsv -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "[WARN] Excel COM read failed ($($_.Exception.Message))." -ForegroundColor Yellow
            Write-Host "       Tip: In MARG ERP, choose 'Export to CSV' or use the Node/Python sync engine." -ForegroundColor Yellow
            return $false
        }
    } else {
        Write-Host "[WARN] Unsupported file extension: $Ext" -ForegroundColor Yellow
        return $false
    }

    if ($rows.Count -eq 0) {
        Write-Host "[WARN] File contains no data rows." -ForegroundColor Yellow
        return $false
    }

    # Map column headers dynamically
    $firstRow = $rows[0]
    $headers = $firstRow.PSObject.Properties.Name

    $colCode = $headers | Where-Object { $_ -match '^(code|item\s*code|product\s*code|itemid)$' } | Select-Object -First 1
    $colName = $headers | Where-Object { $_ -match '(name|product\s*name|item\s*name|description|particular)' } | Select-Object -First 1
    $colCompany = $headers | Where-Object { $_ -match '(company|mfg|mfr|make|manufacturer|brand)' } | Select-Object -First 1
    $colUnit = $headers | Where-Object { $_ -match '(unit|pack|packing|uom)' } | Select-Object -First 1
    $colBatch = $headers | Where-Object { $_ -match '(batch|lot|b\.?\s*no)' } | Select-Object -First 1
    $colExp = $headers | Where-Object { $_ -match '(exp|expiry|validity)' } | Select-Object -First 1
    $colStock = $headers | Where-Object { $_ -match '(current\s*stock|stock|qty|closing|balance|available)' } | Select-Object -First 1
    $colMrp = $headers | Where-Object { $_ -match '(m\.?r\.?p\.?|max_price)' } | Select-Object -First 1
    $colPtr = $headers | Where-Object { $_ -match '(sales?\s*price|rate|ptr|sale\s*rate|net\s*rate)' } | Select-Object -First 1

    Write-Host "  -> Mapped columns: Name='$colName', Batch='$colBatch', Stock='$colStock', MRP='$colMrp', PTR='$colPtr'" -ForegroundColor Gray

    $productMap = @{}
    $batches = @()

    foreach ($r in $rows) {
        $codeVal = if ($colCode -and $r.$colCode) { $r.$colCode.ToString().Trim() } else { "" }
        $nameVal = if ($colName -and $r.$colName) { $r.$colName.ToString().Trim() } else { "" }

        if ([string]::IsNullOrWhiteSpace($codeVal) -and [string]::IsNullOrWhiteSpace($nameVal)) { continue }

        $productCode = if ($codeVal) { $codeVal } else { ($nameVal -replace '[^a-zA-Z0-9]', '').ToUpper().Substring(0, [Math]::Min(15, $nameVal.Length)) }
        $productName = if ($nameVal) { $nameVal } else { $productCode }
        $company = if ($colCompany -and $r.$colCompany) { $r.$colCompany.ToString().Trim() } else { "Unknown" }
        $unit = if ($colUnit -and $r.$colUnit) { $r.$colUnit.ToString().Trim() } else { "PCS" }

        if (-not $productMap.ContainsKey($productCode)) {
            $productMap[$productCode] = @{
                productCode = $productCode
                productName = $productName
                company = $company
                unit = $unit
            }
        }

        $batchNo = if ($colBatch -and $r.$colBatch) { $r.$colBatch.ToString().Trim() } else { "DEFAULT" }
        $expVal = if ($colExp -and $r.$colExp) { $r.$colExp.ToString().Trim() } else { "" }
        $expiryDate = Parse-DateIso $expVal
        $stockQty = if ($colStock -and $r.$colStock) { [Math]::Max(0, (Clean-Number $r.$colStock.ToString())) } else { 0 }
        $mrp = if ($colMrp -and $r.$colMrp) { Clean-Number $r.$colMrp.ToString() } else { 0 }
        $ptr = if ($colPtr -and $r.$colPtr) { Clean-Number $r.$colPtr.ToString() } else { 0 }

        $batches += @{
            productCode = $productCode
            batchNo = if ($batchNo) { $batchNo } else { "DEFAULT" }
            stockQty = $stockQty
            mrp = $mrp
            ptr = $ptr
            expiryDate = $expiryDate
        }
    }

    if ($batches.Count -eq 0) {
        Write-Host "[WARN] No valid stock rows could be parsed." -ForegroundColor Yellow
        return $false
    }

    $productsList = @($productMap.Values)
    $payloadObj = @{
        fileName = $FileObj.Name
        totalRows = $batches.Count
        products = $productsList
        batches = $batches
    }

    $payloadJson = $payloadObj | ConvertTo-Json -Depth 5 -Compress

    Write-Host "[UPLOAD] Sending $($productsList.Count) products & $($batches.Count) batches to $AppUrl/api/import/stock..." -ForegroundColor Cyan

    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $SecretKey"
        "x-api-key" = $SecretKey
    }

    try {
        $response = Invoke-RestMethod -Uri "$AppUrl/api/import/stock" -Method Post -Headers $headers -Body $payloadJson -ErrorAction Stop
        if ($response.success) {
            $sum = $response.summary
            Write-Host "[SUCCESS] Sync completed!" -ForegroundColor Green
            Write-Host "          Products created: $($sum.productsCreated), updated: $($sum.productsUpdated)" -ForegroundColor Green
            Write-Host "          Batches created:  $($sum.batchesCreated), updated:  $($sum.batchesUpdated)" -ForegroundColor Green

            # Archive processed file if enabled
            if ($ConfigRaw.autoArchive) {
                $timeTag = (Get-Date).ToString("yyyyMMdd_HHmmss")
                $destName = "$($FileObj.BaseName)_$timeTag$($FileObj.Extension)"
                $destPath = Join-Path $ArchiveFolder $destName
                Move-Item -Path $TargetFile -Destination $destPath -Force
                Write-Host "[ARCHIVE] Moved processed file to: $destPath" -ForegroundColor Gray
            }
            return $true
        } else {
            Write-Host "[FAILED] Import failed: $($response.error.message)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "[ERROR] Upload failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 4. Main Execution Mode
if ($Watch) {
    Write-Host "[WATCH] Monitoring folder: $ExportFolder every $SyncInterval seconds..." -ForegroundColor Cyan
    Write-Host "        (Press Ctrl+C to stop)" -ForegroundColor Gray
    while ($true) {
        $files = Get-ChildItem -Path $ExportFolder -File | Where-Object { $_.Extension.ToLower() -in @('.csv', '.xlsx', '.xls') } | Sort-Object LastWriteTime -Descending
        if ($files -and $files.Count -gt 0) {
            foreach ($f in $files) {
                Write-Host ""
                Write-Host "[NEW FILE] Found $($f.FullName)" -ForegroundColor Yellow
                Sync-StockFile -TargetFile $f.FullName
            }
        }
        Start-Sleep -Seconds $SyncInterval
    }
} else {
    # Single run mode
    if ($FilePath) {
        Sync-StockFile -TargetFile $FilePath
    } else {
        # Find latest file in export folder
        $latest = Get-ChildItem -Path $ExportFolder -File | Where-Object { $_.Extension.ToLower() -in @('.csv', '.xlsx', '.xls') } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latest) {
            Sync-StockFile -TargetFile $latest.FullName
        } else {
            Write-Host "[INFO] No export files found in $ExportFolder." -ForegroundColor Yellow
            Write-Host "       Please export your stock report from MARG ERP (Reports -> Stock Report -> Closing Stock -> Export) and place it here." -ForegroundColor Yellow
        }
    }
}
