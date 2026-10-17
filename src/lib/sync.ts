const ENVELOPE_API_URL = process.env.ENVELOPE_MANAGER_API_URL || 'http://127.0.0.1:8080';
const ENVELOPE_CF_WORKER = 'https://shreeji-envelope.aryan76688.workers.dev';
const ENVELOPE_REMOTE_URL = 'https://envelope.shreeji7.com';
const ENVELOPE_FALLBACK_URL = 'https://marg-envelope-manager-production.up.railway.app';
const MARG_SYNC_SECRET = process.env.MARG_SYNC_SECRET || 'shreeji-marg-sync-secret-2026';

export async function syncPartyToEnvelopeManager(partyData: any): Promise<void> {
  const urls = [
    `${ENVELOPE_API_URL.replace(/\/$/, '')}/api/parties/sync-webhook`,
    `${ENVELOPE_CF_WORKER.replace(/\/$/, '')}/api/parties/sync-webhook`,
    `${ENVELOPE_REMOTE_URL.replace(/\/$/, '')}/api/parties/sync-webhook`,
    `${ENVELOPE_FALLBACK_URL.replace(/\/$/, '')}/api/parties/sync-webhook`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Secret': MARG_SYNC_SECRET,
          'X-Sync-Source': 'orderbook',
        },
        body: JSON.stringify(partyData),
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        console.log(`[Envelope Sync] Successfully synced party to ${url}`);
        return;
      }
    } catch {
      // Graceful fallback to next URL without blocking user
    }
  }
}
