/**
 * MARG Books Bridge - MAIN World Network Interceptor
 * Injected into the web page context to intercept XHR and Fetch API responses
 * that contain live item, inventory, batch, and outstanding JSON data.
 */
(() => {
  if (window.__MARG_BRIDGE_INTERCEPTOR_ACTIVE__) return;
  window.__MARG_BRIDGE_INTERCEPTOR_ACTIVE__ = true;

  console.log('[MARG Bridge] In-page network interceptor attached.');

  // Helper to test if a JSON object contains stock/batch/outstanding data
  function inspectAndBroadcast(url, data) {
    try {
      if (!data) return;

      // Check if data is array or wrapped in response object
      let items = null;
      if (Array.isArray(data)) {
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items;
      } else if (data.rows && Array.isArray(data.rows)) {
        items = data.rows;
      } else if (data.result && Array.isArray(data.result)) {
        items = data.result;
      }

      if (!items || items.length === 0) return;

      const sample = items[0];
      if (!sample || typeof sample !== 'object') return;

      const keys = Object.keys(sample).map(k => k.toLowerCase());

      // Detect Stock/Inventory Data
      const hasItemName = keys.some(k => k.includes('item') || k.includes('product') || k.includes('name') || k.includes('desc'));
      const hasStockOrBatch = keys.some(k => k.includes('stock') || k.includes('qty') || k.includes('batch') || k.includes('mrp'));

      if (hasItemName && hasStockOrBatch) {
        window.dispatchEvent(new CustomEvent('MARG_DATA_INTERCEPTED', {
          detail: {
            type: 'stock',
            sourceUrl: url,
            timestamp: Date.now(),
            items: items
          }
        }));
      }

      // Detect Outstanding Data
      const hasParty = keys.some(k => k.includes('party') || k.includes('customer') || k.includes('ledger') || k.includes('acc'));
      const hasBalance = keys.some(k => k.includes('out') || k.includes('balance') || k.includes('closing') || k.includes('debit') || k.includes('due'));

      if (hasParty && hasBalance) {
        window.dispatchEvent(new CustomEvent('MARG_DATA_INTERCEPTED', {
          detail: {
            type: 'outstanding',
            sourceUrl: url,
            timestamp: Date.now(),
            items: items
          }
        }));
      }
    } catch (e) {
      // Ignore inspection errors silently
    }
  }

  // 1. Intercept Fetch API
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      const clone = response.clone();
      const contentType = clone.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        clone.json().then(data => {
          inspectAndBroadcast(url, data);
        }).catch(() => {});
      }
    } catch (e) {}
    return response;
  };

  // 2. Intercept XMLHttpRequest (XHR)
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._margUrl = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      try {
        const contentType = this.getResponseHeader('content-type') || '';
        if (contentType.includes('application/json') || (this.responseText && this.responseText.trim().startsWith('{') || this.responseText.trim().startsWith('['))) {
          const data = JSON.parse(this.responseText);
          inspectAndBroadcast(this._margUrl, data);
        }
      } catch (e) {}
    });
    return originalSend.apply(this, args);
  };
})();
