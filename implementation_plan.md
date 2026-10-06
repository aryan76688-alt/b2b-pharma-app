# Update Shreeji Healthcare Webapp: Stock Import & Expiry Systems

We will update the existing B2B platform to support advanced batch-based Stock Imports, Near Expiry management, and MARG Party Import, without rebuilding existing features and without relying on the `purchase_price` column anywhere.

## User Review Required

> [!WARNING]
> We will drop `purchase_price` from all tables (`products`, `product_batches`, `order_items`) to enforce strict security per requirements. Existing data in these columns will be lost, but since the requirement explicitly bans its existence, this is desired.

## Proposed Changes

### Database Migration

#### [NEW] `database/migrations/003_update_schema.sql`
- Add `near_expiry_days` to `settings` table (if exists, else create owner settings table/singleton).
- Remove `purchase_price` from `products`, `product_batches`, and `order_items`.
- Ensure `product_batches` has `status` or calculate it via views/server. (Will use server-side calculation for real-time accuracy against `CURRENT_DATE`).
- Expand `parties` table to include MARG-specific fields: `party_code`, `delivery_route`, `address_line_1`, `address_line_2`, `address_line_3`, `city`, `state`, `mobile`, `landline`, `email`, `gst_number`, `status`.

### API Routes

#### [NEW] `src/app/api/import/stock/route.ts`
- Owner-only endpoint.
- Reads XLSX, auto-detects header row.
- Upserts products and batches.
- Ignores `Purchase Price`.
- Replaces snapshot stock for existing batches.

#### [NEW] `src/app/api/import/parties/route.ts`
- Owner-only endpoint.
- Reads MARG Parties Excel.
- Upserts parties matching logic (Code -> GST -> Mobile -> Name).
- Skips blank fields instead of zeroing out financial data.

#### [NEW] `src/app/api/stock/near-expiry/route.ts`
- Returns batches filtered by near-expiry threshold (default 90 days) and expired batches.

### Components & UI

#### [MODIFY] `src/app/owner/dashboard/page.tsx`
- Add "Near Expiry" dashboard card.

#### [NEW] `src/app/owner/stock/near-expiry/page.tsx`
- Dedicated screen for Near Expiry stock with days remaining.

#### [NEW] `src/app/owner/import/page.tsx`
- Excel Import Center for Stock, Parties, and Outstanding.
- Mapping UI & Preview step.

#### [MODIFY] `src/app/salesman/orders/create/page.tsx`
- Batch selection UI when adding items to order.
- Prevent selecting expired batches.
- Show warnings for near-expiry batches.

## Verification Plan

### Automated Tests
- Run updated E2E/integration tests handling duplicate batch imports and `purchase_price` ignoring.
- Validate MARG Party duplicate matching rules.

### Manual Verification
- Manually upload sample `STOCK REPORT.xlsx` and `MARG_Parties_List.xlsx`.
- Confirm `purchase_price` is entirely invisible across the application.
