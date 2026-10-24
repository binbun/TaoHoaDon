import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server';

let adminToken = '';
let userToken = '';

const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });
const asUser = () => ({ Authorization: `Bearer ${userToken}` });

const item = (unitPrice: number) => ({
  productNameSnapshot: 'Phụ kiện test',
  unit: 'Bộ',
  quantity: 1,
  unitPrice,
  discount: 0,
  vatRate: 0,
  sortOrder: 0,
});

const newCustomer = async (openingDebt = 0) =>
  (
    await request(app)
      .post('/api/customers')
      .set(asAdmin())
      .send({ companyName: `Khách quy trình nợ ${Date.now()} ${Math.random()}`, openingDebt })
  ).body.data.id as string;

const createOrder = (customerId: string, unitPrice: number, quotationDate = '2026-10-20', status = 'SENT') =>
  request(app)
    .post('/api/quotations')
    .set(asAdmin())
    .send({ customerId, quotationDate, title: 'HÓA ĐƠN BÁN HÀNG', status, items: [item(unitPrice)] });

const editOrder = (id: string, body: Record<string, unknown>) =>
  request(app)
    .patch(`/api/quotations/${id}`)
    .set(asAdmin())
    .send({ quotationDate: '2026-10-20', title: 'HÓA ĐƠN BÁN HÀNG', ...body });

const pay = (customerId: string, amount: number, quotationId?: string, paidAt = '2026-10-21', headers = asAdmin()) =>
  request(app).post(`/api/customers/${customerId}/payments`).set(headers).send({ amount, paidAt, quotationId });

const deleteBatch = (customerId: string, batchId: string, headers = asAdmin()) =>
  request(app).delete(`/api/customers/${customerId}/payments/${batchId}`).set(headers);

const debtOf = async (customerId: string) =>
  (await request(app).get(`/api/customers/${customerId}/debt`).set(asAdmin())).body.data;

const getOrder = async (id: string) => (await request(app).get(`/api/quotations/${id}`).set(asAdmin())).body.data;

// Lunar month 9/2026 = 10/10/2026 → 08/11/2026
const reportRow = async (id: string, fromDate = '2026-10-10', toDate = '2026-11-08') =>
  (await request(app).get(`/api/reports/debt?fromDate=${fromDate}&toDate=${toDate}`).set(asAdmin())).body.data.orders.find(
    (o: any) => o.id === id
  );

beforeAll(async () => {
  adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@baogia.vn', password: '123456' })).body.data
    .token;

  const email = `test_debt_staff_${Date.now()}@euplus.vn`;
  await request(app)
    .post('/api/users')
    .set(asAdmin())
    .send({ name: 'Nhân viên test công nợ', email, password: 'password123', role: 'USER' });
  userToken = (await request(app).post('/api/auth/login').send({ email, password: 'password123' })).body.data.token;
});

