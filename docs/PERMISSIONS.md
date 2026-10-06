# ROLE & PERMISSION MATRIX
## SHREEJI HEALTHCARE — “A Unit of Shreeji 7”

---

## 1. Core Principles

1. **Zero Client Trust**: The frontend role is purely a UI presentation state derived from verified JWT claims. Every API endpoint enforces role authorization on the server.
2. **Explicit Denial**: If an endpoint is marked for `owner`, any request signed with a `salesman` token immediately aborts with `HTTP 403 Forbidden`.
3. **Data Isolation**: A Salesman can never query or mutate another Salesman's private orders, reports, or assigned parties.

---

## 2. Feature Permission Matrix

| Feature / Action | Owner / Distributor | MR / Salesman | Enforcement Mechanism |
| :--- | :---: | :---: | :--- |
| **Authentication & Profile** |
| Password Login | YES | YES | Public (`/auth/login`) |
| Auto-detect Role | YES | YES | Backend JWT payload |
| Create 4-Digit MPIN | Optional | YES (Mandatory 1st Login) | `requireAuth` |
| MPIN Login | YES | YES | Rate limited endpoint |
| Change MPIN | YES | YES | `requireAuth` |
| **Salesman Management** |
| View Salesmen List | YES | NO | `requireOwner` (403 for Salesman) |
| Add Salesman Account | YES | NO | `requireOwner` (403 for Salesman) |
| Edit Salesman Details | YES | NO | `requireOwner` (403 for Salesman) |
| Reset Salesman Password / MPIN | YES | NO | `requireOwner` (403 for Salesman) |
| **Excel Bulk Imports** |
| Import Stock Excel | YES | NO | `requireOwner` (403 for Salesman) |
| Import Parties Excel | YES | NO | `requireOwner` (403 for Salesman) |
| Import Outstanding Excel | YES | NO | `requireOwner` (403 for Salesman) |
| Download Import Samples | YES | NO | `requireOwner` (403 for Salesman) |
| **Parties & Retailers** |
| View All Parties | YES | NO | `requireOwner` |
| View Assigned Parties | YES | YES (My Parties) | Scoped by `assigned_salesman_id` |
| Add Party | YES | YES | `requireAuth` (Salesman creator auto-assigned) |
| Edit Party Details | YES | Restricted | Owner has full edit |
| View Party Ledger & Outstanding | YES | Restricted | Scoped to assigned parties |
| **Products & Schemes** |
| View Product Catalog & Stock | YES | YES | `requireAuth` |
| Manage Schemes | YES | NO | `requireOwner` |
| View Active Schemes | YES | YES | `requireAuth` |
| **Orders & Approvals** |
| Create Order with Free Qty | NO | YES | `requireSalesman` |
| Save Order Draft | NO | YES | `requireSalesman` |
| Submit Order for Approval | NO | YES | `requireSalesman` |
| View All System Orders | YES | NO | `requireOwner` |
| View Own Orders | YES | YES | Scoped by `salesman_id` |
| Approve Order | YES | NO | `requireOwner` (403 for Salesman) |
| Reject Order (with reason) | YES | NO | `requireOwner` (403 for Salesman) |
| Salesman-wise Filter & Review | YES | NO | `requireOwner` |
| **Reports & Analytics** |
| Company Sales & Orders Dashboard | YES | NO | `requireOwner` |
| Salesman-wise Performance Report | YES | NO | `requireOwner` |
| Outstanding Aging Report | YES | NO | `requireOwner` |
| My Personal Sales & Target Report | NO | YES | `requireSalesman` (Own data only) |
| Export Data (Excel/CSV) | YES | NO | `requireOwner` |
| **System Security** |
| View Audit Logs | YES | NO | `requireOwner` |
| Configure Company Settings | YES | NO | `requireOwner` |
