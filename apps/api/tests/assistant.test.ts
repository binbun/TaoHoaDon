/**
 * AI assistant tests. They need no database and no API key:
 *  - Prisma is replaced by a small in-memory fake
 *  - Gemini is replaced by a scripted fake that answers like the OpenAI-compatible API
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { QuotationSchema, calculateQuotationTotals } from '@taohoadon/shared';

// ---------------------------------------------------------------- fake data
const db = vi.hoisted(() => {
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
  return {
    users: [
      { id: 'u-admin', email: 'admin@baogia.vn', name: 'Admin', role: 'ADMIN', tokenVersion: 0 },
      { id: 'u-sale', email: 'sale@baogia.vn', name: 'Sale', role: 'USER', tokenVersion: 0 },
    ],
    customers: [
      { id: 'c-1', companyName: 'Công ty TNHH Minh Phát', contactName: 'Anh Minh', phone: '0901', email: null, taxCode: null, address: 'Hà Nội', openingDebt: 0, createdAt: d('2026-01-01') },
      { id: 'c-2', companyName: 'Nội thất Hòa Bình', contactName: 'Chị Hòa', phone: '0902', email: null, taxCode: null, address: 'HCM', openingDebt: 0, createdAt: d('2026-01-02') },
    ],
    products: [
      { id: 'p-1', code: 'GR-901', oldCode: null, name: 'Tủ bếp GROB 90cm', brand: 'GROB', category: 'Tủ bếp', unit: 'Bộ', price: 2500000, vatRate: 8, active: true, isFavorite: false, shortDescription: 'Inox 304', dimensions: null, cabinetWidth: '90' },
      { id: 'p-2', code: 'GR-602', oldCode: null, name: 'Giá bát GROB 60cm', brand: 'GROB', category: 'Giá bát', unit: 'Bộ', price: 1200000, vatRate: 0, active: true, isFavorite: false, shortDescription: null, dimensions: null, cabinetWidth: '60' },
      { id: 'p-3', code: 'OLD-1', oldCode: null, name: 'Tủ cũ', brand: 'GROB', category: 'Tủ bếp', unit: 'Bộ', price: 100, vatRate: 0, active: false, isFavorite: false, shortDescription: null, dimensions: null, cabinetWidth: null },
    ],
    quotations: [
      { id: 'q-1', quotationNumber: 'DH-2026-0001', customerId: 'c-1', quotationDate: d('2026-11-02'), status: 'SENT', grandTotal: 5000000, previousDebt: 0, orderDiscount: 0, note: null, createdBy: 'u-admin', createdAt: d('2026-11-02') },
      { id: 'q-2', quotationNumber: 'DH-2026-0002', customerId: 'c-2', quotationDate: d('2026-11-05'), status: 'PAID', grandTotal: 3000000, previousDebt: 0, orderDiscount: 0, note: null, createdBy: 'u-sale', createdAt: d('2026-11-05') },
    ],
  };
});

vi.mock('../src/prisma', () => {
  const get = (row: any, path: string) => row[path];
  const lower = (v: unknown) => String(v ?? '').toLowerCase();
  const related = (row: any) => ({
    ...row,
    customer: db.customers.find((c) => c.id === row.customerId),
    creator: db.users.find((u) => u.id === row.createdBy) ?? null,
  });
  // Tiny evaluator for the Prisma "where" shapes the assistant uses
  const matches = (row: any, where: any = {}): boolean =>
    Object.entries(where).every(([key, cond]: [string, any]) => {
      if (key === 'AND') return (cond as any[]).every((c) => matches(row, c));
      if (key === 'OR') return (cond as any[]).some((c) => matches(row, c));
      const value = get(row, key);
      if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
        if ('contains' in cond) return lower(value).includes(lower(cond.contains));
        if ('equals' in cond) return lower(value) === lower(cond.equals);
        if ('in' in cond) return cond.in.includes(value);
        if ('gte' in cond || 'lt' in cond)
          return (!cond.gte || value >= cond.gte) && (!cond.lt || value < cond.lt);
        return matches(value ?? {}, cond); // relation filter, e.g. customer: { companyName: ... }
      }
      return value === cond;
    });
  const table = (rows: () => any[], withRelations = false) => ({
    findMany: async ({ where, take }: any = {}) => {
      const list = rows().map((r) => (withRelations ? related(r) : r)).filter((r) => matches(r, where));
      return take ? list.slice(0, take) : list;
    },
    findUnique: async ({ where }: any) => {
      const row = rows().find((r) => matches(r, where));
      return row ? (withRelations ? { ...related(row), items: [] } : row) : null;
    },
  });
  return {
    prisma: {
      user: table(() => db.users),
      customer: table(() => db.customers),
      product: table(() => db.products),
      quotation: table(() => db.quotations, true),
      payment: table(() => []),
    },
  };
});

// Debt is covered by its own tests; here it only needs fixed numbers
vi.mock('../src/payments/payments.service', () => ({
  getCarriedDebt: vi.fn(async (_db: unknown, customerId: string) => (customerId === 'c-1' ? 1_000_000 : 0)),
  getCustomerDebtMap: vi.fn(async (cs: { id: string }[]) => new Map(cs.map((c) => [c.id, c.id === 'c-1' ? 1_000_000 : 0]))),
  getCustomerDebtDetail: vi.fn(async (id: string) =>
    id === 'c-1'
      ? { customerId: id, openingDebt: 0, openingRemaining: 0, currentDebt: 1_000_000, payments: [],
          orders: [{ id: 'q-1', amount: 5_000_000, paid: 4_000_000, remaining: 1_000_000, quotationNumber: 'DH-2026-0001', quotationDate: new Date('2026-11-02'), status: 'SENT' }] }
      : null
  ),
  lockCustomer: vi.fn(), getOrderPaid: vi.fn(), recordOrderPaid: vi.fn(), syncOrderStatuses: vi.fn(), loadCustomerLedger: vi.fn(),
}));

import { runAssistant } from '../src/assistant/assistant.agent';
import { runTool } from '../src/assistant/assistant.tools';
import app from '../src/server';

// ---------------------------------------------------------------- fake Gemini
type Step = { text?: string; calls?: [string, Record<string, unknown>][] };

/** Returns scripted answers in order and records every request body. */
function fakeGemini(steps: Step[]) {
  const requests: any[] = [];
  const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)));
    const step = steps[Math.min(requests.length - 1, steps.length - 1)];
    const message = {
      role: 'assistant',
      content: step.text ?? null,
      ...(step.calls && {
        tool_calls: step.calls.map(([name, args], i) => ({
          id: `call_${requests.length}_${i}`,
          type: 'function',
          function: { name, arguments: JSON.stringify(args) },
          extra_content: { google: { thought_signature: `sig-${requests.length}` } },
        })),
      }),
    };
    return new Response(JSON.stringify({ choices: [{ index: 0, message, finish_reason: 'stop' }] }), { status: 200 });
  });
  return { fetchImpl, requests };
}