describe('Debt workflow rules', () => {
  it('cannot move an order to another customer', async () => {
    const a = await newCustomer();
    const b = await newCustomer();
    const order = (await createOrder(a, 10000000)).body.data;
    await pay(a, 4000000, order.id);

    const res = await editOrder(order.id, { customerId: b, items: [item(10000000)] });
    expect(res.status).toBe(400);
    expect((await debtOf(a)).currentDebt).toBe(6000000);
    expect((await debtOf(b)).currentDebt).toBe(0);
  });

  it('rejects a payment larger than the debt', async () => {
    const c = await newCustomer();
    const order = (await createOrder(c, 1000000)).body.data;

    const over = await pay(c, 1500000, order.id);
    expect(over.status).toBe(400);
    expect(over.body.message).toContain('1.000.000');

    expect((await pay(c, 1000000)).status).toBe(201);
    expect((await pay(c, 1)).status).toBe(400);
    expect((await debtOf(c)).currentDebt).toBe(0);
  });

  it('lets only one of two simultaneous full payments through', async () => {
    const c = await newCustomer();
    await createOrder(c, 2000000);

    const results = await Promise.all([pay(c, 2000000), pay(c, 2000000)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    expect((await debtOf(c)).currentDebt).toBe(0);
  });

  it('reopens a paid order when its amount goes up, owing only the difference', async () => {
    const c = await newCustomer();
    const order = (await createOrder(c, 5000000)).body.data;
    await pay(c, 5000000, order.id);
    expect((await getOrder(order.id)).status).toBe('PAID');

    // The builder re-sends the status it loaded
    const res = await editOrder(order.id, { customerId: c, status: 'PAID', items: [item(8000000)] });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SENT');
    expect((await getOrder(order.id)).remainingAmount).toBe(3000000);
    expect((await debtOf(c)).currentDebt).toBe(3000000);
  });

  it('does not let an order drop below what was paid on it', async () => {
    const c = await newCustomer();
    const order = (await createOrder(c, 5000000)).body.data;
    await pay(c, 3000000, order.id);

    const res = await editOrder(order.id, { customerId: c, items: [item(2000000)] });
    expect(res.status).toBe(400);
    expect((await debtOf(c)).currentDebt).toBe(2000000);
  });

  it('records a payment when an order is marked paid by hand, so deleting another payment reopens only that amount', async () => {
    const c = await newCustomer();
    const order = (await createOrder(c, 10000000)).body.data;
    await pay(c, 3000000, order.id);

    const marked = await editOrder(order.id, { customerId: c, status: 'PAID', items: [item(10000000)] });
    expect(marked.body.data.status).toBe('PAID');
    const detail = await getOrder(order.id);
    expect(detail.paidAmount).toBe(10000000);
    expect(detail.payments.map((p: any) => p.amount).sort((x: number, y: number) => x - y)).toEqual([3000000, 7000000]);
    expect((await debtOf(c)).currentDebt).toBe(0);

    const partial = detail.payments.find((p: any) => p.amount === 3000000);
    expect((await deleteBatch(c, partial.batchId)).status).toBe(200);
    expect((await getOrder(order.id)).status).toBe('SENT');
    expect((await debtOf(c)).currentDebt).toBe(3000000);
  });

  it('creating an order as paid records its goods as paid and keeps the old debt owed', async () => {
    const c = await newCustomer(4000000);
    const order = (await createOrder(c, 2000000, '2026-10-20', 'PAID')).body.data;
    expect(order.grandTotal).toBe(6000000);
    expect((await debtOf(c)).currentDebt).toBe(4000000);
    expect(await reportRow(order.id)).toMatchObject({ paid: 2000000, remaining: 4000000 });
  });

  it('will not mark a fully paid order unpaid through its status', async () => {
    const c = await newCustomer();
    const order = (await createOrder(c, 1000000)).body.data;
    await pay(c, 1000000, order.id);

    const res = await editOrder(order.id, { customerId: c, status: 'SENT', items: [item(1000000)] });
    expect(res.status).toBe(400);
    expect((await getOrder(order.id)).status).toBe('PAID');
  });

  it('keeps the saved status when an edit does not send one', async () => {
    const c = await newCustomer();
    const order = (await createOrder(c, 1000000)).body.data;

    const res = await editOrder(order.id, { customerId: c, items: [item(1200000)] });
    expect(res.body.data.status).toBe('SENT');
  });

  it('an edit that leaves the status alone does not re-mark an order whose payment was removed meanwhile', async () => {
    const c = await newCustomer();
    const order = (await createOrder(c, 5000000)).body.data;
    await pay(c, 5000000, order.id);

    // Someone deletes the payment while the order is open in the builder (loaded as "Đã thanh toán")
    await deleteBatch(c, (await debtOf(c)).payments[0].batchId);
    const res = await editOrder(order.id, { customerId: c, items: [item(5000000)] });
    expect(res.body.data.status).toBe('SENT');
    expect((await debtOf(c)).currentDebt).toBe(5000000);
  });

  it('cannot delete an order that has payments', async () => {
    const c = await newCustomer();
    const order = (await createOrder(c, 1000000)).body.data;
    await pay(c, 400000, order.id);

    expect((await request(app).delete(`/api/quotations/${order.id}`).set(asAdmin())).status).toBe(400);
    expect((await debtOf(c)).currentDebt).toBe(600000);

    await deleteBatch(c, (await getOrder(order.id)).payments[0].batchId);
    expect((await request(app).delete(`/api/quotations/${order.id}`).set(asAdmin())).status).toBe(200);
    expect((await debtOf(c)).currentDebt).toBe(0);
  });

  it('cannot lower "Nợ đầu kỳ" below what was already paid toward it, and logs the change', async () => {
    const c = await newCustomer(5000000);
    await pay(c, 3000000);

    expect((await request(app).patch(`/api/customers/${c}`).set(asAdmin()).send({ openingDebt: 2000000 })).status).toBe(400);
    expect((await request(app).patch(`/api/customers/${c}`).set(asAdmin()).send({ openingDebt: 3000000 })).status).toBe(200);
    expect((await debtOf(c)).currentDebt).toBe(0);

    const logs = await request(app).get(`/api/audit-logs?action=UPDATE_OPENING_DEBT&search=${c}`).set(asAdmin());
    expect(logs.body.data).toHaveLength(2); // set on creation, then changed
  });

  it('shows every payment recorded on an invoice in its history, even one that paid old debt', async () => {
    const c = await newCustomer(4000000);
    const order = (await createOrder(c, 2000000)).body.data;
    await pay(c, 2000000, order.id);
    await pay(c, 4000000, order.id);

    const payments = (await getOrder(order.id)).payments;
    expect(payments.reduce((sum: number, p: any) => sum + p.amount, 0)).toBe(6000000);
  });

  it('report counts a payment from the customer screen on the latest invoice made before it', async () => {
    const c = await newCustomer();
    const first = (await createOrder(c, 10000000, '2026-10-12')).body.data;
    await pay(c, 4000000, undefined, '2026-10-13');
    expect(await reportRow(first.id)).toMatchObject({ paid: 4000000, remaining: 6000000 });

    // Paid in the morning, invoiced in the afternoon: the invoice's "Dư nợ cũ" already has it taken off
    const d = await newCustomer(5000000);
    await pay(d, 5000000, undefined, '2026-10-20');
    const second = (await createOrder(d, 2000000, '2026-10-20')).body.data;
    expect(await reportRow(second.id)).toMatchObject({ previousDebt: 0, paid: 0, remaining: 2000000 });
  });

  it('report shows "Đã TT" / "Còn lại" as of the last day of the period', async () => {
    const c = await newCustomer();
    const order = (await createOrder(c, 6000000, '2026-10-20')).body.data;
    await pay(c, 6000000, order.id, '2026-11-20'); // next lunar month

    expect(await reportRow(order.id)).toMatchObject({ paid: 0, remaining: 6000000 });
    expect(await reportRow(order.id, '2026-10-10', '2026-12-07')).toMatchObject({ paid: 6000000, remaining: 0 });
  });

  it('staff can record payments but not delete them, change "Nợ đầu kỳ" or export the report', async () => {
    const c = await newCustomer(1000000);
    expect((await pay(c, 400000, undefined, '2026-10-21', asUser())).status).toBe(201);

    const batchId = (await debtOf(c)).payments[0].batchId;
    expect((await deleteBatch(c, batchId, asUser())).status).toBe(403);
    expect((await request(app).patch(`/api/customers/${c}`).set(asUser()).send({ openingDebt: 2000000 })).status).toBe(403);
    expect(
      (await request(app).patch(`/api/customers/${c}`).set(asUser()).send({ phone: '0900000000', openingDebt: 1000000 })).status
    ).toBe(200);
    expect(
      (await request(app).post('/api/customers').set(asUser()).send({ companyName: `Khách NV ${Date.now()}`, openingDebt: 500000 }))
        .status
    ).toBe(403);
    expect((await request(app).get('/api/reports/debt?fromDate=2026-10-10&toDate=2026-11-08').set(asUser())).status).toBe(403);
  });

  it('rejects malformed dates', async () => {
    const c = await newCustomer(1000000);
    expect((await pay(c, 100000, undefined, '21/10/2026')).status).toBe(400);
    expect((await createOrder(c, 100000, '2026-10-20T17:30:00.000Z')).status).toBe(400);
  });

  it('order discount ("Giảm giá") lowers what the customer owes and prints on the invoice', async () => {
    const c = await newCustomer(1000000);
    const tooMuch = await request(app)
      .post('/api/quotations')
      .set(asAdmin())
      .send({ customerId: c, quotationDate: '2026-10-20', title: 'HÓA ĐƠN BÁN HÀNG', status: 'SENT', orderDiscount: 6000000, items: [item(5000000)] });
    expect(tooMuch.status).toBe(400);

    const order = (
      await request(app)
        .post('/api/quotations')
        .set(asAdmin())
        .send({ customerId: c, quotationDate: '2026-10-20', title: 'HÓA ĐƠN BÁN HÀNG', status: 'SENT', orderDiscount: 500000, discountNote: 'Khách quen', items: [item(5000000)] })
    ).body.data;
    expect(order).toMatchObject({ orderDiscount: 500000, discountNote: 'Khách quen', previousDebt: 1000000, grandTotal: 5500000 });
    expect((await debtOf(c)).currentDebt).toBe(5500000);
    expect(await reportRow(order.id)).toMatchObject({ orderAmount: 4500000, grandTotal: 5500000 });

    // Paid 4,500,000: a bigger discount would leave money paid beyond the order
    await pay(c, 4500000, order.id);
    const blocked = await editOrder(order.id, { customerId: c, orderDiscount: 1000000, items: [item(5000000)] });
    expect(blocked.status).toBe(400);
  });
});
