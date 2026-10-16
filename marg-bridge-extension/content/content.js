/**
 * MARG Books Bridge - Content Script
 * Injected into MARG Books (MARG Cloud) tabs to provide the floating sync widget,
 * collect intercepted API data, scrape DOM data tables, and bridge to the B2B app.
 */

(() => {
  // Prevent duplicate execution
  if (window.__MARG_BRIDGE_CONTENT_INJECTED__) return;
  window.__MARG_BRIDGE_CONTENT_INJECTED__ = true;

  console.log('[MARG Bridge] Content script loaded on MARG Books.');

  // Cache for intercepted API responses
  let latestInterceptedStock = null;
  let latestInterceptedOutstanding = null;

  // 1. Inject Network Interceptor into MAIN world
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/interceptor.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (err) {
    console.error('[MARG Bridge] Could not inject network interceptor:', err);
  }

  // 2. Listen for Intercepted Data Events from MAIN world
  window.addEventListener('MARG_DATA_INTERCEPTED', (event) => {
    const detail = event.detail;
    if (!detail) return;

    if (detail.type === 'stock' && detail.items && detail.items.length > 0) {
      latestInterceptedStock = detail;
      updateSyncButtonBadge(detail.items.length);
    } else if (detail.type === 'outstanding' && detail.items && detail.items.length > 0) {
      latestInterceptedOutstanding = detail;
    }
  });

  // 3. Inject Floating Action Widget UI
  function injectFloatingWidget() {
    if (document.getElementById('mb-bridge-widget-root')) return;

    // Toast Container
    let toastContainer = document.getElementById('mb-bridge-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'mb-bridge-toast-container';
      document.body.appendChild(toastContainer);
    }

    // Root Widget
    const widget = document.createElement('div');
    widget.id = 'mb-bridge-widget-root';

    widget.innerHTML = `
      <div class="mb-bridge-fab-container">
        <button id="mb-bridge-btn-sync" class="mb-bridge-sync-btn" title="Sync live MARG stock to B2B App">
          <svg class="mb-bridge-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span id="mb-bridge-btn-label">Sync Stock to B2B App</span>
          <span id="mb-bridge-count-badge" class="mb-bridge-badge" style="display: none;">0</span>
        </button>
        <button id="mb-bridge-menu-toggle" class="mb-bridge-menu-toggle" title="More sync options">
          <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div id="mb-bridge-dropdown" class="mb-bridge-dropdown">
          <button id="mb-bridge-menu-stock" class="mb-bridge-menu-item">
            <svg style="width: 14px; height: 14px; color: #0d9488;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Sync Stock & Batches</span>
          </button>
          <button id="mb-bridge-menu-outstanding" class="mb-bridge-menu-item">
            <svg style="width: 14px; height: 14px; color: #f59e0b;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Sync Party Outstanding</span>
          </button>
          <button id="mb-bridge-menu-upload-xls" class="mb-bridge-menu-item">
            <svg style="width: 14px; height: 14px; color: #059669;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Upload .XLS File</span>
          </button>
          <button id="mb-bridge-menu-upload-xlsx" class="mb-bridge-menu-item">
            <svg style="width: 14px; height: 14px; color: #0284c7;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Upload .XLSX File</span>
          </button>
          <button id="mb-bridge-menu-rescan" class="mb-bridge-menu-item">
            <svg style="width: 14px; height: 14px; color: #64748b;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Force DOM Scraper</span>
          </button>
        </div>
      </div>
      <input type="file" id="mb-bridge-file-xls" accept=".xls" style="display: none;">
      <input type="file" id="mb-bridge-file-xlsx" accept=".xlsx" style="display: none;">
    `;

    document.body.appendChild(widget);

    // Event Listeners
    const btnSync = document.getElementById('mb-bridge-btn-sync');
    const menuToggle = document.getElementById('mb-bridge-menu-toggle');
    const dropdown = document.getElementById('mb-bridge-dropdown');
    const menuStock = document.getElementById('mb-bridge-menu-stock');
    const menuOutstanding = document.getElementById('mb-bridge-menu-outstanding');
    const menuUploadXls = document.getElementById('mb-bridge-menu-upload-xls');
    const menuUploadXlsx = document.getElementById('mb-bridge-menu-upload-xlsx');
    const menuRescan = document.getElementById('mb-bridge-menu-rescan');
    const fileXlsInput = document.getElementById('mb-bridge-file-xls');
    const fileXlsxInput = document.getElementById('mb-bridge-file-xlsx');

    btnSync.addEventListener('click', async () => {
      dropdown.classList.remove('active');
      await executeStockSync(false);
    });

    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!widget.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });

    menuStock.addEventListener('click', async () => {
      dropdown.classList.remove('active');
      await executeStockSync(false);
    });

    menuOutstanding.addEventListener('click', async () => {
      dropdown.classList.remove('active');
      await executeOutstandingSync();
    });

    menuUploadXls.addEventListener('click', () => {
      dropdown.classList.remove('active');
      fileXlsInput.click();
    });

    menuUploadXlsx.addEventListener('click', () => {
      dropdown.classList.remove('active');
      fileXlsxInput.click();
    });

    fileXlsInput.addEventListener('change', async (e) => {
      if (e.target.files?.[0]) await handleLocalFileUpload(e.target.files[0]);
    });

    fileXlsxInput.addEventListener('change', async (e) => {
      if (e.target.files?.[0]) await handleLocalFileUpload(e.target.files[0]);
    });

    menuRescan.addEventListener('click', async () => {
      dropdown.classList.remove('active');
      await executeStockSync(true); // Force DOM scraper
    });

    // Drag and Drop on floating widget
    widget.addEventListener('dragover', (e) => {
      e.preventDefault();
      btnSync.style.transform = 'scale(1.05)';
      btnSync.style.boxShadow = '0 0 0 3px #38bdf8';
    });

    widget.addEventListener('dragleave', () => {
      btnSync.style.transform = '';
      btnSync.style.boxShadow = '';
    });

    widget.addEventListener('drop', async (e) => {
      e.preventDefault();
      btnSync.style.transform = '';
      btnSync.style.boxShadow = '';
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        await handleLocalFileUpload(files[0]);
      }
    });
  }

  function updateSyncButtonBadge(count) {
    const badge = document.getElementById('mb-bridge-count-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = `${count} ready`;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // 4. Toast Notification UI
  function showToast(title, message, type = 'info', durationMs = 5000) {
    const container = document.getElementById('mb-bridge-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `mb-bridge-toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg style="width: 20px; height: 20px; color: #10b981; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg style="width: 20px; height: 20px; color: #f43f5e; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
    } else {
      iconSvg = `<div class="mb-bridge-spinner" style="border-top-color: #0d9488; border-color: rgba(13, 148, 136, 0.2);"></div>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div style="flex: 1;">
        <div class="mb-bridge-toast-title">${title}</div>
        <div class="mb-bridge-toast-message">${message}</div>
      </div>
      <button class="mb-bridge-toast-close">&times;</button>
    `;

    toast.querySelector('.mb-bridge-toast-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    if (durationMs > 0) {
      setTimeout(() => {
        if (toast.isConnected) toast.remove();
      }, durationMs);
    }

    return toast;
  }

  // 5. Normalizer Helpers
  function parseDateToIso(str) {
    if (!str || str === '-' || str === '--') return null;
    const clean = String(str).trim();

    // Check ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    // Check MM/YY or MM-YY format (e.g. 09/28)
    const my = clean.match(/^(\d{1,2})[-/.](\d{2})$/);
    if (my) {
      const month = my[1].padStart(2, '0');
      const year = `20${my[2]}`;
      return `${year}-${month}-01`;
    }

    // Try standard Date parsing (e.g. "01-Sep-28")
    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {}

    return null;
  }

  function cleanNumber(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  // 6. Normalize Intercepted API Data
  function normalizeInterceptedStock(items) {
    const productMap = new Map();
    const batches = [];

    for (const item of items) {
      // Find item code / id
      const code = String(
        item.Code || item.code || item.ItemCode || item.itemCode ||
        item.ProductCode || item.productCode || item.ItemId || item.itemId || ''
      ).trim();

      const name = String(
        item.Name || item.name || item.ItemName || item.itemName ||
        item.ProductName || item.productName || item.Description || ''
      ).trim();

      if (!code && !name) continue;
      const productCode = code || name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);

      if (!productMap.has(productCode)) {
        productMap.set(productCode, {
          productCode: productCode,
          productName: name || productCode,
          unit: String(item.Unit || item.unit || item.Packing || item.packing || 'PCS').trim(),
          company: String(item.Company || item.company || item.Mfg || item.mfg || item.Manufacturer || 'Unknown').trim()
        });
      }

      const batchNo = String(item.Batch || item.batch || item.BatchNo || item.batchNo || 'DEFAULT').trim();
      const stockQty = Math.max(0, cleanNumber(item.Stock || item.stock || item.Qty || item.qty || item.CurrentStock || item.currentStock || item.ClosingStock));
      const mrp = cleanNumber(item.MRP || item.mrp || item.M_R_P);
      const ptr = cleanNumber(item.PTR || item.ptr || item.Rate || item.rate || item.SalesPrice || item.salesPrice || item.SaleRate);
      const expiryDate = parseDateToIso(item.EXP || item.exp || item.Expiry || item.expiry || item.ExpDate || item.expiryDate);

      batches.push({
        productCode: productCode,
        batchNo: batchNo || 'DEFAULT',
        stockQty: stockQty,
        mrp: mrp,
        ptr: ptr,
        expiryDate: expiryDate
      });
    }

    return {
      fileName: `MARG_Cloud_Live_Sync_${new Date().toISOString().slice(0, 10)}.json`,
      totalRows: batches.length,
      products: Array.from(productMap.values()),
      batches: batches
    };
  }

  // 7. Robust DOM Table & DataGrid Scraper
  async function scrapeStockFromDom() {
    // Look for all potential table elements and grid containers
    const gridSelectors = [
      'table',
      '[role="grid"]',
      '.dx-datagrid-table',
      '.ag-root',
      '.table-responsive table',
      '.grid-view table'
    ];

    let targetGrid = null;
    let headerElements = [];

    // Find the table that contains stock/inventory headers
    for (const selector of gridSelectors) {
      const candidates = document.querySelectorAll(selector);
      for (const el of candidates) {
        const text = el.innerText?.toLowerCase() || '';
        if (
          (text.includes('item') || text.includes('product') || text.includes('particular')) &&
          (text.includes('stock') || text.includes('qty') || text.includes('batch') || text.includes('mrp'))
        ) {
          targetGrid = el;
          break;
        }
      }
      if (targetGrid) break;
    }

    if (!targetGrid) {
      return null;
    }

    // Identify header row and map columns
    const colIndices = {
      code: -1,
      name: -1,
      unit: -1,
      company: -1,
      batch: -1,
      exp: -1,
      stock: -1,
      mrp: -1,
      ptr: -1
    };

    // Find all th or header cells
    let thList = Array.from(targetGrid.querySelectorAll('thead th, tr.dx-header-row td, [role="columnheader"]'));
    if (thList.length === 0) {
      // Try first row with td
      const firstRow = targetGrid.querySelector('tr');
      if (firstRow) {
        thList = Array.from(firstRow.children);
      }
    }

    thList.forEach((th, idx) => {
      const text = (th.innerText || th.textContent || '').trim().toLowerCase();
      if (/code|item\s*code|product\s*code/i.test(text) && colIndices.code === -1) {
        colIndices.code = idx;
      } else if (/item\s*name|product\s*name|description|particular/i.test(text) && colIndices.name === -1) {
        colIndices.name = idx;
      } else if (/unit|pack|packing|uom/i.test(text) && colIndices.unit === -1) {
        colIndices.unit = idx;
      } else if (/company|mfr|mfg|manufacturer|brand/i.test(text) && colIndices.company === -1) {
        colIndices.company = idx;
      } else if (/batch|lot|b\.?\s*no/i.test(text) && colIndices.batch === -1) {
        colIndices.batch = idx;
      } else if (/exp|expiry|validity/i.test(text) && colIndices.exp === -1) {
        colIndices.exp = idx;
      } else if (/current\s*stock|stock|qty|closing|balance|available/i.test(text) && colIndices.stock === -1) {
        colIndices.stock = idx;
      } else if (/m\.?r\.?p\.?/i.test(text) && colIndices.mrp === -1) {
        colIndices.mrp = idx;
      } else if (/sales?\s*price|rate|ptr|sale\s*rate|net\s*rate/i.test(text) && colIndices.ptr === -1) {
        colIndices.ptr = idx;
      }
    });

    // Fallback: If code is not found but name is found
    if (colIndices.name === -1 && colIndices.code !== -1) {
      colIndices.name = colIndices.code;
    }

    // Find all data rows
    const rowList = Array.from(targetGrid.querySelectorAll('tbody tr, [role="row"]:not([role="columnheader"]), tr.dx-data-row'));
    const productMap = new Map();
    const batches = [];

    // Batch process rows without blocking main thread
    for (const row of rowList) {
      const cells = Array.from(row.querySelectorAll('td, [role="gridcell"]'));
      if (cells.length === 0) continue;

      const getCellText = (idx) => {
        if (idx < 0 || idx >= cells.length) return '';
        const cell = cells[idx];
        const input = cell.querySelector('input');
        return (input ? input.value : (cell.innerText || cell.textContent || '')).trim();
      };

      const codeRaw = getCellText(colIndices.code);
      const nameRaw = getCellText(colIndices.name);

      if (!codeRaw && !nameRaw) continue;
      // Skip summary or total rows
      const lowerRow = row.innerText.toLowerCase();
      if (lowerRow.startsWith('total') || lowerRow.startsWith('grand total')) continue;

      const productCode = codeRaw || nameRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
      const productName = nameRaw || productCode;
      const unit = colIndices.unit >= 0 ? getCellText(colIndices.unit) : 'PCS';
      const company = colIndices.company >= 0 ? getCellText(colIndices.company) : 'Unknown';
      const batchNo = colIndices.batch >= 0 ? getCellText(colIndices.batch) : 'DEFAULT';
      const expiryDate = colIndices.exp >= 0 ? parseDateToIso(getCellText(colIndices.exp)) : null;
      const stockQty = colIndices.stock >= 0 ? Math.max(0, cleanNumber(getCellText(colIndices.stock))) : 0;
      const mrp = colIndices.mrp >= 0 ? cleanNumber(getCellText(colIndices.mrp)) : 0;
      const ptr = colIndices.ptr >= 0 ? cleanNumber(getCellText(colIndices.ptr)) : 0;

      if (!productMap.has(productCode)) {
        productMap.set(productCode, {
          productCode: productCode,
          productName: productName,
          unit: unit || 'PCS',
          company: company || 'Unknown'
        });
      }

      batches.push({
        productCode: productCode,
        batchNo: batchNo || 'DEFAULT',
        stockQty: stockQty,
        mrp: mrp,
        ptr: ptr,
        expiryDate: expiryDate
      });
    }

    if (batches.length === 0) return null;

    return {
      fileName: `MARG_Cloud_DOM_Scrape_${new Date().toISOString().slice(0, 10)}.json`,
      totalRows: batches.length,
      products: Array.from(productMap.values()),
      batches: batches
    };
  }

  // 8. Execute Stock Synchronization
  async function executeStockSync(forceDomScrape = false) {
    const btnSync = document.getElementById('mb-bridge-btn-sync');
    const btnLabel = document.getElementById('mb-bridge-btn-label');

    btnSync.disabled = true;
    btnLabel.textContent = 'Extracting Stock...';

    let syncPayload = null;

    // Use intercepted API data if available and not forced to scrape DOM
    if (!forceDomScrape && latestInterceptedStock && latestInterceptedStock.items && latestInterceptedStock.items.length > 0) {
      console.log(`[MARG Bridge] Using ${latestInterceptedStock.items.length} items from intercepted network response.`);
      syncPayload = normalizeInterceptedStock(latestInterceptedStock.items);
    }

    // Fallback to DOM Scraper
    if (!syncPayload || syncPayload.batches.length === 0) {
      console.log('[MARG Bridge] Running DOM scraper for stock table...');
      syncPayload = await scrapeStockFromDom();
    }

    if (!syncPayload || syncPayload.batches.length === 0) {
      btnSync.disabled = false;
      btnLabel.textContent = 'Sync Stock to B2B App';
      showToast(
        'No Stock Data Detected',
        'Could not find stock tables on the current screen. Please open Reports > Current Stock in MARG Books and try again.',
        'error',
        6000
      );
      return;
    }

    const toast = showToast(
      'Syncing to B2B App',
      `Sending ${syncPayload.products.length} products and ${syncPayload.batches.length} batches to Next.js server...`,
      'info',
      0
    );

    btnLabel.textContent = `Syncing (${syncPayload.batches.length})...`;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_STOCK',
        payload: syncPayload
      });

      if (toast) toast.remove();

      if (response && response.success) {
        const sum = response.summary || {};
        showToast(
          'Sync Completed Successfully!',
          `Synced ${sum.productsCreated || syncPayload.products.length} new/updated products and ${sum.batchesCreated || syncPayload.batches.length} batches to B2B app.`,
          'success',
          6000
        );
      } else {
        const errMsg = response?.error || 'Server rejected the import.';
        showToast(
          'Stock Sync Failed',
          `${errMsg}. Please check your App URL and Secret Key in the extension popup.`,
          'error',
          7000
        );
      }
    } catch (err) {
      if (toast) toast.remove();
      showToast(
        'Bridge Error',
        `Failed to communicate with service worker: ${err.message}`,
        'error',
        6000
      );
    } finally {
      btnSync.disabled = false;
      btnLabel.textContent = 'Sync Stock to B2B App';
    }
  }

  // 9. Execute Outstanding Synchronization
  async function executeOutstandingSync() {
    showToast(
      'Party Outstanding Sync',
      'Please open Accounts > Outstanding Analysis on MARG Books to view outstandings.',
      'info',
      4000
    );
  }

  // 10. Handle Local XLS / XLSX File Upload & Drag-and-Drop
  async function handleLocalFileUpload(file) {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xls', 'xlsx', 'csv'].includes(ext)) {
      showToast('Invalid File', 'Please select a valid MARG stock file (.xls, .xlsx, or .csv)', 'error', 5000);
      return;
    }

    if (typeof XLSX === 'undefined') {
      showToast('Error', 'SheetJS library is not available in content script.', 'error', 5000);
      return;
    }

    const toast = showToast('Processing File', `Reading ${file.name}...`, 'info', 0);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

      if (!rawRows || rawRows.length === 0) {
        if (toast) toast.remove();
        showToast('Empty File', 'The selected file contains no rows.', 'error', 5000);
        return;
      }

      // Find header row containing code or product name
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(25, rawRows.length); i++) {
        const row = rawRows[i];
        if (Array.isArray(row) && row.some(cell => {
          const t = String(cell || '').trim().toLowerCase();
          return t.includes('product name') || t === 'code' || t === 'item code';
        })) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rawRows[headerRowIndex].map(h => String(h || '').trim());
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
          productMap.set(productCode, { productCode, productName, unit: unit || 'PCS', company: company || 'Unknown' });
        }

        const batchNo = colBatch >= 0 ? getVal(colBatch) : 'DEFAULT';
        const expiryDate = colExp >= 0 ? parseDateToIso(getVal(colExp)) : null;
        const stockQty = colStock >= 0 ? Math.max(0, cleanNumber(getVal(colStock))) : 0;
        const mrp = colMrp >= 0 ? cleanNumber(getVal(colMrp)) : 0;
        const ptr = colPtr >= 0 ? cleanNumber(getVal(colPtr)) : 0;

        batches.push({ productCode, batchNo: batchNo || 'DEFAULT', stockQty, mrp, ptr, expiryDate });
      }

      if (batches.length === 0) {
        if (toast) toast.remove();
        showToast('No Stock Rows', 'No valid stock/batch rows found in file.', 'error', 5000);
        return;
      }

      const syncPayload = {
        fileName: file.name,
        totalRows: batches.length,
        products: Array.from(productMap.values()),
        batches
      };

      if (toast) toast.remove();
      showToast('Syncing File', `Sending ${syncPayload.products.length} products & ${syncPayload.batches.length} batches to B2B App...`, 'info', 0);

      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_STOCK',
        payload: syncPayload
      });

      if (response && response.success) {
        const sum = response.summary || {};
        showToast(
          'File Synced Successfully!',
          `Updated ${sum.productsCreated || syncPayload.products.length} products and ${sum.batchesCreated || syncPayload.batches.length} batches from ${file.name}.`,
          'success',
          7000
        );
      } else {
        showToast('Sync Failed', response?.error || 'Server error', 'error', 7000);
      }
    } catch (err) {
      if (toast) toast.remove();
      showToast('File Error', err.message, 'error', 6000);
    }
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFloatingWidget);
  } else {
    injectFloatingWidget();
  }

  // Also observe DOM changes to ensure floating widget persists across SPA page transitions
  const observer = new MutationObserver(() => {
    if (!document.getElementById('mb-bridge-widget-root') && document.body) {
      injectFloatingWidget();
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: false });
  }
})();
