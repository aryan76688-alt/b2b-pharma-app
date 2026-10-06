# EXCEL IMPORT FILE FORMAT SPECIFICATION
## SHREEJI HEALTHCARE — “A Unit of Shreeji 7”

---

## 1. Stock Import Format (`.xlsx`, `.xls`)

### Required Columns & Aliases
| Canonical Field | Supported Column Header Aliases | Type | Example | Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Product Name** | `Product Name`, `Item Name`, `Medicine Name`, `Product` | Text | `Paracetamol 650` | Required, non-empty |
| **Product Code** | `Product Code`, `Item Code`, `Code`, `Item SKU` | Text | `PARA650` | Unique identifier |
| **Company** | `Company`, `Manufacturer`, `Brand`, `Mfg` | Text | `Sun Pharma` | Defaults to 'Shreeji 7' if empty |
| **Packing** | `Packing`, `Pack`, `Pack Size` | Text | `10x10 Tablets` | Non-empty |
| **Batch No** | `Batch No`, `Batch`, `Batch Number`, `Lot` | Text | `BCH-2026-09` | Alphanumeric |
| **Expiry Date** | `Expiry Date`, `Expiry`, `Exp Date`, `Exp` | Date / Text | `2027-08-31` | Valid future date (YYYY-MM-DD) |
| **MRP** | `MRP`, `Max Retail Price`, `Retail Price` | Number | `23.00` | Decimal >= 0 |
| **PTR** | `PTR`, `Price To Retailer`, `Rate`, `Billing Rate` | Number | `12.50` | Decimal >= 0, PTR <= MRP |
| **Stock Qty** | `Stock Qty`, `Stock`, `Quantity`, `Available Stock` | Integer | `450` | Integer >= 0 |
| **Free Qty** | `Free Qty`, `Bonus Qty`, `Free Stock` | Integer | `45` | Integer >= 0 (Optional) |
| **Scheme** | `Scheme`, `Trade Scheme`, `Offer` | Text | `10+2` | String notation (e.g. 10+2) |

---

## 2. Parties Import Format (`.xlsx`, `.xls`)

### Required Columns & Aliases
| Canonical Field | Supported Column Header Aliases | Type | Example | Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Party Name** | `Party Name`, `Customer Name`, `Chemist Name`, `Shop Name` | Text | `Shiv Medical Store` | Required, non-empty |
| **Party Code** | `Party Code`, `Customer Code`, `Account Code`, `Party ID` | Text | `PRT-1001` | Unique |
| **Mobile** | `Mobile`, `Mobile Number`, `Phone`, `Contact` | Text | `9825012345` | 10-digit Indian mobile number |
| **Email** | `Email`, `Email Address` | Text | `shiv@pharmacy.in` | Valid email format (optional) |
| **GST Number** | `GST Number`, `GSTIN`, `GST No`, `GST` | Text | `24AAAAA0000A1Z5` | Valid Indian GSTIN (optional) |
| **Address** | `Address`, `Shop Address`, `Street` | Text | `Shop 4, Crystal Plaza` | Required |
| **City** | `City`, `Town` | Text | `Ahmedabad` | Required |
| **State** | `State`, `Province` | Text | `Gujarat` | Defaults to 'Gujarat' |
| **Credit Limit** | `Credit Limit`, `Limit`, `Max Credit` | Number | `50000.00` | Decimal >= 0 |
| **Opening Balance**| `Opening Balance`, `Op Bal`, `Balance` | Number | `12500.00` | Decimal |

---

## 3. Outstanding Import Format (`.xlsx`, `.xls`)

### Required Columns & Aliases
| Canonical Field | Supported Column Header Aliases | Type | Example | Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Party Name** | `Party Name`, `Customer Name`, `Chemist Name` | Text | `Shiv Medical Store` | Matches existing party |
| **Party Code** | `Party Code`, `Customer Code`, `Code` | Text | `PRT-1001` | Matches existing party code |
| **Last Bill Date**| `Last Bill Date`, `Bill Date`, `Recent Bill` | Date / Text | `2026-09-12` | Valid Date |
| **Last Payment Date**| `Last Payment Date`, `Payment Date`, `Paid Date` | Date / Text | `2026-08-28` | Valid Date |
| **Total Outstanding**| `Total Outstanding`, `Outstanding`, `Balance Due` | Number | `42350.00` | Decimal |
| **Pending Days**| `Pending Days`, `Days Due`, `Overdue Days` | Integer | `16` | Auto-calculated if omitted |
| **Total Bills** | `Total Bills`, `Bill Count`, `Pending Bills` | Integer | `3` | Integer >= 0 |
| **Total Received**| `Total Received`, `Received Amount`, `Total Paid` | Number | `35000.00` | Decimal >= 0 |
