import crypto from 'crypto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private partyVersion: number = Date.now();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 30): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clearPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  invalidatePartyCache(): void {
    this.partyVersion = Date.now();
    this.clearPrefix('parties:');
  }

  getPartyEtag(salt: string = ''): string {
    const raw = `b2b_party_v_${this.partyVersion}_${salt}`;
    return `"${crypto.createHash('md5').update(raw).digest('hex')}"`;
  }
}

// Global singleton to persist across HMR reloads in development
declare global {
  // eslint-disable-next-line no-var
  var _b2bCache: MemoryCache | undefined;
}

if (!global._b2bCache) {
  global._b2bCache = new MemoryCache();
}

export const cache = global._b2bCache;
