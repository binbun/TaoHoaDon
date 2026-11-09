/**
 * The assistant's tools. All of them READ data with the same permission rules as the REST API.
 * The only "action" tool, prepare_quotation_draft, writes nothing: it returns a checked draft that
 * the user must confirm in the UI, which then calls the normal POST /api/quotations.
 */
import { randomUUID } from 'crypto';
import {
  QuotationSchema,
  QuotationItemInput,
  calculateQuotationTotals,
  getOrderAmount,
  getStatusInfo,
  formatCurrency,
} from '@taohoadon/shared';
import { prisma } from '../prisma';
import { getCarriedDebt, getCustomerDebtDetail, getCustomerDebtMap } from '../payments/payments.service';
import type { LlmToolSpec } from './assistant.llm';

export interface AssistantUser {
  id: string;
  role: string;
  name: string;
  email: string;
}

export interface QuotationDraft {
  draftId: string;
  customer: { id: string; companyName: string };
  payload: Record<string, unknown>; // body for POST /api/quotations
  preview: {
    items: {
      code: string | null;
      name: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      vatRate: number;
      total: number;
    }[];
    summary: ReturnType<typeof calculateQuotationTotals>['summary'];
  };
  warnings: string[];
}

export interface ToolContext {
  user: AssistantUser;
  drafts: QuotationDraft[];
}

// Today in Vietnam (UTC+7) as YYYY-MM-DD
export const vietnamToday = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const clampLimit = (v: unknown, def: number, max: number) => Math.min(max, Math.max(1, Number(v) || def));
const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/** Every word must match at least one of the fields (so "tủ 90 grob" finds "Tủ bếp GROB 90cm"). */
function wordSearch(query: unknown, fields: string[]) {
  const words = String(query ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return words.map((w) => ({ OR: fields.map((f) => ({ [f]: { contains: w, mode: 'insensitive' } })) }));
}

/** USER role only sees the orders they created (same rule as the quotations API). */
function ownOrdersOnly(user: AssistantUser) {
  return user.role === 'USER' ? { createdBy: user.id } : {};
}

// --------------------------------------------------------------------------- //
// Tool descriptions the model sees
// --------------------------------------------------------------------------- //
const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []): LlmToolSpec => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
});

export const TOOL_SPECS: LlmToolSpec[] = [
  fn(
    'search_products',
    'Tìm sản phẩm đang bán theo tên, mã, mã cũ hoặc mô tả. Trả về id, mã, tên, thương hiệu, đơn vị, đơn giá (price), VAT.',
    {
      query: { type: 'string', description: 'Từ khóa, ví dụ "tủ bếp 90" hoặc mã sản phẩm' },
      brand: { type: 'string', description: 'Lọc theo thương hiệu, ví dụ GROB (không bắt buộc)' },
      limit: { type: 'integer', description: 'Số kết quả, mặc định 10, tối đa 25' },
    },
    ['query']
  ),
  fn(
    'search_customers',
    'Tìm khách hàng theo tên công ty, người liên hệ, số điện thoại, email hoặc MST. Trả về id và công nợ hiện tại.',
    {
      query: { type: 'string', description: 'Từ khóa tìm kiếm' },
      limit: { type: 'integer', description: 'Số kết quả, mặc định 8, tối đa 20' },
    },
    ['query']
  ),
  fn(
    'get_customer_debt',
    'Xem công nợ chi tiết của một khách hàng: nợ đầu kỳ, công nợ hiện tại, các đơn còn nợ và các lần thanh toán gần đây.',
    { customerId: { type: 'string', description: 'id khách hàng lấy từ search_customers' } },
    ['customerId']
  ),
  fn(
    'list_quotations',
    'Liệt kê đơn hàng theo bộ lọc. Trả về tổng số đơn khớp, tổng tiền hàng của TẤT CẢ đơn khớp (totalOrderAmount) và danh sách đơn mới nhất. Dùng để trả lời câu hỏi về doanh số theo khoảng ngày.',
    {
      search: { type: 'string', description: 'Số đơn, tiêu đề hoặc tên khách hàng' },
      status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID'], description: 'DRAFT=Bản nháp, SENT=Đã gửi, PAID=Đã thanh toán' },
      customerId: { type: 'string' },
      fromDate: { type: 'string', description: 'YYYY-MM-DD, tính cả ngày này' },
      toDate: { type: 'string', description: 'YYYY-MM-DD, tính cả ngày này' },
      limit: { type: 'integer', description: 'Số đơn trả về, mặc định 10, tối đa 30' },
    }
  ),
  fn(
    'get_quotation',
    'Xem chi tiết một đơn hàng (sản phẩm, tổng tiền, đã trả, còn nợ) theo số đơn (ví dụ DH-2026-0012) hoặc id.',
    {
      quotationNumber: { type: 'string', description: 'Số đơn, ví dụ DH-2026-0012' },
      id: { type: 'string' },
    }
  ),
  fn(
    'prepare_quotation_draft',
    'Chuẩn bị BẢN NHÁP đơn hàng để người dùng xem lại. KHÔNG lưu gì vào hệ thống: người dùng phải tự bấm nút xác nhận. ' +
      'Hệ thống tự lấy tên, đơn vị, đơn giá, VAT từ danh mục và tự tính tiền, công nợ cũ. Nếu có lỗi, sửa theo thông báo rồi gọi lại.',
    {
      customerId: { type: 'string', description: 'id khách hàng lấy từ search_customers' },
      items: {
        type: 'array',
        description: 'Danh sách sản phẩm',
        items: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'id lấy từ search_products' },
            quantity: { type: 'number', description: 'Số lượng, lớn hơn 0' },
            discountPercent: { type: 'number', description: 'Chiết khấu % cho dòng này (0-100), chỉ khi người dùng yêu cầu' },
            unitPrice: { type: 'number', description: 'Chỉ khi người dùng yêu cầu giá khác giá danh mục' },
          },
          required: ['productId', 'quantity'],
        },
      },
      orderDiscount: { type: 'number', description: 'Giảm giá cả đơn, số tiền VNĐ (không phải %), mặc định 0' },
      discountNote: { type: 'string', description: 'Lý do giảm giá' },
      note: { type: 'string', description: 'Ghi chú đơn hàng' },
      quotationDate: { type: 'string', description: 'Ngày đơn YYYY-MM-DD, mặc định hôm nay' },
    },
    ['customerId', 'items']
  ),
];