const admin = { id: 'u-admin', role: 'ADMIN', name: 'Admin', email: 'admin@baogia.vn' };
const sale = { id: 'u-sale', role: 'USER', name: 'Sale', email: 'sale@baogia.vn' };
const lastToolResult = (body: any) => JSON.parse(body.messages[body.messages.length - 1].content);

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-key';
});
afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  vi.unstubAllGlobals();
});

describe('Assistant agent loop', () => {
  it('finds customer and products, fixes a bad draft, and returns a correct draft', async () => {
    const { fetchImpl, requests } = fakeGemini([
      { calls: [['search_customers', { query: 'minh phát' }], ['search_products', { query: 'tủ bếp 90' }]] },
      { calls: [['prepare_quotation_draft', { customerId: 'c-1', items: [{ productId: 'nope', quantity: 2 }] }]] },
      { calls: [['prepare_quotation_draft', { customerId: 'c-1', items: [{ productId: 'p-1', quantity: 2 }, { productId: 'p-2', quantity: 1, discountPercent: 10 }], orderDiscount: 200000, discountNote: 'Khách quen' }]] },
      { text: 'Đã chuẩn bị bản nháp, vui lòng kiểm tra và bấm "Tạo đơn nháp".' },
    ]);

    const result = await runAssistant({
      history: [{ role: 'user', content: 'Tạo đơn cho Minh Phát: 2 tủ bếp 90 và 1 giá bát 60 chiết khấu 10%, giảm 200k' }],
      user: admin,
      fetchImpl,
    });

    expect(result.reply).toContain('Tạo đơn nháp');
    expect(result.toolsUsed).toEqual(['search_customers', 'search_products', 'prepare_quotation_draft', 'prepare_quotation_draft']);

    // Request 2 carries the search results back to the model
    const searchResults = requests[1].messages.filter((m: any) => m.role === 'tool').map((m: any) => JSON.parse(m.content));
    expect(searchResults[0].customers.map((c: any) => c.companyName)).toEqual(['Công ty TNHH Minh Phát']);
    expect(searchResults[0].customers[0].currentDebt).toBe(1_000_000);
    expect(searchResults[1].products.map((p: any) => p.code)).toEqual(['GR-901']); // multi-word, case-insensitive

    // Provider extras (Gemini thought signatures) are sent back unchanged
    expect(requests[1].messages[2].tool_calls[0].extra_content.google.thought_signature).toBe('sig-1');
    expect(requests[1].messages[3].tool_call_id).toBe('call_1_0');

    // Reflection: the bad product id came back as an error for the model to fix
    expect(lastToolResult(requests[2])).toMatchObject({ ok: false });
    expect(lastToolResult(requests[2]).errors[0]).toContain('không tìm thấy sản phẩm');

    // The draft uses catalog data and the shared calculation, never numbers from the model
    expect(result.drafts).toHaveLength(1);
    const draft = result.drafts[0];
    expect(QuotationSchema.parse(draft.payload).status).toBe('DRAFT');
    expect(draft.payload).toMatchObject({ customerId: 'c-1', orderDiscount: 200000, discountNote: 'Khách quen' });
    const expected = calculateQuotationTotals((draft.payload as any).items, 1_000_000, 200000).summary;
    expect(draft.preview.summary).toEqual(expected);
    // 2 x 2.500.000 + 8% VAT = 5.400.000; 1.200.000 - 10% = 1.080.000; -200.000; +1.000.000 old debt
    expect(draft.preview.summary.grandTotal).toBe(5_400_000 + 1_080_000 - 200_000 + 1_000_000);
    expect(draft.preview.items[0]).toMatchObject({ code: 'GR-901', name: 'Tủ bếp GROB 90cm', unit: 'Bộ', unitPrice: 2500000, vatRate: 8 });
    expect(draft.warnings.join(' ')).toContain('chiết khấu 10%');
  });

  it('stops after maxSteps and asks for a final answer without tools', async () => {
    const { fetchImpl, requests } = fakeGemini([
      { calls: [['search_products', { query: 'tủ' }]] },
      { calls: [['search_products', { query: 'tủ' }]] },
      { text: 'Đây là kết quả tốt nhất.' },
    ]);
    const result = await runAssistant({ history: [{ role: 'user', content: 'tìm tủ' }], user: admin, fetchImpl, maxSteps: 2 });
    expect(result.reply).toBe('Đây là kết quả tốt nhất.');
    expect(requests).toHaveLength(3);
    expect(requests[2].tools).toBeUndefined();
  });
});

