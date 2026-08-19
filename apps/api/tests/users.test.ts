import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server';

let superAdminToken = '';
let adminToken = '';
let userToken = '';
let createdAdminId = '';
let createdUserId = '';

describe('User Management & RBAC Integration Tests', () => {
  beforeAll(async () => {
    // 1. Login as Super Admin
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@baogia.vn', password: '123456' });
    expect(res.status).toBe(200);
    superAdminToken = res.body.data.token;
  });

  it('SUPER_ADMIN can create an ADMIN account', async () => {
    const email = `test_admin_${Date.now()}@euplus.vn`;
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Quản Trị Viên Test',
        email,
        password: 'password123',
        role: 'ADMIN',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('ADMIN');
    createdAdminId = res.body.data.id;

    // Login as the new ADMIN
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data.token;
  });

  it('ADMIN can create a USER account', async () => {
    const email = `test_staff_${Date.now()}@euplus.vn`;
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nhân Viên Kinh Doanh Test',
        email,
        password: 'password123',
        role: 'USER',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('USER');
    createdUserId = res.body.data.id;

    // Login as the new USER
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    expect(loginRes.status).toBe(200);
    userToken = loginRes.body.data.token;
  });

  it('ADMIN CANNOT create another ADMIN account (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Giả Mạo',
        email: `fake_admin_${Date.now()}@euplus.vn`,
        password: 'password123',
        role: 'ADMIN',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('USER CANNOT access /api/users (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('SUPER_ADMIN can reset password for any user', async () => {
    const res = await request(app)
      .post(`/api/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ newPassword: 'newpassword456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('ADMIN CANNOT delete SUPER_ADMIN (403 Forbidden)', async () => {
    // Get super admin id
    const superAdminRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${superAdminToken}`);
    const superAdminUser = superAdminRes.body.data.find((u: any) => u.role === 'SUPER_ADMIN');

    if (superAdminUser) {
      const res = await request(app)
        .delete(`/api/users/${superAdminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    }
  });

  it('ADMIN can delete USER', async () => {
    const res = await request(app)
      .delete(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
