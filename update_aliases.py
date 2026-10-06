import re

with open("src/lib/excel.ts", "r") as f:
    content = f.read()

# Modify OUTSTANDING_COLUMNS
outstanding_replacement = """export const OUTSTANDING_COLUMNS: ColumnMappingDefinition[] = [
  { field: 'partyName', label: 'Party', required: true, aliases: ['party', 'party_name', 'chemist', 'customer', 'name'] },
  { field: 'totalOutstanding', label: 'Total Outstanding', required: true, aliases: ['total_outstanding', 'outstanding', 'balance', 'due_amount', 'amount'] },
  { field: 'pendingDays', label: 'Days Since Last Payment', required: false, aliases: ['days_since_last_payment', 'pending_days', 'days', 'overdue_days', 'aging'] },
  { field: 'lastBillDate', label: 'Last Bill Date', required: false, aliases: ['last_bill_date', 'bill_date', 'invoice_date'] },
  { field: 'lastPaymentDate', label: 'Last Payment Received Date', required: false, aliases: ['last_payment_received_date', 'last_payment_date', 'payment_date', 'receipt_date'] },
];"""

content = re.sub(r'export const OUTSTANDING_COLUMNS: ColumnMappingDefinition\[\] = \[.*?\];', outstanding_replacement, content, flags=re.DOTALL)

# Modify PARTY_COLUMNS
party_replacement = """export const PARTY_COLUMNS: ColumnMappingDefinition[] = [
  { field: 'partyName', label: 'Party Name', required: true, aliases: ['party', 'party_name', 'chemist', 'customer', 'firm_name', 'name'] },
  { field: 'partyCode', label: 'Code', required: false, aliases: ['code', 'party_code', 'customer_code', 'id'] },
  { field: 'deliveryRoute', label: 'Delivery Route', required: false, aliases: ['delivery_route', 'route'] },
  { field: 'mobile', label: 'Mobile No.', required: false, aliases: ['mobile', 'phone', 'contact', 'cell', 'mobile_no'] },
  { field: 'landline', label: 'Landline', required: false, aliases: ['landline', 'telephone'] },
  { field: 'email', label: 'Email', required: false, aliases: ['email', 'mail'] },
  { field: 'gstNumber', label: 'GST No.', required: false, aliases: ['gst', 'gstin', 'gst_number', 'gst_no'] },
  { field: 'address1', label: 'Address Line 1', required: false, aliases: ['address_1', 'address', 'street', 'location', 'address_line_1'] },
  { field: 'address2', label: 'Address Line 2', required: false, aliases: ['address_2', 'address_line_2'] },
  { field: 'address3', label: 'Address Line 3', required: false, aliases: ['address_3', 'address_line_3'] },
  { field: 'city', label: 'City', required: false, aliases: ['city', 'town'] },
  { field: 'state', label: 'State', required: false, aliases: ['state', 'province'] },
  { field: 'status', label: 'Status', required: false, aliases: ['status', 'active'] },
];"""

content = re.sub(r'export const PARTY_COLUMNS: ColumnMappingDefinition\[\] = \[.*?\];', party_replacement, content, flags=re.DOTALL)

with open("src/lib/excel.ts", "w") as f:
    f.write(content)
