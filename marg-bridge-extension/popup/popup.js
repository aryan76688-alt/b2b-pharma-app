// MARG Stock Sync - Popup Controller (Manifest V3)
document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const dropZone = document.getElementById('dropZone');
  const fileInputXls = document.getElementById('fileInputXls');
  const fileInputXlsx = document.getElementById('fileInputXlsx');
  const fileInputAny = document.getElementById('fileInputAny');
  const btnUploadXls = document.getElementById('btnUploadXls');
  const btnUploadXlsx = document.getElementById('btnUploadXlsx');
  const btnSyncLatestDownload = document.getElementById('btnSyncLatestDownload');
  const chkAutoSyncDownloads = document.getElementById('chkAutoSyncDownloads');
  const downloadSpinner = document.getElementById('downloadSpinner');

  const btnToggleSettings = document.getElementById('btnToggleSettings');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsChevron = document.getElementById('settingsChevron');
  const appUrlInput = document.getElementById('appUrl');
  const secretKeyInput = document.getElementById('secretKey');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const btnTestConnection = document.getElementById('btnTestConnection');

  const statusBadge = document.getElementById('statusBadge');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const noticeBox = document.getElementById('noticeBox');
  const noticeText = document.getElementById('noticeText');
  const noticeSpinner = document.getElementById('noticeSpinner');

  // Load saved settings
  try {
    const { appUrl = '', secretKey = '', autoSyncDownloads = false } = await chrome.storage.sync.get([
      'appUrl',
      'secretKey',
      'autoSyncDownloads'
    ]);

    // Default to Tailscale server endpoint for easy 1-click bridge setup
    const defaultUrl = 'http://100.69.194.11:3000';
    const defaultKey = 'shreeji-marg-sync-secret-2026';

    const effectiveUrl = appUrl || defaultUrl;
    const effectiveKey = secretKey || defaultKey;

    appUrlInput.value = effectiveUrl;
    secretKeyInput.value = effectiveKey;
    if (chkAutoSyncDownloads) chkAutoSyncDownloads.checked = !!autoSyncDownloads;

    if (!appUrl || !secretKey) {
      await chrome.storage.sync.set({ appUrl: effectiveUrl, secretKey: effectiveKey });
    }

    updateStatusBadge('ready', 'Tailscale Connected');
  } catch (err) {
    console.error('Error loading config:', err);
    updateStatusBadge('error', 'Error');
  }

  // Toggle settings panel
  btnToggleSettings.addEventListener('click', () => {
    const isHidden = settingsPanel.classList.toggle('hidden');
    settingsChevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
  });

  // Password visibility
  togglePasswordBtn.addEventListener('click', () => {
    const isPwd = secretKeyInput.getAttribute('type') === 'password';
    secretKeyInput.setAttribute('type', isPwd ? 'text' : 'password');
  });

  // Save settings
  btnSaveSettings.addEventListener('click', async () => {
    const appUrl = (appUrlInput.value || '').trim().replace(/\/+$/, '');
    const secretKey = (secretKeyInput.value || '').trim();

    if (!appUrl || !secretKey) {
      showNotice('Please enter both App URL and Secret Key.', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({ appUrl, secretKey });
      showNotice('Settings saved successfully!', 'success');
      updateStatusBadge('ready', 'Configured');
    } catch (err) {
      showNotice(`Failed to save: ${err.message}`, 'error');
    }
  });

  // Test connection
  btnTestConnection.addEventListener('click', async () => {
    const appUrl = (appUrlInput.value || '').trim().replace(/\/+$/, '');
    const secretKey = (secretKeyInput.value || '').trim();

    if (!appUrl) {
      showNotice('Enter App URL first.', 'error');
      return;
    }

    showNotice('Testing link to Next.js server...', 'loading');
    updateStatusBadge('testing', 'Testing...');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_CONNECTION',
        appUrl,
        secretKey
      });

      if (response && response.success) {
        showNotice(response.message || 'Connected and authorized successfully!', 'success');
        updateStatusBadge('online', 'Connected');
      } else {
        showNotice(response?.error || 'Connection failed.', 'error');
        updateStatusBadge('error', 'Failed');
      }
    } catch (err) {
      showNotice(`Error: ${err.message}`, 'error');
      updateStatusBadge('error', 'Error');
    }
  });

  // Auto-sync downloads toggle
  if (chkAutoSyncDownloads) {
    chkAutoSyncDownloads.addEventListener('change', async (e) => {
      await chrome.storage.sync.set({ autoSyncDownloads: e.target.checked });
      showNotice(
        e.target.checked
          ? 'Auto-sync enabled: stock files downloaded in Chrome will sync automatically.'
          : 'Auto-sync disabled.',
        'info'
      );
    });
  }

  // File Upload Buttons
  btnUploadXls.addEventListener('click', () => fileInputXls.click());
  btnUploadXlsx.addEventListener('click', () => fileInputXlsx.click());
  dropZone.addEventListener('click', () => fileInputAny.click());

  fileInputXls.addEventListener('change', (e) => handleFileSelected(e.target.files?.[0]));
  fileInputXlsx.addEventListener('change', (e) => handleFileSelected(e.target.files?.[0]));
  fileInputAny.addEventListener('change', (e) => handleFileSelected(e.target.files?.[0]));

  // Drag and Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  // Handle selected file and trigger auto-read & auto-update
  async function handleFileSelected(file) {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xls', 'xlsx', 'csv'].includes(ext)) {
      showNotice('Please select a valid MARG stock file (.xls, .xlsx, or .csv).', 'error');
      return;
    }

    showNotice(`Reading ${file.name}...`, 'loading');

    try {
      const buffer = await file.arrayBuffer();
      const payload = parseMargStockFile(buffer, file.name);

      if (!payload || payload.batches.length === 0) {
        showNotice('Could not find any stock/batch rows in this file. Please verify it is a MARG stock report.', 'error');
        return;
      }

      showNotice(`Parsed ${payload.products.length} products & ${payload.batches.length} batches. Syncing to B2B App...`, 'loading');

      // Dispatch to Service Worker to POST to /api/import/stock
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_STOCK',
        payload
      });

      if (response && response.success) {
        const sum = response.summary || {};
        showNotice(
          `✅ Synced Successfully!\n${sum.productsCreated || payload.products.length} Products, ${sum.batchesCreated || payload.batches.length} Batches updated from ${file.name}.`,
          'success'
        );
        updateStatusBadge('online', 'Synced');
      } else {
        const errorMsg = response?.error || 'Server rejected the import.';
        showNotice(`❌ Sync Failed: ${errorMsg}`, 'error');
      }
    } catch (err) {
      console.error('File parsing error:', err);
      showNotice(`Failed to parse file: ${err.message}`, 'error');
    }
  }

  // Parse Expiry Date to ISO (YYYY-MM-DD)
  function parseDateToIso(str) {
    if (!str || str === '-' || str === '--') return null;
    const clean = String(str).trim();

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    // DD-Mon-YY or DD-Mon-YYYY (e.g. "01-Sep-28", "01-Jun-31", "25-Aug-26")
    const dMonY = clean.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
    if (dMonY) {
      const day = dMonY[1].padStart(2, '0');
      const monthNames = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const month = monthNames[dMonY[2].toLowerCase()] || '01';
      let year = dMonY[3];
      if (year.length === 2) {
        year = `20${year}`;
      }
      return `${year}-${month}-${day}`;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }

    // MM/YY (e.g. 12/28)
    const my = clean.match(/^(\d{1,2})[-/.](\d{2})$/);
    if (my) {
      return `20${my[2]}-${my[1].padStart(2, '0')}-01`;
    }

    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}

    return null;
  }

  function cleanNumber(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  }

  // Parse MARG Stock File Buffer (.xls / .xlsx) using SheetJS
  function parseMargStockFile(buffer, fileName) {
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS XLSX library is not loaded.');
    }

    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to raw array of rows
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
    if (!rawRows || rawRows.length === 0) return null;

    // Detect header row index
    // Looks for a row containing 'code' or 'product name' / 'item name'
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(25, rawRows.length); i++) {
      const row = rawRows[i];
      if (Array.isArray(row) && row.some(cell => {
        const text = String(cell || '').trim().toLowerCase();
        return text.includes('product name') || text === 'code' || text === 'item code';
      })) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }

    const headers = rawRows[headerRowIndex].map(h => String(h || '').trim());

    // Map column names dynamically
    const findHeader = (regex) => headers.findIndex(h => regex.test(h));

    const colCode = findHeader(/^(code|item\s*code|product\s*code)$/i);
    const colName = findHeader(/(product\s*name|item\s*name|particular|description)/i);
    const colUnit = findHeader(/(unit|pack|packing)/i);
    const colStock = findHeader(/(current\s*stock|stock|qty|closing\s*stock)/i);
    const colBatch = findHeader(/(batch|batch\s*no|lot)/i);
    const colExp = findHeader(/(exp|expiry|validity)/i);
    const colMrp = findHeader(/(m\.?r\.?p\.?)/i);
    const colPtr = findHeader(/(sales?\s*price|rate|ptr|sale\s*rate)/i);
    const colCompany = findHeader(/(company|mfg|mfr|make|manufacturer|brand)/i);

    const productMap = new Map();
    const batches = [];

    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0 || !row.some(Boolean)) continue;

      const getVal = (idx) => (idx >= 0 && idx < row.length ? String(row[idx] || '').trim() : '');

      const codeRaw = getVal(colCode);
      const nameRaw = getVal(colName);

      if (!codeRaw && !nameRaw) continue;

      const lowerName = nameRaw.toLowerCase();
      if (lowerName.startsWith('total') || lowerName.startsWith('grand total')) continue;

      const productCode = codeRaw || nameRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
      const productName = nameRaw || productCode;
      const unit = colUnit >= 0 ? getVal(colUnit) : 'PCS';
      const company = colCompany >= 0 ? getVal(colCompany) : 'Unknown';

      if (!productMap.has(productCode)) {
        productMap.set(productCode, {
          productCode,
          productName,
          unit: unit || 'PCS',
          company: company || 'Unknown'
        });
      }

      const batchNo = colBatch >= 0 ? getVal(colBatch) : 'DEFAULT';
      const expiryDate = colExp >= 0 ? parseDateToIso(getVal(colExp)) : null;
      const stockQty = colStock >= 0 ? Math.max(0, cleanNumber(getVal(colStock))) : 0;
      const mrp = colMrp >= 0 ? cleanNumber(getVal(colMrp)) : 0;
      const ptr = colPtr >= 0 ? cleanNumber(getVal(colPtr)) : 0;

      batches.push({
        productCode,
        batchNo: batchNo || 'DEFAULT',
        stockQty,
        mrp,
        ptr,
        expiryDate
      });
    }

    return {
      fileName,
      totalRows: batches.length,
      products: Array.from(productMap.values()),
      batches
    };
  }

  // Sync Latest Downloaded File
  btnSyncLatestDownload.addEventListener('click', async () => {
    downloadSpinner.classList.remove('hidden');
    btnSyncLatestDownload.disabled = true;

    try {
      const items = await chrome.downloads.search({
        limit: 10,
        orderBy: ['-startTime'],
        state: 'complete'
      });

      const stockDownload = items.find(item => {
        const name = (item.filename || '').toLowerCase();
        return name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv');
      });

      if (!stockDownload) {
        showNotice('No recent .xls or .xlsx download found. Please drag and drop the file directly.', 'error');
        return;
      }

      const fileName = stockDownload.filename.split(/[\\/]/).pop();
      showNotice(`Found recent download: ${fileName}. Please drop it into the box above to sync.`, 'info');
    } catch (err) {
      showNotice(`Could not read downloads: ${err.message}`, 'error');
    } finally {
      downloadSpinner.classList.add('hidden');
      btnSyncLatestDownload.disabled = false;
    }
  });

  // UI helpers
  function showNotice(message, type) {
    noticeBox.classList.remove('hidden', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-700', 'bg-rose-50', 'border-rose-200', 'text-rose-700', 'bg-teal-50', 'border-teal-200', 'text-teal-700', 'bg-slate-100', 'border-slate-300', 'text-slate-700');
    noticeSpinner.classList.add('hidden');
    noticeText.textContent = message;

    if (type === 'success') {
      noticeBox.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
    } else if (type === 'error') {
      noticeBox.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-700');
    } else if (type === 'loading') {
      noticeSpinner.classList.remove('hidden');
      noticeBox.classList.add('bg-teal-50', 'border-teal-200', 'text-teal-700');
    } else {
      noticeBox.classList.add('bg-slate-100', 'border-slate-300', 'text-slate-700');
    }
  }

  function updateStatusBadge(state, label) {
    statusText.textContent = label;
    statusBadge.className = 'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border';
    statusDot.className = 'w-2 h-2 rounded-full';

    if (state === 'online') {
      statusBadge.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
      statusDot.classList.add('bg-emerald-500');
    } else if (state === 'ready') {
      statusBadge.classList.add('bg-teal-50', 'text-teal-700', 'border-teal-200');
      statusDot.classList.add('bg-teal-500');
    } else if (state === 'testing') {
      statusBadge.classList.add('bg-amber-50', 'text-amber-700', 'border-amber-200');
      statusDot.classList.add('bg-amber-500');
    } else if (state === 'error') {
      statusBadge.classList.add('bg-rose-50', 'text-rose-700', 'border-rose-200');
      statusDot.classList.add('bg-rose-500');
    } else {
      statusBadge.classList.add('bg-slate-100', 'text-slate-600', 'border-slate-200');
      statusDot.classList.add('bg-slate-400');
    }
  }
});
