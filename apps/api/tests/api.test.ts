import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server';

let authToken = '';
let createdProductId = '';
let createdCustomerId = '';
let createdQuotationId = '';

describe('API Integration Endpoints', () => {
  it('POST /api/auth/login should authenticate with seed credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@baogia.vn', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    authToken = res.body.data.token;
  });

  it('GET /api/products should return seed products list', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/products should create a new product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `TEST-PROD-${Date.now()}`,
        name: 'Gói Banner Quảng Cáo Trang Chủ',
        shortDescription: 'Hiển thị banner nổi bật tại trang chủ trong 1 tháng.',
        unit: 'Tháng',
        price: 5000000,
        vatRate: 8,
        active: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Gói Banner Quảng Cáo Trang Chủ');
    createdProductId = res.body.data.id;
  });

  it('POST /api/customers should create a new customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyName: 'Công ty TNHH Giải Pháp Phần Mềm Mới',
        contactName: 'Lê Văn C',
        email: 'levanc@software.com',
        phone: '0987654321',
        address: 'Quận Cầu Giấy, Hà Nội',
        taxCode: '0109998888',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdCustomerId = res.body.data.id;
  });

  it('POST /api/quotations should create a quotation and calculate totals strictly', async () => {
    const res = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: createdCustomerId,
        quotationDate: '2026-03-28',
        validUntil: '2026-04-28',
        title: 'ĐƠN HÀNG QUẢNG CÁO TRỰC TUYẾN 2026',
        items: [
          {
            productId: createdProductId,
            productNameSnapshot: 'Gói Banner Quảng Cáo Trang Chủ',
            unit: 'Tháng',
            quantity: 2,
            unitPrice: 5000000,
            discount: 10,
            vatRate: 10,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const q = res.body.data;
    createdQuotationId = q.id;

    // Verify sequential auto-generation
    expect(q.quotationNumber).toMatch(/^DH-\d{4}-\d{4}$/);
    expect(q.vatTotal).toBe(720000);
    expect(q.grandTotal).toBe(9720000);
    expect(q.quotationNumber).toMatch(/^DH-\d{4}-\d{4}$/);
    createdQuotationId = q.id;
  });

  it('POST /api/quotations/:id/duplicate should duplicate quotation with new number and draft status', async () => {
    const res = await request(app)
      .post(`/api/quotations/${createdQuotationId}/duplicate`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.grandTotal).toBe(9720000);
    expect(res.body.data.quotationNumber).not.toBe(createdQuotationId);
  });

  it('GET /api/dashboard/stats should return aggregated KPIs', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalQuotations).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalGrandTotal).toBeGreaterThan(0);
  });
});
