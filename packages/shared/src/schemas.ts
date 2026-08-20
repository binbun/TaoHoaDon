import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export const UserRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']);

export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Họ tên không được để trống').max(100),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  role: UserRoleSchema.default('USER'),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Họ tên không được để trống').max(100).optional(),
  email: z.string().email('Email không hợp lệ').optional(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional(),
  role: UserRoleSchema.optional(),
});

export const ResetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

export const ProductSchema = z.object({
  code: z.string().min(1, 'Mã sản phẩm không được để trống').max(50, 'Mã sản phẩm tối đa 50 ký tự'),
  oldCode: z.string().max(50).optional().nullable(),
  name: z.string().min(1, 'Tên sản phẩm không được để trống').max(255, 'Tên sản phẩm tối đa 255 ký tự'),
  brand: z.string().default('GROB'),
  category: z.string().default('Khác'),
  shortDescription: z.string().max(500, 'Mô tả ngắn tối đa 500 ký tự').optional().nullable(),
  cabinetWidth: z.string().max(50).optional().nullable(),
  dimensions: z.string().max(100).optional().nullable(),
  unit: z.string().min(1, 'Đơn vị tính không được để trống').default('Bộ'),
  price: z.coerce.number().min(0, 'Đơn giá không được âm'),
  retailPrice: z.coerce.number().min(0).optional().nullable().default(0),
  discountRate: z.coerce.number().min(0).max(100).optional().nullable().default(0),
  vatRate: z.coerce.number().min(0, 'VAT không được âm').max(100, 'VAT tối đa 100%').default(0),
  active: z.boolean().default(true),
});

export const CustomerSchema = z.object({
  companyName: z.string().min(1, 'Tên công ty/khách hàng không được để trống').max(255),
  contactName: z.string().max(100).optional().nullable(),
  email: z.string().email('Email không đúng định dạng').optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  taxCode: z.string().max(50).optional().nullable(),
});

export const QuotationItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional().nullable(),
  productNameSnapshot: z.string().min(1, 'Tên sản phẩm không được để trống'),
  descriptionSnapshot: z.string().max(300).optional().nullable(),
  unit: z.string().min(1, 'Đơn vị tính không được để trống').default('Bộ'),
  quantity: z.coerce.number().min(0.01, 'Số lượng phải lớn hơn 0'),
  unitPrice: z.coerce.number().min(0, 'Đơn giá không được âm'),
  discount: z.coerce.number().min(0, 'Chiết khấu không được âm').default(0),
  vatRate: z.coerce.number().min(0, 'VAT không được âm').max(100, 'VAT tối đa 100%').default(0),
  sortOrder: z.number().int().default(0),
});

export const QuotationSchema = z.object({
  quotationNumber: z.string().optional(),
  customerId: z.string().min(1, 'Vui lòng chọn hoặc tạo khách hàng'),
  quotationDate: z.string().min(1, 'Ngày tạo đơn không được để trống'),
  validUntil: z.string().optional(),
  title: z.string().min(1, 'Tiêu đề đơn hàng không được để trống').default('ĐƠN HÀNG PHỤ KIỆN TỦ BẾP & TỦ BẾP CAO CẤP EUPLUS'),
  note: z.string().max(1000).optional().nullable(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'ACCEPTED']).default('DRAFT'),
  previousDebt: z.coerce.number().min(0, 'Dư nợ cũ không được âm').default(0).optional(),
  items: z.array(QuotationItemSchema).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm/dịch vụ'),
});
