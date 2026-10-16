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

export interface OfflineParty {
  id: string;
  partyData: any;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  lastError?: string;
}

const DB_NAME = 'shreeji_b2b_offline_db';
const DB_VERSION = 2;
const STORE_ORDERS = 'offline_orders';
const STORE_PARTIES = 'cached_parties';
const STORE_PRODUCTS = 'cached_products';
const STORE_OFFLINE_PARTIES = 'offline_parties';

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
      if (!db.objectStoreNames.contains(STORE_OFFLINE_PARTIES)) {
        db.createObjectStore(STORE_OFFLINE_PARTIES, { keyPath: 'id' });
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

export async function savePartyOffline(partyData: any): Promise<string> {
  const db = await openDatabase();
  const id = `offline_party_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const record: OfflineParty = {
    id,
    partyData: { ...partyData, offlineClientUuid: id },
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_OFFLINE_PARTIES, STORE_PARTIES], 'readwrite');
    const outboxStore = tx.objectStore(STORE_OFFLINE_PARTIES);
    const partiesStore = tx.objectStore(STORE_PARTIES);

    // 1. Put in outbox
    outboxStore.put(record);

    // 2. Put in cached parties so it is instantly visible in all lists
    partiesStore.put({
      id,
      partyCode: partyData.partyCode || `TMP-${Date.now().toString().slice(-4)}`,
      partyName: partyData.partyName,
      mobile: partyData.mobile,
      address: partyData.address,
      city: partyData.city,
      area: partyData.area || partyData.city,
      partyType: partyData.partyType || 'chemist',
      latitude: partyData.latitude || null,
      longitude: partyData.longitude || null,
      totalOutstanding: 0,
      status: 'active',
      isOfflineSaved: true,
    });

    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineParties(): Promise<OfflineParty[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OFFLINE_PARTIES, 'readonly');
    const store = tx.objectStore(STORE_OFFLINE_PARTIES);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeOfflineParty(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OFFLINE_PARTIES, 'readwrite');
    const store = tx.objectStore(STORE_OFFLINE_PARTIES);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function cachePartiesLocally(parties: any[]): Promise<void> {
  if (!parties || parties.length === 0) return;
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_PARTIES, 'readwrite');
    const store = tx.objectStore(STORE_PARTIES);
    for (const p of parties) {
      if (p.id) store.put(p);
    }
  } catch (err) {
    console.warn('Failed to cache parties locally in IndexedDB:', err);
  }
}

export async function getCachedPartiesLocally(): Promise<any[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PARTIES, 'readonly');
      const store = tx.objectStore(STORE_PARTIES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function syncOfflineParties(): Promise<{ synced: number; failed: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const parties = await getOfflineParties();
  if (parties.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of parties) {
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.partyData),
      });

      if (res.ok) {
        await removeOfflineParty(item.id);
        const data = await res.json().catch(() => null);
        if (data && data.data) {
          // Update cached party with real server party
          await cachePartiesLocally([data.data]);
        }
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export async function syncAllOfflineData(): Promise<{
  orders: { synced: number; failed: number };
  parties: { synced: number; failed: number };
}> {
  const orders = await syncOfflineOrders();
  const parties = await syncOfflineParties();
  return { orders, parties };
}

// Auto-Sync Listener initialization (call once in root component)
export function initOfflineSyncListener(onSyncComplete?: (res: any) => void) {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    console.log('[Offline Queue] Network restored, attempting auto-sync...');
    const result = await syncAllOfflineData();
    if (result.orders.synced > 0 || result.parties.synced > 0) {
      console.log(`[Offline Queue] Synced ${result.orders.synced} orders, ${result.parties.synced} parties!`);
      if (onSyncComplete) onSyncComplete(result);
    }
  };

  window.addEventListener('online', handleOnline);
  // Also attempt immediate check on load
  if (navigator.onLine) {
    syncAllOfflineData().then((r) => {
      if ((r.orders.synced > 0 || r.parties.synced > 0) && onSyncComplete) {
        onSyncComplete(r);
      }
    });
  }

  return () => window.removeEventListener('online', handleOnline);
}
