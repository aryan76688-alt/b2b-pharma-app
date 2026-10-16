# MARG ERP 9+ (Windows Desktop) to Next.js B2B App Sync Suite

A Windows sync suite designed specifically for pharmaceutical distributors running **MARG ERP 9+ (desktop software on Windows)** to automatically sync live stock inventory, batches, MRP, PTR, and expiries to your Next.js B2B application via **Tailscale**.

---

## 🚀 1-Click Automated Setup for Windows (Tailscale Edition)

On your Windows computer (`desktop-00ctdtl`), simply double-click:
```text
OneClick-Setup.bat
```
This will automatically:
1. **Verify Tailscale Link**: Tests the connection to your server at `http://100.69.194.11:3000`.
2. **Auto-Configure `config.json`**: Sets up the server URL and authorization secret key.
3. **Create Windows Desktop Shortcuts**:
   - `Sync MARG Stock Now` (1-click immediate sync)
   - `Watch MARG Export Folder` (continuous background auto-sync)
4. **Launch Chrome Extensions**: Opens `chrome://extensions` ready for you to click "Load unpacked" and select `marg-bridge-extension`.

> **Note on Tailscale Isolation**:
> Tailscale is used **strictly for the Extension and MARG Desktop Sync Bridge**.
> The Android Mobile APK (for salesmen) and the public customer webapp remain on their public URLs and are completely unaffected.

---

## 📁 Windows Sync Suite Files

```text
windows-marg-sync/
├── OneClick-Setup.bat     # ⚡ 1-Click Automated Installer for Windows
├── OneClick-Setup.ps1     # Automated configuration and shortcut generator
├── config.json            # Configuration file (Pre-configured with Tailscale URL)
├── Sync-Now.bat           # 1-Click Desktop Shortcut (Double-click to sync immediately)
├── Watch-Folder.bat       # Continuous 24/7 background folder watcher
├── Sync-Marg.ps1          # Native Windows PowerShell sync script (No Node/Python needed!)
├── marg-sync.js           # Fast Node.js sync engine (Supports .xlsx, .xls, .csv)
├── marg-sync.py           # Python sync engine alternative (Zero dependencies for CSV)
├── exports/               # Drop your exported MARG stock files here
│   ├── SAMPLE_MARG_STOCK.csv   # Sample test file
│   └── archive/           # Automatically moves synced files here with timestamps
└── README.md              # This setup guide
```

---

## 🚀 How to Export Stock from MARG ERP 9+

In MARG ERP 9+ on your Windows machine:
1. Go to **Reports** > **Stock Report** > **Closing Stock** (or press shortcut `Alt + P`).
2. In the report window, press `F10` (or click **Print / Export**).
3. Select **Excel** or **CSV** (Comma Separated Values).
4. Save the file to your configured folder (e.g., `windows-marg-sync\exports` or `C:\MARG\EXPORT`).

---

## 🔄 Two Ways to Sync on Windows

### Method 1: 1-Click Sync (`Sync MARG Stock Now` on Desktop)
1. Whenever you finish billing or update stock in MARG ERP, export the report.
2. Double-click the **`Sync MARG Stock Now`** shortcut on your Desktop.
3. A terminal window will open and display:
   ```text
   [SYNC] Processing file: STOCK_REPORT.XLS
     -> Mapped columns: Code, Name, Batch, Exp, Stock, MRP, PTR
   [UPLOAD] Sending products and batches to server via Tailscale...
   [SUCCESS] Stock synced successfully!
             Products created: 5, updated: 0
             Batches created:  5, updated: 0
   ```

### Method 2: 24/7 Automated Background Watcher (`Watch MARG Export Folder`)
1. Double-click the **`Watch MARG Export Folder`** shortcut and leave it minimized on your Windows taskbar.
2. Every time a new stock file is exported by MARG (manually or via MARG Scheduler), it will instantly detect the file, upload it to the B2B App, and archive it with a timestamp.

---

## ⚙️ Manual Configuration (Optional)
If you ever need to change settings, open `windows-marg-sync\config.json`:
```json
{
  "appUrl": "http://100.69.194.11:3000",
  "secretKey": "shreeji-marg-sync-secret-2026",
  "margExportFolder": "./exports",
  "archiveFolder": "./exports/archive",
  "autoArchive": true,
  "syncIntervalSeconds": 60
}
```
- **`appUrl`**: The Tailscale IP of your server (`http://100.69.194.11:3000`).
- **`secretKey`**: Matches `MARG_SYNC_SECRET` in your Next.js `.env.local` file.
