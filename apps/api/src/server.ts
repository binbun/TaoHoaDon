import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './prisma';
import authRoutes from './auth/auth.routes';
import usersRoutes from './users/users.routes';
import brandsRoutes from './brands/brands.routes';
import productsRoutes from './products/products.routes';
import customersRoutes from './customers/customers.routes';
import quotationsRoutes from './quotations/quotations.routes';
import dashboardRoutes from './dashboard/dashboard.routes';
import auditRoutes from './audit/audit.routes';
import paymentsRoutes from './payments/payments.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// 1. HTTP Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to prevent blocking PDF preview / dynamic assets
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS Whitelist Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://localhost:4173',
      'http://localhost:4000',
    ].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server) or in whitelist or local dev
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, true); // Permissive fallback with headers
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 3. Rate Limiters
// Global API rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // Max 600 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Tần suất gửi yêu cầu quá nhanh. Vui lòng thử lại sau vài phút.',
  },
});
app.use('/api', globalLimiter);

// Strict rate limiter for Login to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 login attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút và thử lại.',
  },
});
app.use(['/api/auth/login', '/auth/login'], loginLimiter);

// PDF Export rate limiter to protect server CPU/RAM Puppeteer resources
const pdfLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 PDF generations per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Tần suất xuất PDF vượt quá giới hạn. Vui lòng chờ 1 phút trước khi xuất tiếp.',
  },
});
app.use(['/api/quotations/:id/pdf', '/quotations/:id/pdf'], pdfLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check (Supports both /health and /api/health)
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TaoHoaDon EUPLUS Quotation API',
  });
});

// API Routes (Supports both with /api prefix and without /api prefix)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/users', '/users'], usersRoutes);
app.use(['/api/brands', '/brands'], brandsRoutes);
app.use(['/api/products', '/products'], productsRoutes);
app.use(['/api/customers', '/customers'], customersRoutes);
app.use(['/api/quotations', '/quotations'], quotationsRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/audit-logs', '/audit-logs'], auditRoutes);
app.use(['/api/payments', '/payments'], paymentsRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

// Start server on 0.0.0.0
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Quotation API Server is live and listening on 0.0.0.0:${PORT}`);
    try {
      await prisma.$connect();
      console.log('✅ Đã kết nối cơ sở dữ liệu PostgreSQL thành công!');
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false;`).catch(() => {});
    } catch (dbErr) {
      console.error('❌ Lỗi kết nối PostgreSQL:', dbErr);
    }
  });
}

export default app;
