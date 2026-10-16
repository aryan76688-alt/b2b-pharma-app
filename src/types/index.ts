export type UserRole = 'super_admin' | 'owner' | 'admin' | 'salesman' | 'chemist';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  mobile: string;
  email: string;
  username: string;
  employeeCode?: string;
  profilePhotoUrl?: string;
  status: UserStatus;
  firstLogin: boolean;
  mpinCreated: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesmanProfile {
  id: string;
  userId: string;
  employeeCode: string;
  territory: string;
  joiningDate: string;
  targetAmount: number;
  totalOrders?: number;
  totalSales?: number;
  pendingOrders?: number;
  approvedOrders?: number;
  user?: User;
}

export type PartyType = 'retailer' | 'chemist' | 'hospital' | 'other';

export interface Party {
  id: string;
  partyCode: string;
  partyName: string;
  mobile: string;
  email?: string;
  gstNumber?: string;
  address: string;
  state: string;
  city: string;
  area: string;
  partyType: PartyType;
  creditLimit: number;
  openingBalance: number;
  currentBalance?: number;
  assignedSalesmanId?: string;
  assignedSalesmanName?: string;
  status: 'active' | 'inactive';
  lastBillDate?: string;
  lastPaymentDate?: string;
  pendingDays?: number;
  totalOutstanding?: number;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt?: string;
}

export type ProductCategory = 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Other';

export interface ProductBatch {
  id: string;
  productId: string;
  batchNo: string;
  expiryDate: string;
  mrp: number;
  ptr: number;
  stockQty: number;
  freeQty: number;
  isNearExpiry?: boolean;
  isExpired?: boolean;
}

export interface Product {
  id: string;
  productCode: string;
  productName: string;
  genericName?: string;
  company: string;
  category: ProductCategory;
  packing: string;
  barcode?: string;
  hsn?: string;
  gstPercent: number;
  mrp: number;
  ptr: number;
  stockQty: number;
  freeQty: number;
  minimumStock: number;
  defaultScheme?: string;
  batches?: ProductBatch[];
  status?: string;
}

export type SchemeType = 'quantity_bonus' | 'flat_discount' | 'tiered';

export interface Scheme {
  id: string;
  schemeName: string;
  description?: string;
  schemeType: SchemeType;
  buyQuantity: number;
  freeQuantity: number;
  discountPercent: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'expired';
}

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'packed'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id?: string;
  orderId?: string;
  productId: string;
  productName?: string;
  packing?: string;
  batchId?: string;
  batchNo?: string;
  quantity: number;        // Sale / Billed Quantity
  freeQuantity: number;    // Bonus / Free Quantity (Unbilled, ₹0)
  ptr: number;
  mrp: number;
  schemeName?: string;
  discountAmount: number;
  lineTotal: number;       // (quantity * ptr) - discountAmount
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  oldStatus?: string;
  newStatus: string;
  changedBy?: string;
  changedByName?: string;
  remarks?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  partyId: string;
  partyName?: string;
  partyCity?: string;
  partyArea?: string;
  salesmanId: string;
  salesmanName?: string;
  status: OrderStatus;
  orderDate: string;
  deliveryDate?: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  totalQuantity: number;
  totalFreeQuantity: number;
  remarks?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  items?: OrderItem[];
  history?: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PartyTransaction {
  id: string;
  partyId: string;
  transactionDate: string;
  transactionType: 'opening' | 'invoice' | 'payment' | 'adjustment' | 'credit_note' | 'debit_note';
  referenceType?: string;
  referenceId?: string;
  debit: number;
  credit: number;
  balance: number;
  remarks?: string;
  createdAt: string;
}

export interface PartyOutstanding {
  id: string;
  partyId: string;
  partyName?: string;
  partyCode?: string;
  mobile?: string;
  assignedSalesmanName?: string;
  lastBillDate?: string;
  lastPaymentDate?: string;
  totalOutstanding: number;
  totalReceived: number;
  pendingDays: number;
  totalBills: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
