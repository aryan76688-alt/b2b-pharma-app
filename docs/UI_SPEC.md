# UI / UX SPECIFICATION & DESIGN SYSTEM
## SHREEJI HEALTHCARE — “A Unit of Shreeji 7”

---

## 1. Design System

### 1.1 Color Palettes

#### Owner / Distributor Theme
- **Primary**: `#1267E8` (Royal Blue)
- **Secondary**: `#0A4DB8` (Navy Blue)
- **Accent**: `#00B894` (Mint Green)
- **Warning**: `#FFB020` (Amber Gold)
- **Danger**: `#EF4444` (Ruby Red)
- **Background**: `#F5F8FC` (Cool Off-White/Soft Sky)
- **Card Background**: `#FFFFFF` with `box-shadow: 0 2px 8px rgba(18, 103, 232, 0.06)`

#### MR / Salesman Theme
- **Primary**: `#00A86B` (Emerald Medical Green)
- **Secondary**: `#07895A` (Dark Forest Green)
- **Accent**: `#20C997` (Teal)
- **Warning**: `#FFB020` (Amber Gold)
- **Danger**: `#EF4444` (Crimson)
- **Background**: `#F5FBF8` (Soft Botanical Tint)
- **Card Background**: `#FFFFFF` with `box-shadow: 0 2px 8px rgba(0, 168, 107, 0.06)`

### 1.2 Typography & Elements
- **Font Family**: Inter, SF Pro, system-ui, sans-serif
- **Border Radii**: 12px to 18px on cards, 8px on inputs, 24px on pills
- **Touch Targets**: Minimum 44px on mobile
- **Elevations**: Subtle 1px borders (`#E2E8F0` / `#D1FAE5`) with soft diffused shadows

---

## 2. Screen Architecture Mapping

### Owner Screens (O-01 to O-44)
- **O-01 Login**: Single credential input, auto-detects owner, no role radio buttons.
- **O-02 Forgot Password**: Email/mobile OTP or admin reset request.
- **O-03 Dashboard**: Greeting ("Good Morning, Owner!"), period selector, 8 KPI cards (Total Sales, Total Orders, Pending, Approved, Rejected, Salesmen, Parties, Products), quick action grid, sales trends chart, recent orders.
- **O-04 Orders**: Tabbed filter (All, Pending, Approved, Rejected), search bar, party & salesman indicators.
- **O-05 Order Details**: Comprehensive line item view with billing Qty, Free Qty, PTR, MRP, and Scheme.
- **O-06 Order Filter**: Date range, salesman filter, party filter, status filter, min/max amount.
- **O-07 Salesman-wise Orders**: Dropdown to select salesman (e.g. Ramesh Kumar) with aggregated stats and order list.
- **O-08 Salesman Details**: Target tracking, achievement %, assigned territory, order history.
- **O-09 Manage Salesmen**: Active/Inactive directory of field representatives.
- **O-10 Add Salesman**: Form (Full Name, Mobile, Email, Username, Temporary Password, Employee Code, Territory, Target).
- **O-11 Edit Salesman**: Modify permissions, status, or trigger credential reset.
- **O-12 Products Catalog**: Searchable inventory table with category badges.
- **O-13 Product Details**: Composition, packing, HSN, batch list.
- **O-14 Stock Management**: Batch-level inventory levels, low stock alerts, near-expiry flags.
- **O-15..O-17 Stock Excel Import**: Upload `.xlsx`, auto-match columns, preview valid/invalid/duplicate, transactional commit.
- **O-18..O-20 Parties Management**: Chemist/Retailer registry, credit limits, opening balances, add party form.
- **O-21..O-23 Parties Excel Import**: Bulk party onboarding with auto-mapping.
- **O-24..O-28 Outstanding & Import**: Daily outstanding ledger, bill aging (Current, Due Soon, Overdue), Excel import snapshot engine.
- **O-29..O-31 Schemes**: Trade promotions (10+2, 5+1, Flat 5%), validity dates, status badges.
- **O-32..O-40 Reports**: Sales reports, order reports, salesman performance charts, download Excel/CSV.
- **O-41..O-44 Settings**: Company profile, security preferences, audit log viewer.

### Salesman Screens (S-01 to S-30)
- **S-01 Login**: Single credential input, auto-detects salesman.
- **S-02..S-03 Create & Confirm 4-Digit MPIN**: Custom 4-digit pin pads for first-time login.
- **S-04 MPIN Login**: Welcome back screen, 4-digit PIN boxes `[_] [_] [_] [_]`, keypad, "Use Password Instead" link.
- **S-05 Change MPIN**: Profile security screen.
- **S-06 Salesman Dashboard**: Today's orders count, today's order value (e.g. ₹ 28,430), monthly target progress, quick action grid.
- **S-07..S-12 Create Order Flow (Flagship)**:
  - Step 1: Select Party with search and "+ Add Party" button.
  - Step 2: Category pills (All, Tablet, Capsule, Syrup, Injection).
  - Step 3: Product list with Stock, MRP, PTR, Scheme badge.
  - Step 4: Two separate steppers: **Quantity `[-] 10 [+]`** and **Free Qty `[-] 2 [+]`**.
  - Step 5: Live bill summary verifying Free Qty is ₹0.00.
  - Step 6: Review order table and submit for owner approval.
- **S-13..S-15 My Orders**: Filter tabs (All, Draft, Submitted, Approved, Rejected) and status timeline.
- **S-16..S-19 My Parties**: Assigned chemist list, "+ Add New Party" form, party order history.
- **S-20..S-22 Product Catalog & Schemes**: Browse products, check stock availability and active offers.
- **S-23..S-24 Field Work**: Daily tour plan schedule and chemist visit tracker.
- **S-25..S-27 My Reports**: Personal monthly sales, target achievement %, commission estimates.
- **S-28..S-30 Profile**: Account details, change MPIN, app settings.

---

## 3. Navigation Paradigms

### Mobile Layout
- **Owner Mobile**: Bottom navigation bar with 5 items: `[Home, Orders, Stock, Parties, More]`.
- **Salesman Mobile**: Bottom navigation bar with 5 items: `[Home, Orders, Products, Parties, More]`.

### Desktop Layout
- **Owner Desktop**: Left collapsible sidebar with direct navigation to all 11 owner modules.
- **Salesman Desktop**: Left clean sidebar styled in Emerald theme with field sales workflows.
