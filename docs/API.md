# REST API SPECIFICATION
## SHREEJI HEALTHCARE — “A Unit of Shreeji 7”
### Base URL: `/api/v1`

---

## 1. Response & Error Standard

### Success Format (HTTP 200, 201)
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional descriptive status"
}
```

### Error Format (HTTP 400, 401, 403, 404, 422, 429, 500)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CONSTANT",
    "message": "Human-readable explanation",
    "details": [ ... ]
  }
}
```

Common Error Codes:
- `VALIDATION_ERROR` (400 / 422)
- `UNAUTHENTICATED` (401)
- `UNAUTHORIZED_ROLE` (403)
- `RESOURCE_NOT_FOUND` (404)
- `MPIN_LOCKED` (429)
- `CONFLICT` (409)
- `INTERNAL_SERVER_ERROR` (500)

---

## 2. Authentication Endpoints

### 2.1 Password Login (Auto-Role Detection)
- **POST** `/auth/login`
- **Public**
- **Request Body**:
  ```json
  {
    "identifier": "owner@shreejihealthcare.in", // Email, Username, or Mobile
    "password": "Password123!"
  }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "c1f7b0a8-...",
        "role": "owner", // or "salesman"
        "fullName": "Owner Admin",
        "username": "owner",
        "email": "owner@shreejihealthcare.in",
        "mobile": "9876543210",
        "firstLogin": false,
        "mpinCreated": false
      }
    }
  }
  ```

### 2.2 MPIN Login (Subsequent Salesman Login)
- **POST** `/auth/mpin/login`
- **Public (Rate Limited: max 5 attempts)**
- **Request Body**:
  ```json
  {
    "identifier": "ramesh", // Username, Mobile, or Email
    "mpin": "1234"         // Exactly 4 numeric digits
  }
  ```
- **Response (200)**: Returns user payload and JWT session.

### 2.3 Create 4-Digit MPIN (First-Time Salesman Setup)
- **POST** `/auth/mpin/create`
- **Requires**: `requireAuth`
- **Request Body**:
  ```json
  {
    "mpin": "1234",
    "confirmMpin": "1234"
  }
  ```
- **Rules**:
  - MPIN must be exactly 4 digits (`^[0-9]{4}$`).
  - `confirmMpin` must match `mpin`.
  - Hashes MPIN using PBKDF2/SHA-256 with user salt.
  - Updates `first_login = false`, `mpin_created = true`.

### 2.4 Change MPIN
- **POST** `/auth/mpin/change`
- **Requires**: `requireAuth`
- **Request Body**:
  ```json
  {
    "currentMpin": "1234",
    "newMpin": "5678",
    "confirmNewMpin": "5678"
  }
  ```

### 2.5 Current Authenticated User
- **GET** `/auth/me`
- **Requires**: `requireAuth`

---

## 3. Owner Management Endpoints (`requireOwner`)

### 3.1 Owner Dashboard Overview
- **GET** `/owner/dashboard?period=today|week|month|custom&startDate=...&endDate=...`
- Returns: Total Sales, Total Orders, Pending, Approved, Rejected, Salesmen count, Recent orders, Sales Trends.

### 3.2 List Salesmen
- **GET** `/owner/salesmen`
- Returns all salesman profiles, target performance, active status.

### 3.3 Create Salesman
- **POST** `/owner/salesmen`
- **Request Body**:
  ```json
  {
    "fullName": "Ramesh Kumar",
    "mobile": "9876543211",
    "email": "ramesh@shreejihealthcare.in",
    "username": "ramesh",
    "temporaryPassword": "TempPassword123!",
    "employeeCode": "SH001",
    "joiningDate": "2026-09-01",
    "territory": "Ahmedabad West",
    "status": "active",
    "targetAmount": 150000.00
  }
  ```

### 3.4 Reset Salesman MPIN / Password
- **POST** `/owner/salesmen/:id/reset-mpin`
- **POST** `/owner/salesmen/:id/reset-password`

---

## 4. Order Management Endpoints

