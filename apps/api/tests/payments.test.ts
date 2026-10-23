import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/server';

let authToken = '';
let customerId = '';
let firstOrderId = '';
let secondOrderId = '';

const auth = () => ({ Authorization: `Bearer ${authToken}` });

const createOrder = (previousDebt: number, quotationDate: string) =>
  request(app)
    .post('/api/quotations')
    .set(auth())
    .send({
      customerId,
      quotationDate,
      title: 'HÓA ĐƠN BÁN HÀNG',
      status: 'SENT',
      previousDebt,
      items: [{ productNameSnapshot: 'Phụ kiện test', unit: 'Bộ', quantity: 1, unitPrice: 5000000, discount: 0, vatRate: 0, sortOrder: 0 }],
    });

describe('Customer debt & payments', () => {
  it('logs in and creates a customer with opening debt', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@baogia.vn', password: '123456' });
    authToken = login.body.data.token;

    const res = await request(app)
      .post('/api/customers')
      .set(auth())
      .send({ companyName: `Khách test công nợ ${Date.now()}`, openingDebt: 1000000 });
    expect(res.status).toBe(201);
    expect(res.body.data.openingDebt).toBe(1000000);
    customerId = res.body.data.id;
  });

  it('keeps the unpaid part of an order as debt after a partial payment', async () => {
    const order = await createOrder(1000000, '2026-01-10');
    expect(order.status).toBe(201);
    firstOrderId = order.body.data.id;

    const pay = await request(app)
      .post(`/api/customers/${customerId}/payments`)
      .set(auth())
      .send({ amount: 2000000, paidAt: '2026-01-11', quotationId: firstOrderId });
    expect(pay.status).toBe(201);
    // opening 1,000,000 + order 5,000,000 − paid 2,000,000
    expect(pay.body.data.currentDebt).toBe(4000000);

    const quote = await request(app).get(`/api/quotations/${firstOrderId}`).set(auth());
    expect(quote.body.data).toMatchObject({ orderAmount: 5000000, paidAmount: 2000000, remainingAmount: 3000000, status: 'SENT' });
  });

  it('shows current debt in the customer list and does not double count carried debt', async () => {
    const order = await createOrder(4000000, '2026-02-10');
    secondOrderId = order.body.data.id;
    expect(order.body.data.grandTotal).toBe(9000000);

    const list = await request(app).get('/api/customers').set(auth());
    const customer = list.body.data.find((c: any) => c.id === customerId);
    expect(customer.currentDebt).toBe(9000000);
  });

  it('splits a lump-sum payment oldest-first and marks fully paid orders PAID', async () => {
    const pay = await request(app)
      .post(`/api/customers/${customerId}/payments`)
      .set(auth())
      .send({ amount: 5000000, paidAt: '2026-03-01', note: 'Trả gộp' });
    expect(pay.status).toBe(201);
    expect(pay.body.data.currentDebt).toBe(4000000);
    expect(pay.body.data.openingRemaining).toBe(0);

    const first = await request(app).get(`/api/quotations/${firstOrderId}`).set(auth());
    expect(first.body.data.status).toBe('PAID');
    expect(first.body.data.remainingAmount).toBe(0);

    const second = await request(app).get(`/api/quotations/${secondOrderId}`).set(auth());
    expect(second.body.data.paidAmount).toBe(1000000);
  });

  it('deleting a payment restores the debt and reopens the order', async () => {
    const debt = await request(app).get(`/api/customers/${customerId}/debt`).set(auth());
    const lumpSum = debt.body.data.payments.find((p: any) => p.note === 'Trả gộp');

    const res = await request(app).delete(`/api/customers/${customerId}/payments/${lumpSum.batchId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.currentDebt).toBe(9000000);

    const first = await request(app).get(`/api/quotations/${firstOrderId}`).set(auth());
    expect(first.body.data.status).toBe('SENT');
  });

  it('pre-fill value for the next order = typed old debt + previous draft bill', async () => {
    const cust = await request(app)
      .post('/api/customers')
      .set(auth())
      .send({ companyName: `Khách test nợ nháp ${Date.now()}` });
    const id = cust.body.data.id;

    const first = await request(app)
      .post('/api/quotations')
      .set(auth())
      .send({
        customerId: id,
        quotationDate: '2026-10-23',
        title: 'HÓA ĐƠN BÁN HÀNG',
        previousDebt: 1000000,
        items: [{ productNameSnapshot: 'Phụ kiện test', unit: 'Bộ', quantity: 1, unitPrice: 3000000, discount: 0, vatRate: 0, sortOrder: 0 }],
      });
    expect(first.body.data.status).toBe('DRAFT');

    const list = await request(app).get('/api/customers').set(auth());
    expect(list.body.data.find((c: any) => c.id === id).currentDebt).toBe(4000000);
  });
});

