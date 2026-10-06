# SHREEJI HEALTHCARE — Wholesale Pharma Distributor Order Book

A full-stack, responsive PWA web application engineered for wholesale pharmaceutical distributors and medical representatives (salesmen). Built with **Next.js 15+ App Router**, **TypeScript**, **PostgreSQL / Supabase**, **Tailwind CSS**, and **SheetJS (xlsx)**.

---

## 🌟 Key Features

### 🏢 Owner / Distributor Portal (Theme: Blue `#1268E8`)
- **Executive Business Dashboard**: Real-time sales, order volume, pending approvals, active salesmen, top-selling products, and outstanding accounts.
- **Order Management Workflow**: Approve, reject (with mandatory reason), dispatch, and deliver orders with an auditable status history timeline.
- **Salesman-Wise Performance Tracking**: View individual order volumes, monthly sales, target vs achievement, and top parties per salesman.
- **Inventory & Batch Tracking**: Monitor batch numbers, expiry dates, MRP, PTR, available stock, and near-expiry alerts.
- **Exclusive Excel Import Center**:
  - Bulk import **Stock & Batches**
  - Bulk import **Parties & Chemists**
  - Bulk import **Daily Party Outstandings**
  - Features file preview, automatic column auto-mapping, manual column selection, pre-commit validation, duplicate detection, and error report export (.xlsx).
- **Party Ledger & Outstanding Aging**:
  - Aging buckets: 0–30 Days, 31–60 Days, 61–90 Days, 90+ Days.
  - Complete debit/credit/balance ledger with WhatsApp & Call actions.
- **Schemes Engine**: Define promotional bonus schemes (e.g., *10+2* or *5+1*).
- **Audit Logs & Security**: Track all administrative actions, logins, status changes, and data imports.

### 📱 MR / Salesman Portal (Theme: Green `#12A86B`)
- **Fast Mobile-First Order Entry**:
  - Step 1: Select or create party with instant search.
  - Step 2: Product catalog search with category tabs (Tablet, Capsule, Syrup, Injection, Other).
  - Dual steppers for **Sale Quantity** and **Separate Free Quantity**.
  - **Financial Invariant**: `Line Total = Sale Qty × PTR`. Free quantity adds ₹0.00 to the bill.
  - Automatic scheme bonus suggestions.
- **Subsequent 4-Digit MPIN Login**:
  - Quick, secure keypad authentication without retyping passwords on mobile.
  - First-time setup enforcement and weak PIN blocking.
- **My Orders**: Track personal orders across Draft, Pending, Approved, Rejected, Dispatched, and Delivered states.
- **Party Management**: Create new chemist/retailer accounts on the field, automatically assigned to the salesman.
- **Performance Report**: Personal sales analytics, target progress, and top-performing accounts (isolated from peer data).
- **Strict Role-Based Security**: Salesmen have zero access to Excel imports, other salesmen's performance, or global business financials.

### ⚡ PWA & Modern Architecture
- **Progressive Web App**: Installable on Android, iOS, and Desktop with offline asset caching.
- **Responsive Layout**: Native-feeling bottom navigation on mobile devices; comprehensive sidebar on desktop screens.

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **PostgreSQL**: v14+ (or Supabase instance)

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your PostgreSQL connection string:
```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shreeji_healthcare
JWT_SECRET=shreeji-healthcare-secret-token-key-super-secure-production-2026
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Migration & Seed
Run migrations and load realistic pharma seed data:
```bash
npm run db:migrate
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Credentials

| Role | Username / Identifier | Password | 4-Digit MPIN |
| :--- | :--- | :--- | :--- |
| **Owner / Admin** | `owner` or `owner@shreejihealthcare.in` | `Password123!` | N/A (Password only) |
| **Salesman (Ramesh)** | `ramesh` or `9876543211` | `Password123!` | `1234` |
| **Salesman (Suresh)** | `suresh` or `9876543212` | `Password123!` | *Prompted on first login* |
| **Salesman (Amit)** | `amit` or `9876543213` | `Password123!` | `1234` |

---

## 🏗️ Project Architecture

```
├── database/
│   ├── migrations/       # PostgreSQL schemas, indexes, and RLS policies
│   └── seed/             # Realistic pharma seed data
├── docs/                 # Detailed API, Database & Architecture specs
├── public/               # Brand logos, PWA icons, manifest.json, sw.js
├── src/
│   ├── app/              # Next.js 15 App Router pages & API routes
│   │   ├── api/          # Protected REST API Route Handlers
│   │   ├── owner/        # Owner portal (Blue theme)
│   │   ├── salesman/     # Salesman portal (Green theme)
│   │   ├── login/        # Unified role-detecting login
│   │   └── mpin/         # 4-Digit MPIN keypad login & setup
│   ├── components/       # Custom UI components, Steppers, Excel Uploader
│   ├── lib/              # DB connection pool, Auth, MPIN, Excel engine
│   └── types/            # TypeScript domain interfaces
```

---

## 🧪 Testing & Production Build

### Compile Production Build
```bash
npm run build
npm run start
```