### 4.1 List Orders
- **GET** `/orders?status=...&salesmanId=...&partyId=...&search=...&page=1&limit=20`
- **Owner**: Returns all orders across all salesmen.
- **Salesman**: Strict filter returning ONLY their own orders (`salesman_id = req.user.id`).

### 4.2 Create Order (Salesman Only)
- **POST** `/orders`
- **Requires**: `requireSalesman`
- **Request Body**:
  ```json
  {
    "partyId": "d98124fa-...",
    "status": "pending", // or "draft"
    "remarks": "Urgent delivery requested",
    "items": [
      {
        "productId": "e12a43b1-...",
        "quantity": 10,
        "freeQuantity": 2, // Stored separately, unbilled
        "ptr": 12.50,
        "mrp": 23.00,
        "discountAmount": 0.00
      }
    ]
  }
  ```
- **Calculation Verification**:
  - `line_total` = (10 * 12.50) - 0.00 = 125.00
  - `total_quantity` = 10
  - `total_free_quantity` = 2
  - `total_physical_quantity` = 12
  - `total_amount` = 125.00 (Free Qty adds ₹0.00).

### 4.3 Approve Order (Owner Only)
- **POST** `/orders/:id/approve`
- **Requires**: `requireOwner`
- Updates `status = 'approved'`, `approved_by = req.user.id`, `approved_at = now()`.
- Inserts record into `order_status_history`.
- Triggers notification to salesman.

### 4.4 Reject Order (Owner Only)
- **POST** `/orders/:id/reject`
- **Requires**: `requireOwner`
- **Request Body**: `{ "rejectionReason": "Party credit limit exceeded" }`
- Updates `status = 'rejected'`.

### 4.5 Salesman-Wise Order Summary (Owner Only)
- **GET** `/orders/salesman-wise-summary?period=month`
- Returns order counts and total sales aggregated by salesman.

---

## 5. Party Management Endpoints

### 5.1 List Parties
- **GET** `/parties?search=...&city=...&type=...`
- **Owner**: All parties.
- **Salesman**: My Parties (assigned to salesman).

### 5.2 Create Party
- **POST** `/parties`
- Allowed for both Owner and Salesman. If created by Salesman, `assigned_salesman_id` defaults to the creator.
- **Request Body**:
  ```json
  {
    "partyName": "Shiv Medical Store",
    "mobile": "9825012345",
    "email": "shivmed@gmail.com",
    "gstNumber": "24AAAAA0000A1Z5",
    "address": "Shop 4, Crystal Plaza, Navrangpura",
    "state": "Gujarat",
    "city": "Ahmedabad",
    "area": "Navrangpura",
    "partyType": "chemist",
    "creditLimit": 50000.00,
    "openingBalance": 0.00
  }
  ```

### 5.3 Party Ledger & Outstanding
- **GET** `/parties/:id/ledger`
- **GET** `/parties/:id/outstanding`

---

## 6. Excel Import Engine Endpoints (`requireOwner` ONLY)
Salesman requests to `/imports/*` are rejected with **HTTP 403 Forbidden**.

### 6.1 Import Stock Excel
- **POST** `/imports/stock`
- **Multipart Form-Data**: `file` (.xlsx or .xls)
- Parameters: `updateExisting` (boolean), `columnMapping` (JSON optional).

### 6.2 Import Parties Excel
- **POST** `/imports/parties`

### 6.3 Import Outstanding Excel
- **POST** `/imports/outstanding`

### 6.4 Download Sample Excel Templates
- **GET** `/imports/sample/stock`
- **GET** `/imports/sample/parties`
- **GET** `/imports/sample/outstanding`

---

## 7. Reports & Analytics Endpoints

### 7.1 Owner Reports (`requireOwner`)
- **GET** `/reports/sales`
- **GET** `/reports/orders`
- **GET** `/reports/salesman-wise`
- **GET** `/reports/party-outstanding`
- **GET** `/reports/stock`
- **GET** `/reports/export?type=sales|orders|stock|outstanding&format=csv|xlsx`

### 7.2 Salesman Reports (`requireSalesman`)
- **GET** `/salesman/reports`
- Returns personal sales, commission targets, visited parties, free quantity disbursed. Never exposes peer salesmen data.
