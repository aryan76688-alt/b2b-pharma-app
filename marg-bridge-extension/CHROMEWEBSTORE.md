# Chrome Web Store Listing: MARG Books to B2B Pharma Bridge

## Store Metadata

- **Name**: MARG Books to B2B Pharma Bridge
- **Summary**: Live sync stock inventory, batches, and outstandings from MARG Books Cloud to your Next.js B2B Pharma application.
- **Category**: Productivity / Business
- **Version**: 1.0.0
- **Language**: English

## Detailed Description

Streamline pharmaceutical order management and inventory reconciliation between MARG Books (MARG Cloud) and your wholesale B2B pharmaceutical web app.

### Key Features
- **One-Click Synchronization**: Adds a non-intrusive floating sync widget directly inside MARG Books Cloud (`margbooks.com`).
- **High-Fidelity Extraction**: Captures live product batches, stock quantities, MRP, PTR, and expiry dates without manual Excel exports or re-entry.
- **Secure Bridge**: Communicates directly with your Next.js B2B app using secure endpoint authorization.
- **DOM & Network Scraper**: Dual extraction engines guarantee accurate stock reading whether using real-time API interception or rendered screen tables.

## Permissions Justification

| Permission | Justification |
| :--- | :--- |
| `storage` | Required to store the user's Next.js server URL and Authorization Secret Key locally in Chrome synced storage. |
| `activeTab` | Required to detect the active MARG Books inventory tab when initiating synchronization. |
| `scripting` | Required to inject the floating sync UI and data extraction scripts into the MARG Books session. |
| `host_permissions: https://*.margbooks.com/*` | Required to read inventory tables and display the sync button on the MARG Books cloud portal. |
| `<all_urls>` | Required for the background service worker to POST extracted stock data to the user's self-hosted Next.js app URL. |

## Privacy & Data Use
- **Data Collection**: No personal information or tracking is collected by the extension developers.
- **Data Transmission**: Inventory and stock data extracted from MARG Books is transmitted strictly between the user's browser and their own configured Next.js server endpoint.
