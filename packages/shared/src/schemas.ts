import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export const ProductSchema = z.object({
  code: z.string().min(1, 'Mã sản phẩm không được để trống').max(50, 'Mã sản phẩm tối đa 50 ký tự'),
  name: z.string().min(1, 'Tên sản phẩm không được để trống').max(255, 'Tên sản phẩm tối đa 255 ký tự'),
  shortDescription: z.string().max(250, 'Mô tả ngắn tối đa 250 ký tự').optional().nullable(),
  unit: z.string().min(1, 'Đơn vị tính không được để trống').default('Gói'),
  price: z.coerce.number().min(0, 'Đơn giá không được âm'),
  vatRate: z.coerce.number().min(0, 'VAT không được âm').max(100, 'VAT tối đa 100%').default(8),
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
  unit: z.string().min(1, 'Đơn vị tính không được để trống').default('Gói'),
  quantity: z.coerce.number().min(0.01, 'Số lượng phải lớn hơn 0'),
  unitPrice: z.coerce.number().min(0, 'Đơn giá không được âm'),
  discount: z.coerce.number().min(0, 'Chiết khấu không được âm').default(0),
  vatRate: z.coerce.number().min(0, 'VAT không được âm').max(100, 'VAT tối đa 100%').default(8),
  sortOrder: z.number().int().default(0),
});

export const QuotationSchema = z.object({
  quotationNumber: z.string().optional(),
  customerId: z.string().min(1, 'Vui lòng chọn hoặc tạo khách hàng'),
  quotationDate: z.string().min(1, 'Ngày báo giá không được để trống'),
  validUntil: z.string().min(1, 'Ngày hết hạn không được để trống'),
  title: z.string().min(1, 'Tiêu đề báo giá không được để trống').default('BÁO GIÁ DỊCH VỤ'),
  note: z.string().max(1000).optional().nullable(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).default('DRAFT'),
  items: z.array(QuotationItemSchema).min(1, 'Báo giá phải có ít nhất 1 sản phẩm/dịch vụ'),
}).refine((data) => {
  if (data.quotationDate && data.validUntil) {
    return new Date(data.validUntil) >= new Date(data.quotationDate);
  }
  return true;
}, {
  message: 'Ngày hết hạn phải lớn hơn hoặc bằng ngày báo giá',
  path: ['validUntil'],
});
