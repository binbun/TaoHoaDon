import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/server';

const HIDDEN_FIELDS = ['price', 'retailPrice', 'discountRate', 'vatRate', 'isFavorite', 'oldCode', 'active'];

describe('Public Catalog Endpoints', () => {
  it('GET /api/public/products works without auth and never exposes prices', async () => {
    const res = await request(app).get('/api/public/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const product of res.body.data) {
      for (const field of HIDDEN_FIELDS) {
        expect(product).not.toHaveProperty(field);
      }
    }
  });

  it('GET /api/public/products/:id never exposes prices', async () => {
    const list = await request(app).get('/api/public/products?limit=1');
    const id = list.body.data[0].id;

    const res = await request(app).get(`/api/public/products/${id}`);

    expect(res.status).toBe(200);
    for (const field of HIDDEN_FIELDS) {
      expect(res.body.data).not.toHaveProperty(field);
    }
  });

  it('GET /api/public/products/:id returns 404 for unknown product', async () => {
    const res = await request(app).get('/api/public/products/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('GET /api/public/brands and /categories work without auth', async () => {
    const [brands, categories] = await Promise.all([
      request(app).get('/api/public/brands'),
      request(app).get('/api/public/categories'),
    ]);

    expect(brands.status).toBe(200);
    expect(categories.status).toBe(200);
    expect(Array.isArray(brands.body.data)).toBe(true);
    expect(Array.isArray(categories.body.data)).toBe(true);
  });

  it('admin product routes still require auth', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });
});