describe('Assistant tools', () => {
  const ctx = (user = admin) => ({ user, drafts: [] as any[] });

  it('USER role only sees their own orders', async () => {
    const own: any = await runTool('list_quotations', '{}', ctx(sale));
    expect(own.quotations.map((q: any) => q.quotationNumber)).toEqual(['DH-2026-0002']);
    const other: any = await runTool('get_quotation', JSON.stringify({ quotationNumber: 'dh-2026-0001' }), ctx(sale));
    expect(other.error).toContain('không có quyền');
    const adminView: any = await runTool('get_quotation', JSON.stringify({ quotationNumber: 'dh-2026-0001' }), ctx());
    expect(adminView).toMatchObject({ quotationNumber: 'DH-2026-0001', paid: 4_000_000, remaining: 1_000_000 });
  });

  it('list_quotations totals the whole date range and status filter', async () => {
    const res: any = await runTool('list_quotations', JSON.stringify({ fromDate: '2026-11-01', toDate: '2026-11-30', limit: 1 }), ctx());
    expect(res.totalMatching).toBe(2);
    expect(res.totalOrderAmount).toBe(8_000_000);
    expect(res.quotations).toHaveLength(1);
    const paid: any = await runTool('list_quotations', JSON.stringify({ status: 'PAID' }), ctx());
    expect(paid.quotations.map((q: any) => q.status)).toEqual(['Đã thanh toán']);
  });

  it('rejects a discount larger than the goods total and bad input', async () => {
    const tooMuch: any = await runTool('prepare_quotation_draft', JSON.stringify({ customerId: 'c-2', items: [{ productId: 'p-2', quantity: 1 }], orderDiscount: 5_000_000 }), ctx());
    expect(tooMuch.ok).toBe(false);
    expect(tooMuch.errors[0]).toContain('lớn hơn tiền hàng');
    const badQty: any = await runTool('prepare_quotation_draft', JSON.stringify({ customerId: 'c-2', items: [{ productId: 'p-2', quantity: 0 }] }), ctx());
    expect(badQty.errors.join(' ')).toContain('số lượng');
    const noCustomer: any = await runTool('prepare_quotation_draft', JSON.stringify({ customerId: 'x', items: [{ productId: 'p-2', quantity: 1 }] }), ctx());
    expect(noCustomer.errors.join(' ')).toContain('khách hàng');
    expect(await runTool('search_products', 'not json', ctx())).toEqual({ error: 'Tham số không phải JSON hợp lệ.' });
    expect(await runTool('delete_everything', '{}', ctx())).toEqual({ error: 'Không có công cụ "delete_everything".' });
  });

  it('never offers inactive products', async () => {
    const res: any = await runTool('search_products', JSON.stringify({ query: 'tủ' }), ctx());
    expect(res.products.map((p: any) => p.code)).not.toContain('OLD-1');
  });
});

