export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type QuotationStatus = 'DRAFT' | 'SENT' | 'PAID';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  name: string;
  shortDescription?: string | null;
  unit: string;
  price: number;
  vatRate: number; // e.g. 8 for 8%, 10 for 10%
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItemInput {
  id?: string;
  productId?: string | null;
  productNameSnapshot: string;
  descriptionSnapshot?: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number; // discount amount in VND
  vatRate: number; // percentage, e.g. 8
  sortOrder: number;
}

export interface CalculatedQuotationItem extends QuotationItemInput {
  id: string;
  quotationId?: string;
  subtotal: number; // quantity * unitPrice
  taxableAmount: number; // subtotal - discount
  vatAmount: number; // taxableAmount * (vatRate / 100)
  total: number; // taxableAmount + vatAmount
}

export interface QuotationSummary {
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  vatTotal: number;
  grandTotal: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customer?: Customer;
  quotationDate: string;
  validUntil: string;
  title: string;
  note?: string | null;
  status: QuotationStatus;
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  vatTotal: number;
  grandTotal: number;
  items: CalculatedQuotationItem[];
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
  statusDistribution: Record<QuotationStatus, number>;
}
