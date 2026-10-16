# MARG ERP & Books to B2B Pharma Chrome Extension Bridge (Manifest V3)

A Chrome Extension bridge to extract, upload, and sync live inventory, stock batches, and outstanding data from **MARG Books Cloud** or exported **.XLS / .XLSX** files to your **Next.js B2B Pharmaceutical app** (`/api/import/stock`).

---

## 📁 Extension Folder Structure

```text
marg-bridge-extension/
├── manifest.json              # Chrome Manifest V3 configuration (includes downloads permission)
├── lib/
│   └── xlsx.full.min.js       # Bundled SheetJS for offline .XLS (BIFF8) & .XLSX parsing
├── icons/                     # Standard pixel-accurate PNG icons
│   ├── icon-16.png            # 16x16 icon
│   ├── icon-48.png            # 48x48 icon
│   └── icon-128.png           # 128x128 icon
├── popup/                     # Configuration & Upload UI
│   ├── popup.html             # Drag-and-drop zone, Upload .XLS, Upload .XLSX, Download Sync
│   ├── popup.css              # Custom Tailwind-style utility CSS
│   └── popup.js               # Auto-read & auto-update parser via SheetJS
├── content/                   # Web page injection & scrapers
│   ├── content.js             # Floating sync pill, DOM scraper, on-screen upload & dropzone
│   ├── content.css            # Scoped floating widget & toast styles
│   └── interceptor.js         # MAIN world script capturing in-page Fetch & XHR responses
├── background/                # Ephemeral background service worker
│   └── service-worker.js      # Secure HTTPS/POST pipeline & download completion watcher
├── README.md                  # This setup guide
└── CHROMEWEBSTORE.md          # Store listing metadata & permissions justifications
```

---

## 🚀 How to Install (Load Unpacked Extension)

1. Open **Google Chrome**.
2. In the URL address bar, enter: `chrome://extensions`.
3. In the top-right corner, toggle on **Developer mode**.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the folder:
   ```text
   /home/aryan/B2B/marg-bridge-extension
   ```
6. If updating an already loaded version, click the **Reload (↻)** icon on the extension card.
7. Pin the extension to your Chrome toolbar for 1-click access.

---

## 📄 Three Ways to Sync Stock

### 1. Drag & Drop or Upload (.XLS / .XLSX) in Extension Popup
1. Click the **MARG Bridge** icon in your Chrome toolbar.
2. You will see:
   - **`[ 📄 Upload .XLS File ]`**: Click to pick a classic MARG `.xls` export.
   - **`[ 📊 Upload .XLSX File ]`**: Click to pick a modern Excel `.xlsx` file.
   - **Drag & Drop Zone**: Simply drag any `.xls` or `.xlsx` file from your computer or Chrome download bar directly into the box!
3. **Instant Auto-Read & Auto-Update**:
   - The extension immediately parses all columns (`Code`, `Product Name`, `Unit`, `Current Stock`, `Batch`, `EXP`, `M.R.P.`, `Sales Price`, `Company`).
   - Normalizes dates (`01-Sep-28` -> `2028-09-01`, `01-Jun-31` -> `2031-06-01`, etc.).
   - Posts directly to `/api/import/stock`.
   - Displays: `✅ Synced Successfully! X Products, Y Batches updated.`

### 2. Auto-Sync Downloaded Stock Files
1. In the popup, enable **Download Auto-Sync** toggle.
2. Click **⚡ Sync Latest Downloaded File** to instantly sync the most recent stock export downloaded in Chrome.

### 3. Floating Button inside MARG Books (`margbooks.com`)
1. On `margbooks.com`, open **Reports > Current Stock**.
2. Click the floating **`[ 💊 Sync Stock to B2B App ]`** button on the bottom right.
3. Or click the dropdown menu to use **Upload .XLS File** or **Upload .XLSX File** directly inside the page!

---

## ⚙️ Server Configuration
In the extension popup (Server Connection Settings):
- **Next.js App URL**: `https://shreejiapp.com` (or `http://localhost:3000` for testing).
- **Authorization Secret Key**: Matches `MARG_SYNC_SECRET` in your `.env.local`.
- Click **Test Link** to verify the connection.
