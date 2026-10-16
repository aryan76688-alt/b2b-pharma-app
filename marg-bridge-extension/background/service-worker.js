/**
 * MARG Books Bridge - Background Service Worker (Manifest V3)
 * Handles secure communication between content scripts and the Next.js B2B app.
 */

// Helper to get configured credentials
async function getCredentials() {
  const { appUrl = '', secretKey = '' } = await chrome.storage.sync.get(['appUrl', 'secretKey']);
  return {
    appUrl: appUrl.trim().replace(/\/+$/, ''),
    secretKey: secretKey.trim()
  };
}

// Flash badge text for quick visual confirmation
async function flashBadge(text, color) {
  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
    setTimeout(async () => {
      try {
        await chrome.action.setBadgeText({ text: '' });
      } catch (e) {}
    }, 4000);
  } catch (e) {}
}

// Runtime message dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'TEST_CONNECTION') {
        const url = (message.appUrl || '').trim().replace(/\/+$/, '');
        const key = (message.secretKey || '').trim();

        if (!url) {
          sendResponse({ success: false, error: 'Next.js App URL is required.' });
          return;
        }

        const endpoint = `${url}/api/import/stock`;
        console.log(`[MARG Bridge] Testing connection to ${endpoint}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'x-api-key': key
          },
          body: JSON.stringify({ ping: true })
        });

        if (response.ok) {
          const data = await response.json();
          await flashBadge('OK', '#10b981');
          sendResponse({
            success: true,
            message: data.message || 'Connection and authorization verified successfully!'
          });
        } else if (response.status === 401 || response.status === 403) {
          await flashBadge('AUTH', '#f43f5e');
          sendResponse({
            success: false,
            error: 'Authentication failed. Please check that your Secret Key matches MARG_SYNC_SECRET in your .env.local file.'
          });
        } else {
          const errorText = await response.text();
          let parsedMsg = `Server responded with HTTP ${response.status}`;
          try {
            const errJson = JSON.parse(errorText);
            if (errJson?.error?.message) parsedMsg = errJson.error.message;
          } catch (e) {}
          await flashBadge('ERR', '#f43f5e');
          sendResponse({ success: false, error: parsedMsg });
        }
      } else if (message.type === 'SYNC_STOCK') {
        const { appUrl, secretKey } = await getCredentials();

        if (!appUrl || !secretKey) {
          sendResponse({
            success: false,
            error: 'Extension is not configured. Please open the MARG Books Bridge extension icon in Chrome toolbar to set your App URL and Secret Key.'
          });
          return;
        }

        const endpoint = `${appUrl}/api/import/stock`;
        console.log(`[MARG Bridge] Posting stock payload (${message.payload?.totalRows} rows) to ${endpoint}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${secretKey}`,
            'x-api-key': secretKey
          },
          body: JSON.stringify(message.payload)
        });

        if (response.ok) {
          const data = await response.json();
          await flashBadge('SYNC', '#10b981');
          sendResponse({
            success: true,
            summary: data.summary,
            message: 'Stock updated in B2B database.'
          });
        } else if (response.status === 401 || response.status === 403) {
          await flashBadge('AUTH', '#f43f5e');
          sendResponse({
            success: false,
            error: 'Unauthorized: Secret key is invalid or expired. Check settings in extension popup.'
          });
        } else {
          const errorText = await response.text();
          let parsedMsg = `Import failed with HTTP ${response.status}`;
          try {
            const errJson = JSON.parse(errorText);
            if (errJson?.error?.message) parsedMsg = errJson.error.message;
          } catch (e) {}
          await flashBadge('ERR', '#f43f5e');
          sendResponse({ success: false, error: parsedMsg });
        }
      } else {
        sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
      }
    } catch (err) {
      console.error('[MARG Bridge] Service worker error:', err);
      let errorMsg = err.message || 'Network error connecting to Next.js server.';
      if (errorMsg.includes('Failed to fetch')) {
        errorMsg = 'Cannot reach Next.js server. Please check the URL, SSL certificate, or make sure localhost is running.';
      }
      await flashBadge('ERR', '#f43f5e');
      sendResponse({ success: false, error: errorMsg });
    }
  })();

  return true; // Keep message channel open for async sendResponse
});

// Monitor newly downloaded files when autoSyncDownloads is enabled
if (chrome.downloads && chrome.downloads.onChanged) {
  chrome.downloads.onChanged.addListener(async (delta) => {
    try {
      if (delta.state && delta.state.current === 'complete') {
        const { autoSyncDownloads = false } = await chrome.storage.sync.get('autoSyncDownloads');
        if (!autoSyncDownloads) return;

        const [item] = await chrome.downloads.search({ id: delta.id });
        if (!item) return;

        const filename = (item.filename || '').toLowerCase();
        if (filename.endsWith('.xls') || filename.endsWith('.xlsx') || filename.endsWith('.csv')) {
          console.log('[MARG Bridge] Stock download detected:', item.filename);
          await flashBadge('FILE', '#0284c7');
        }
      }
    } catch (e) {
      console.error('[MARG Bridge] Error tracking download:', e);
    }
  });
}
