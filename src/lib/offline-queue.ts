/**
 * Shreeji Healthcare - Offline-First Queue & IndexedDB Cache
 * 100% Free, Zero OAuth2, No MPIN.
 * Allows sales reps and chemists to create orders completely offline,
 * stores items locally, and auto-syncs to the server upon internet restoration.
 */

export interface OfflineOrder {
  id: string;
  orderData: any;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  lastError?: string;
}

const DB_NAME = 'shreeji_b2b_offline_db';
const DB_VERSION = 1;
const STORE_ORDERS = 'offline_orders';
const STORE_PARTIES = 'cached_parties';
const STORE_PRODUCTS = 'cached_products';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB is only available in browser'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db: IDBDatabase = event.target.result;
      if (!db.objectStoreNames.contains(STORE_ORDERS)) {
        db.createObjectStore(STORE_ORDERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PARTIES)) {
        db.createObjectStore(STORE_PARTIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

export async function saveOrderOffline(orderData: any): Promise<string> {
  const db = await openDatabase();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const record: OfflineOrder = {
    id,
    orderData: { ...orderData, offlineClientUuid: id },
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ORDERS, 'readwrite');
    const store = tx.objectStore(STORE_ORDERS);
    const req = store.put(record);

    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineOrders(): Promise<OfflineOrder[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ORDERS, 'readonly');
    const store = tx.objectStore(STORE_ORDERS);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeOfflineOrder(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ORDERS, 'readwrite');
    const store = tx.objectStore(STORE_ORDERS);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function syncOfflineOrders(): Promise<{ synced: number; failed: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const orders = await getOfflineOrders();
  if (orders.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of orders) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.orderData)
      });

      if (res.ok) {
        await removeOfflineOrder(item.id);
        synced++;
      } else {
        failed++;
      }
    } catch (err: any) {
      failed++;
    }
  }

  return { synced, failed };
}

// Auto-Sync Listener initialization (call once in root component)
export function initOfflineSyncListener(onSyncComplete?: (res: { synced: number; failed: number }) => void) {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    console.log('[Offline Queue] Network restored, attempting auto-sync...');
    const result = await syncOfflineOrders();
    if (result.synced > 0) {
      console.log(`[Offline Queue] Successfully synced ${result.synced} offline orders!`);
      if (onSyncComplete) onSyncComplete(result);
    }
  };

  window.addEventListener('online', handleOnline);
  // Also attempt immediate check on load
  if (navigator.onLine) {
    syncOfflineOrders().then((r) => {
      if (r.synced > 0 && onSyncComplete) onSyncComplete(r);
    });
  }

  return () => window.removeEventListener('online', handleOnline);
}