describe('Assistant API routes', () => {
  const token = jwt.sign({ id: 'u-admin', email: 'admin@baogia.vn', tokenVersion: 0 }, process.env.JWT_SECRET || 'super-secret-quotation-jwt-token-key-2026');
  const auth = { Authorization: `Bearer ${token}` };

  it('requires login', async () => {
    const res = await request(app).post('/api/assistant/chat').send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });

  it('reports when no AI key is configured', async () => {
    delete process.env.GEMINI_API_KEY;
    const status = await request(app).get('/api/assistant/status').set(auth);
    expect(status.body.data.enabled).toBe(false);
    const res = await request(app).post('/api/assistant/chat').set(auth).send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(503);
  });

  it('answers a chat and returns drafts', async () => {
    const { fetchImpl, requests } = fakeGemini([
      { calls: [['prepare_quotation_draft', { customerId: 'c-2', items: [{ productId: 'p-2', quantity: 3 }] }]] },
      { text: 'Bản nháp đã sẵn sàng.' },
    ]);
    vi.stubGlobal('fetch', fetchImpl);
    const res = await request(app)
      .post('/api/assistant/chat')
      .set(auth)
      .send({ messages: [{ role: 'user', content: 'Tạo đơn 3 giá bát cho Hòa Bình' }] });
    expect(res.status).toBe(200);
    expect(res.body.data.reply).toBe('Bản nháp đã sẵn sàng.');
    expect(res.body.data.drafts[0].preview.summary.grandTotal).toBe(3_600_000);
    expect(requests[0].model).toBe('gemini-3.8-flash');
    expect(requests[0].reasoning_effort).toBe('low'); // Gemini 3 thinks at "high" by default, which is slow
    expect(requests[0].messages[0].content).toContain('Admin');
    expect(fetchImpl.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    expect((fetchImpl.mock.calls[0][1] as any).headers.Authorization).toBe('Bearer test-key');
  });

  it('sends no reasoning_effort to other providers unless asked', async () => {
    process.env.AI_BASE_URL = 'https://api.openai.com/v1';
    const { fetchImpl, requests } = fakeGemini([{ text: 'ok' }]);
    vi.stubGlobal('fetch', fetchImpl);
    await request(app).post('/api/assistant/chat').set(auth).send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(requests[0].reasoning_effort).toBeUndefined();
    process.env.AI_REASONING_EFFORT = 'medium';
    await request(app).post('/api/assistant/chat').set(auth).send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(requests[1].reasoning_effort).toBe('medium');
    delete process.env.AI_BASE_URL;
    delete process.env.AI_REASONING_EFFORT;
  });

  it('reports a timeout clearly', async () => {
    process.env.AI_TIMEOUT_MS = '50';
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })));
    const res = await request(app).post('/api/assistant/chat').set(auth).send({ messages: [{ role: 'user', content: 'hi' }] });
    delete process.env.AI_TIMEOUT_MS;
    expect(res.status).toBe(502);
    expect(res.body.message).toContain('quá lâu');
  });

  it('turns provider errors into a friendly 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"quota"}', { status: 429 })));
    const res = await request(app).post('/api/assistant/chat').set(auth).send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(502);
    expect(res.body.message).toContain('giới hạn');
  });

  it('validates the message list', async () => {
    const res = await request(app).post('/api/assistant/chat').set(auth).send({ messages: [{ role: 'assistant', content: 'hi' }] });
    expect(res.status).toBe(400);
  });
});