// --------------------------------------------------------------------------- //
// Implementations
// --------------------------------------------------------------------------- //
async function searchProducts(args: any) {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(args.brand ? { brand: { equals: String(args.brand), mode: 'insensitive' } } : {}),
      AND: wordSearch(args.query, ['name', 'code', 'oldCode', 'shortDescription', 'category', 'dimensions']),
    },
    orderBy: [{ isFavorite: 'desc' }, { code: 'asc' }],
    take: clampLimit(args.limit, 10, 25),
    select: {
      id: true, code: true, oldCode: true, name: true, brand: true, category: true, unit: true,
      price: true, vatRate: true, dimensions: true, cabinetWidth: true, shortDescription: true,
    },
  });
  return { count: products.length, products };
}

async function searchCustomers(args: any) {
  const customers = await prisma.customer.findMany({
    where: { AND: wordSearch(args.query, ['companyName', 'contactName', 'phone', 'email', 'taxCode', 'address']) },
    orderBy: { createdAt: 'desc' },
    take: clampLimit(args.limit, 8, 20),
    select: { id: true, companyName: true, contactName: true, phone: true, address: true, taxCode: true, openingDebt: true },
  });
  const debt = await getCustomerDebtMap(customers);
  return {
    count: customers.length,
    customers: customers.map(({ openingDebt, ...c }) => ({ ...c, currentDebt: debt.get(c.id) ?? 0 })),
  };
}

async function getCustomerDebt(args: any) {
  const detail = await getCustomerDebtDetail(String(args.customerId || ''));
  if (!detail) return { error: 'Không tìm thấy khách hàng với id này. Hãy dùng search_customers để lấy id đúng.' };
  return {
    openingDebt: detail.openingDebt,
    openingRemaining: detail.openingRemaining,
    currentDebt: detail.currentDebt,
    unpaidOrders: detail.orders
      .filter((o) => o.remaining > 0)
      .slice(0, 15)
      .map((o) => ({
        quotationNumber: o.quotationNumber, date: day(o.quotationDate), status: getStatusInfo(o.status).label,
        amount: o.amount, paid: o.paid, remaining: o.remaining,
      })),
    recentPayments: detail.payments.slice(0, 8).map((p) => ({
      amount: p.amount, paidAt: day(p.paidAt), note: p.note, quotationNumber: p.quotation?.quotationNumber ?? null,
    })),
  };
}

