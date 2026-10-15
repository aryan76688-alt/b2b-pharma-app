/**
 * Shreeji Healthcare Local Mobile Storage & Directory Manager
 * Handles local folder persistence:
 *  - ShreejiHealthcare/Invoices
 *  - ShreejiHealthcare/Backups
 * Uses IndexedDB + File System Access API + Blob Downloads for mobile and desktop environments.
 */

export interface SavedInvoiceRecord {
  id: string;
  invoiceNo: string;
  orderNumber: string;
  partyName: string;
  grandTotal: number;
  createdAt: string;
  pdfBase64?: string;
  fileName: string;
}

const DB_NAME = 'ShreejiHealthcareMobileStorage';
const DB_VERSION = 1;
const STORE_INVOICES = 'invoices';

function openStorageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_INVOICES)) {
        db.createObjectStore(STORE_INVOICES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save an invoice PDF to local storage and trigger Android/browser file download
 */
export async function saveInvoiceToLocalStorage(params: {
  invoiceNo: string;
  orderNumber: string;
  partyName: string;
  grandTotal: number;
  pdfBlob: Blob;
}): Promise<SavedInvoiceRecord> {
  const { invoiceNo, orderNumber, partyName, grandTotal, pdfBlob } = params;
  const cleanInvNo = (invoiceNo || orderNumber || 'INV').replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `ShreejiHealthcare_Invoice_${cleanInvNo}.pdf`;
  const recordId = `inv_${cleanInvNo}_${Date.now()}`;

  // 1. Convert Blob to Base64 for IndexedDB persistence
  const base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(pdfBlob);
  });

  const record: SavedInvoiceRecord = {
    id: recordId,
    invoiceNo: cleanInvNo,
    orderNumber,
    partyName,
    grandTotal,
    createdAt: new Date().toISOString(),
    pdfBase64: base64Data,
    fileName,
  };

  // 2. Persist to IndexedDB
  try {
    const db = await openStorageDB();
    const tx = db.transaction(STORE_INVOICES, 'readwrite');
    tx.objectStore(STORE_INVOICES).put(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.warn('Notice: IndexedDB write failed, falling back to localStorage manifest:', err);
  }

  // 3. Keep quick manifest in localStorage
  try {
    const manifestKey = 'shreeji_invoices_manifest';
    const existing = JSON.parse(localStorage.getItem(manifestKey) || '[]');
    const nextManifest = [
      {
        id: record.id,
        invoiceNo: record.invoiceNo,
        orderNumber: record.orderNumber,
        partyName: record.partyName,
        grandTotal: record.grandTotal,
        createdAt: record.createdAt,
        fileName: record.fileName,
      },
      ...existing.filter((i: any) => i.invoiceNo !== record.invoiceNo),
    ].slice(0, 50); // Keep last 50
    localStorage.setItem(manifestKey, JSON.stringify(nextManifest));
  } catch {}

  // 4. Trigger download to user's mobile device Download folder
  if (typeof window !== 'undefined') {
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  }

  return record;
}

/**
 * Retrieve all saved invoices from local mobile storage
 */
export async function getLocalInvoices(): Promise<SavedInvoiceRecord[]> {
  try {
    const db = await openStorageDB();
    const tx = db.transaction(STORE_INVOICES, 'readonly');
    const store = tx.objectStore(STORE_INVOICES);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => {
        const manifestKey = 'shreeji_invoices_manifest';
        try {
          resolve(JSON.parse(localStorage.getItem(manifestKey) || '[]'));
        } catch {
          resolve([]);
        }
      };
    });
  } catch {
    const manifestKey = 'shreeji_invoices_manifest';
    try {
      return JSON.parse(localStorage.getItem(manifestKey) || '[]');
    } catch {
      return [];
    }
  }
}
