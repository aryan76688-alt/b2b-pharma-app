# ARCHITECTURE DOCUMENTATION
## SHREEJI HEALTHCARE — “A Unit of Shreeji 7”
### Wholesale Pharmaceutical Distributor Order Management System

---

## 1. System Overview

Shreeji Healthcare is a specialized B2B Order Management System engineered specifically for wholesale pharmaceutical distribution. The system coordinates operations between the **Owner / Distributor** and medical representatives (**MR / Salesmen**).

Unlike generic e-commerce applications, pharmaceutical distribution requires:
- Explicit separation of **Billing Quantity** and **Bonus/Free Quantity** (Free quantity is physically supplied to retailers but must **never** be billed).
- Auto-detection of roles upon authentication with zero client-side role toggle.
- First-time password login followed by a mandatory **4-digit MPIN creation** for fast, secure field operations.
- Owner-controlled salesman provisioning, stock imports, party ledger imports, daily outstanding snapshots, and two-stage order approvals (Pending → Approved/Rejected).
- Full auditability of order status changes and critical business operations.

```
                      +---------------------------------------+
                      |         SHREEJI HEALTHCARE            |
                      |        "A Unit of Shreeji 7"          |
                      +-------------------+-------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
         +--------------v--------------+     +--------------v--------------+
         |     OWNER / DISTRIBUTOR     |     |        MR / SALESMAN        |
         |   Theme: Blue (#1267E8)     |     |   Theme: Emerald (#00A86B)  |
         +--------------+--------------+     +--------------+--------------+
                        |                                   |
             +----------+----------+             +----------+----------+
             |                     |             |                     |
     +-------v-------+     +-------v-------+ +---v-----------+ +-------v-------+
     | Excel Imports |     | Approvals &   | | Field Orders  | | My Parties &  |
     | Stock/Parties/|     | Salesman-Wise | | Free Qty &    | | Tour Plan &   |
     | Outstanding   |     | Analytics     | | Schemes       | | Daily Activity|
     +---------------+     +---------------+ +---------------+ +---------------+
                        |                                   |
                        +-----------------+-----------------+
                                          |
                      +-------------------v-------------------+
                      |      Backend REST API (/api/v1)       |
                      |   Auth / MPIN / RBAC Middleware       |
                      +-------------------+-------------------+
                                          |
                      +-------------------v-------------------+
                      |   PostgreSQL / Supabase Database      |
                      |     RLS + Indexes + Audit Logging     |
                      +---------------------------------------+
```

---

## 2. Core Architectural Pillars

### 2.1 Role-Based Access & Auto-Role Detection
- The client application never sends a role in login payloads.
- The backend verifies credentials against `users` and `user_security`.
- The JWT payload and `/auth/me` response contain the verified role (`owner` or `salesman`), triggering dynamic client routing to the appropriate interface:
  - `owner` → Owner Dashboard (`#1267E8` primary color system)
  - `salesman` → Salesman Dashboard (`#00A86B` primary color system)
- Any attempt by a salesman to call Owner-only endpoints (such as Excel imports or order approvals) triggers a hard **HTTP 403 Forbidden**.

### 2.2 4-Digit MPIN Lifecycle
1. **Account Creation**: Owner creates a salesman with a temporary password (`first_login = true`, `mpin_created = false`).
2. **First Login**: Salesman enters temporary credentials. The backend verifies credentials and flags `first_login: true`.
3. **Mandatory 4-Digit MPIN Setup**:
   - The user must enter and confirm an exact 4-digit numeric MPIN.
   - The MPIN is hashed using PBKDF2/SHA-256 with salt before storage in `user_security`.
   - The raw MPIN is never stored in plaintext, never logged, and never returned in API payloads.
   - Upon successful setup: `first_login = false`, `mpin_created = true`.
4. **Subsequent Logins**:
   - Quick 4-digit MPIN login with numeric keypad entry.
   - Password fallback is always provided.
   - Rate limiting: Locked for 15 minutes after 5 consecutive failed attempts.
   - Owner can force MPIN or password reset at any time.

### 2.3 Free Quantity Business Logic
Pharmaceutical trade schemes routinely offer deals such as **10+2** (Buy 10, Get 2 Free) or **5+1**.
- `quantity`: Billed units (integer >= 1).
- `free_quantity`: Bonus unbilled units (integer >= 0).
- `line_total`: quantity * ptr - discount.
- Total Physical Quantity = quantity + free_quantity.
- The database schema strictly maintains `quantity` and `free_quantity` as separate columns in `order_items` and `orders`.

### 2.4 Transactional Excel Import Pipeline
Owners can upload `.xlsx` and `.xls` files for Stock, Parties, and Outstanding balances:
1. **Upload & Parsing**: Multer receives the file; XLSX parses the buffer in-memory.
2. **Auto-Match Columns**: Column headers are fuzzy-matched against canonical schema fields.
3. **Validation & Duplicate Detection**: Checks for required fields, numeric constraints, and existing DB keys.
4. **Interactive Preview**: Returns counts of valid, duplicate, and invalid rows.
5. **Atomic Execution**: Imports run within an isolated PostgreSQL transaction (`BEGIN ... COMMIT`) to prevent partial corruption.

---

## 3. Directory Layout

```
├── assets/                  # Brand assets (Shreeji Healthcare Logo, icons)
├── backend/                 # Node.js + Express REST API Server
│   ├── src/
│   │   ├── config/          # DB connection, JWT config, environment constants
│   │   ├── controllers/     # Auth, Owner, Salesman, Orders, Imports, Reports
│   │   ├── middleware/      # JWT verification, Role authorization, Rate limiting
│   │   ├── routes/          # Express route definitions under /api/v1
│   │   ├── utils/           # MPIN hashing, Excel parsing, audit logger
│   │   └── server.js        # Server bootstrap
│   └── tests/               # Automated unit & integration tests
├── database/
│   ├── migrations/          # 001_schema, 002_indexes, 003_rls
│   └── seeds/               # 001_seed_data.sql (Owner, Salesmen, Parties, Products)
├── docs/                    # Architecture, Database, API, Permissions, UI, Import format
├── flutter_app/             # Cross-platform Flutter codebase (Android/Web)
│   ├── lib/
│   │   ├── core/            # Theme, security, network, constants
│   │   ├── features/        # Auth, Owner, Salesman, Orders, Imports, Reports
│   │   └── shared/          # Reusable widgets and models
│   └── pubspec.yaml
└── frontend/                # Production-ready Responsive Web App & PWA
    ├── src/                 # Screens matching O-01..O-44 and S-01..S-30
    └── package.json
```