async function listQuotations(args: any, ctx: ToolContext) {
  const where: any = { ...ownOrdersOnly(ctx.user) };
  if (args.status === 'PAID') where.status = { in: ['PAID', 'ACCEPTED'] };
  else if (args.status === 'DRAFT' || args.status === 'SENT') where.status = args.status;
  if (args.customerId) where.customerId = String(args.customerId);
  if (isDay(args.fromDate) || isDay(args.toDate)) {
    where.quotationDate = {};
    if (isDay(args.fromDate)) where.quotationDate.gte = new Date(`${args.fromDate}T00:00:00.000Z`);
    if (isDay(args.toDate)) {
      const end = new Date(`${args.toDate}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      where.quotationDate.lt = end;
    }
  }
  if (args.search) {
    const s = String(args.search).trim();
    where.OR = [
      { quotationNumber: { contains: s, mode: 'insensitive' } },
      { title: { contains: s, mode: 'insensitive' } },
      { customer: { companyName: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const [all, latest] = await Promise.all([
    prisma.quotation.findMany({ where, select: { grandTotal: true, previousDebt: true } }),
    prisma.quotation.findMany({
      where,
      orderBy: [{ quotationDate: 'desc' }, { createdAt: 'desc' }],
      take: clampLimit(args.limit, 10, 30),
      select: {
        id: true, quotationNumber: true, quotationDate: true, status: true, grandTotal: true, previousDebt: true,
        customer: { select: { companyName: true } },
        creator: { select: { name: true } },
      },
    }),
  ]);

  return {
    totalMatching: all.length,
    totalOrderAmount: all.reduce((sum, q) => sum + getOrderAmount(q), 0), // goods only, without carried debt
    quotations: latest.map((q) => ({
      id: q.id,
      quotationNumber: q.quotationNumber,
      date: day(q.quotationDate),
      customer: q.customer.companyName,
      status: getStatusInfo(q.status).label,
      orderAmount: getOrderAmount(q),
      grandTotal: q.grandTotal,
      createdBy: q.creator?.name ?? null,
    })),
  };
}

async function getQuotation(args: any, ctx: ToolContext) {
  const where = args.quotationNumber
    ? { quotationNumber: String(args.quotationNumber).trim().toUpperCase() }
    : args.id
    ? { id: String(args.id) }
    : null;
  if (!where) return { error: 'Cần quotationNumber hoặc id.' };

  const q = await prisma.quotation.findUnique({
    where: where as any,
    include: { customer: true, creator: { select: { id: true, name: true } }, items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!q) return { error: 'Không tìm thấy đơn hàng.' };
  if (ctx.user.role === 'USER' && q.createdBy !== ctx.user.id) return { error: 'Bạn không có quyền xem đơn hàng này.' };

  const debt = await getCustomerDebtDetail(q.customerId);
  const orderDebt = debt?.orders.find((o) => o.id === q.id);
  return {
    id: q.id,
    quotationNumber: q.quotationNumber,
    date: day(q.quotationDate),
    status: getStatusInfo(q.status).label,
    customer: { id: q.customer.id, companyName: q.customer.companyName, phone: q.customer.phone },
    createdBy: q.creator?.name ?? null,
    note: q.note,
    items: q.items.map((i) => ({
      code: i.productCodeSnapshot, name: i.productNameSnapshot, unit: i.unit, quantity: i.quantity,
      unitPrice: i.unitPrice, discountPercent: i.discount, vatRate: i.vatRate, total: i.total,
    })),
    orderDiscount: q.orderDiscount,
    previousDebt: q.previousDebt,
    grandTotal: q.grandTotal,
    orderAmount: orderDebt?.amount ?? getOrderAmount(q),
    paid: orderDebt?.paid ?? 0,
    remaining: orderDebt?.remaining ?? 0,
  };
}

async function prepareQuotationDraft(args: any, ctx: ToolContext) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines: any[] = Array.isArray(args.items) ? args.items : [];
  if (!lines.length) return { ok: false, errors: ['Đơn hàng phải có ít nhất 1 sản phẩm.'] };

  const customer = await prisma.customer.findUnique({
    where: { id: String(args.customerId || '') },
    select: { id: true, companyName: true },
  });
  if (!customer) errors.push('Không tìm thấy khách hàng. Hãy dùng search_customers để lấy id đúng.');

  const ids = [...new Set(lines.map((l) => String(l?.productId || '')))];
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: QuotationItemInput[] = [];
  lines.forEach((line, index) => {
    const p = byId.get(String(line?.productId || ''));
    if (!p) return errors.push(`Dòng ${index + 1}: không tìm thấy sản phẩm id "${line?.productId}". Hãy dùng search_products.`);
    if (!p.active) warnings.push(`${p.code} đang ngừng bán.`);
    const quantity = Number(line.quantity);
    if (!(quantity > 0)) errors.push(`Dòng ${index + 1} (${p.code}): số lượng phải lớn hơn 0.`);
    const discount = Number(line.discountPercent ?? 0);
    if (!(discount >= 0 && discount <= 100)) errors.push(`Dòng ${index + 1} (${p.code}): chiết khấu phải từ 0 đến 100%.`);
    const unitPrice = line.unitPrice === undefined || line.unitPrice === null ? p.price : Number(line.unitPrice);
    if (!(unitPrice >= 0)) errors.push(`Dòng ${index + 1} (${p.code}): đơn giá không hợp lệ.`);
    if (unitPrice !== p.price) warnings.push(`${p.code}: đơn giá ${formatCurrency(unitPrice)} khác giá danh mục ${formatCurrency(p.price)}.`);
    if (discount > 0) warnings.push(`${p.code}: chiết khấu ${discount}%.`);
    items.push({
      productId: p.id,
      productCodeSnapshot: p.code,
      productNameSnapshot: p.name,
      descriptionSnapshot: (p.shortDescription || '').slice(0, 300),
      unit: p.unit || 'Bộ',
      quantity,
      unitPrice,
      discount,
      vatRate: p.vatRate ?? 0,
      sortOrder: index,
    });
  });

  const orderDiscount = Math.round(Number(args.orderDiscount) || 0);
  const quotationDate = isDay(args.quotationDate) ? args.quotationDate : vietnamToday();
  const payload = {
    customerId: customer?.id ?? '',
    quotationDate,
    title: 'HÓA ĐƠN BÁN HÀNG',
    note: args.note ? String(args.note).slice(0, 1000) : null,
    status: 'DRAFT',
    orderDiscount,
    discountNote: orderDiscount > 0 && args.discountNote ? String(args.discountNote).slice(0, 255) : null,
    items,
  };

  // Same validation the API runs when the user confirms
  const parsed = QuotationSchema.safeParse(payload);
  if (!parsed.success) errors.push(...parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`));
  if (errors.length || !customer) return { ok: false, errors: [...new Set(errors)] };

  const previousDebt = await getCarriedDebt(prisma, customer.id);
  const { calculatedItems, summary } = calculateQuotationTotals(items, previousDebt, orderDiscount);
  if (orderDiscount > (summary.goodsTotal ?? 0)) {
    return { ok: false, errors: [`Giảm giá (${formatCurrency(orderDiscount)}) lớn hơn tiền hàng (${formatCurrency(summary.goodsTotal)}).`] };
  }
  if (orderDiscount > 0) warnings.push(`Giảm giá cả đơn ${formatCurrency(orderDiscount)}.`);

  const draft: QuotationDraft = {
    draftId: randomUUID(),
    customer,
    payload,
    preview: {
      items: calculatedItems.map((i) => ({
        code: i.productCodeSnapshot ?? null, name: i.productNameSnapshot, unit: i.unit, quantity: i.quantity,
        unitPrice: i.unitPrice, discount: i.discount, vatRate: i.vatRate, total: i.total,
      })),
      summary,
    },
    warnings,
  };
  ctx.drafts.push(draft);

  return {
    ok: true,
    draftId: draft.draftId,
    customer: customer.companyName,
    items: draft.preview.items.map((i) => `${i.quantity} x ${i.name} = ${i.total}`),
    summary,
    warnings,
    note: 'Bản nháp đã hiện cho người dùng kèm nút "Tạo đơn nháp". Chưa có gì được lưu.',
  };
}

const IMPLEMENTATIONS: Record<string, (args: any, ctx: ToolContext) => Promise<unknown>> = {
  search_products: searchProducts,
  search_customers: searchCustomers,
  get_customer_debt: getCustomerDebt,
  list_quotations: listQuotations,
  get_quotation: getQuotation,
  prepare_quotation_draft: prepareQuotationDraft,
};

/** Runs a tool the model asked for. Errors go back to the model as data so it can recover. */
export async function runTool(name: string, rawArgs: string, ctx: ToolContext): Promise<unknown> {
  const impl = IMPLEMENTATIONS[name];
  if (!impl) return { error: `Không có công cụ "${name}".` };
  let args: any;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { error: 'Tham số không phải JSON hợp lệ.' };
  }
  try {
    return await impl(args ?? {}, ctx);
  } catch (err: any) {
    console.error(`[Assistant] tool ${name} failed:`, err);
    return { error: 'Lỗi khi truy vấn dữ liệu.' };
  }
}
