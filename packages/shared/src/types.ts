export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type QuotationStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOIDED'
  | 'CANCELLED'
  | 'ACCEPTED';

export type InvoiceType = 'STANDARD' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export interface Payment {
  id: string;
  quotationId: string;
  amount: number;
  currency: string;
  gateway: string;
  gatewayTransactionId?: string | null;
  referenceCode?: string | null;
  note?: string | null;
  paymentDate: string;
  recordedBy?: string | null;
  createdAt: string;
}

export interface TaxBracketBreakdown {
  vatRate: number;
  taxableBase: number;
  vatAmount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  code: string;
  oldCode?: string | null;
  name: string;
  brand: string;
  category: string;
  shortDescription?: string | null;
  cabinetWidth?: string | null;
  dimensions?: string | null;
  unit: string;
  price: number;
  retailPrice?: number | null;
  discountRate?: number | null;
  vatRate: number; // e.g. 0 for 0%, 8 for 8%, 10 for 10%
  active: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItemInput {
  id?: string;
  productId?: string | null;
  productCodeSnapshot?: string | null;
  productNameSnapshot: string;
  descriptionSnapshot?: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage, e.g. 10 for 10%
  vatRate: number; // percentage, e.g. 0 or 8 or 10
  sortOrder: number;
}

export interface CalculatedQuotationItem extends QuotationItemInput {
  id: string;
  quotationId?: string;
  product?: { id: string; code: string; name: string } | null;
  subtotal: number; // quantity * unitPrice
  discountAmount?: number; // subtotal * (discount / 100)
  taxableAmount: number; // subtotal - discountAmount
  vatAmount: number; // taxableAmount * (vatRate / 100)
  total: number; // taxableAmount + vatAmount
}

export interface QuotationSummary {
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  vatTotal: number;
  previousDebt?: number;
  grandTotal: number;
  balanceDue?: number;
  taxBreakdown?: TaxBracketBreakdown[];
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  invoiceType?: InvoiceType;
  originalInvoiceId?: string | null;
  originalInvoice?: Quotation | null;
  customerId: string;
  customer?: Customer;
  quotationDate: string;
  validUntil?: string | null;
  title: string;
  note?: string | null;
  status: QuotationStatus;
  currency?: string;
  exchangeRate?: number;
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  vatTotal: number;
  previousDebt?: number;
  grandTotal: number;
  balanceDue?: number;
  taxBreakdown?: TaxBracketBreakdown[];
  issuedAt?: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  voidedBy?: string | null;
  items: CalculatedQuotationItem[];
  payments?: Payment[];
  adjustments?: Quotation[];
  createdBy?: string | null;
  creator?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalQuotations: number;
  monthQuotations: number;
  totalGrandTotal: number;
  acceptedGrandTotal: number;
  recentQuotations: Quotation[];
  statusDistribution: Record<string, number>;
}

export interface Brand {
  id: string;
  name: string;
  code?: string | null;
  color?: string | null;
  description?: string | null;
  sortOrder: number;
  active: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBrandInput {
  name: string;
  code?: string | null;
  color?: string | null;
  description?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export interface UpdateBrandInput {
  name?: string;
  code?: string | null;
  color?: string | null;
  description?: string | null;
  sortOrder?: number;
  active?: boolean;
}

