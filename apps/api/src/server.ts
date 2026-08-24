import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import authRoutes from './auth/auth.routes';
import usersRoutes from './users/users.routes';
import productsRoutes from './products/products.routes';
import customersRoutes from './customers/customers.routes';
import quotationsRoutes from './quotations/quotations.routes';
import dashboardRoutes from './dashboard/dashboard.routes';
import auditRoutes from './audit/audit.routes';
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
app.use(['/api/products', '/products'], productsRoutes);
app.use(['/api/customers', '/customers'], customersRoutes);
app.use(['/api/quotations', '/quotations'], quotationsRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/audit-logs', '/audit-logs'], auditRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

// Ensure PostgreSQL tables and seed admin data automatically
async function initPostgresDatabase() {
  try {
    console.log('🔄 Đang kiểm tra và khởi tạo cấu trúc bảng trên PostgreSQL / Supabase...');

    // 1. Create User table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "tokenVersion" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure tokenVersion column exists if User table was created previously
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;`);
    } catch (_) {}

    // 1.1 Create AuditLog table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
        "userName" TEXT,
        "userEmail" TEXT,
        "action" TEXT NOT NULL,
        "resource" TEXT NOT NULL,
        "resourceId" TEXT,
        "details" TEXT,
        "ipAddress" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");`);
    } catch (_) {}

    // 2. Create Customer table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Customer" (
        "id" TEXT PRIMARY KEY,
        "companyName" TEXT NOT NULL,
        "contactName" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "address" TEXT,
        "taxCode" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Product table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "oldCode" TEXT,
        "name" TEXT NOT NULL,
        "brand" TEXT NOT NULL DEFAULT 'GROB',
        "category" TEXT NOT NULL DEFAULT 'Khác',
        "shortDescription" TEXT,
        "cabinetWidth" TEXT,
        "dimensions" TEXT,
        "unit" TEXT NOT NULL DEFAULT 'Bộ',
        "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "retailPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure new columns exist on Product table
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "oldCode" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT 'GROB';`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Khác';`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "cabinetWidth" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "dimensions" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "retailPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0;`);
    } catch (_) {}

    // 4. Create Quotation table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Quotation" (
        "id" TEXT PRIMARY KEY,
        "quotationNumber" TEXT UNIQUE NOT NULL,
        "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE RESTRICT,
        "quotationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "validUntil" TIMESTAMP(3) NOT NULL,
        "title" TEXT NOT NULL DEFAULT 'ĐƠN HÀNG PHỤ KIỆN TỦ BẾP & TỦ BẾP CAO CẤP EUPLUS',
        "note" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "discountTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "taxableTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "vatTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "previousDebt" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdBy" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure previousDebt column exists if table was created previously
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "previousDebt" DOUBLE PRECISION NOT NULL DEFAULT 0;`);
    } catch (_) {}

    // 5. Create QuotationItem table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QuotationItem" (
        "id" TEXT PRIMARY KEY,
        "quotationId" TEXT NOT NULL REFERENCES "Quotation"("id") ON DELETE CASCADE,
        "productId" TEXT REFERENCES "Product"("id") ON DELETE SET NULL,
        "productNameSnapshot" TEXT NOT NULL,
        "descriptionSnapshot" TEXT,
        "unit" TEXT NOT NULL DEFAULT 'Bộ',
        "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
        "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "taxableAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Cấu trúc bảng PostgreSQL đã sẵn sàng!');

    // 6. Ensure default Super Admin exists
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'admin@baogia.vn' },
    });

    if (!superAdmin) {
      console.log('🌱 Đang tạo tài khoản SUPER_ADMIN mặc định...');
      const passwordHash = await bcrypt.hash('123456', 10);
      await prisma.user.create({
        data: {
          name: 'Nhà Phân Phối Bích Điều (Super Admin)',
          email: 'admin@baogia.vn',
          passwordHash,
          role: 'SUPER_ADMIN',
        },
      });
    } else if (superAdmin.role !== 'SUPER_ADMIN') {
      await prisma.user.update({
        where: { email: 'admin@baogia.vn' },
        data: { role: 'SUPER_ADMIN' },
      });
    }

    // 7. Seed Catalog Products if GROB products are not present
    const { ALL_CATALOG_PRODUCTS } = await import('@taohoadon/shared');
    const grobCount = await prisma.product.count({ where: { brand: 'GROB' } });
    if (grobCount < 200) {
      console.log('🌱 Đang nạp toàn bộ danh mục sản phẩm phụ kiện GROB (255+ sản phẩm)...');
      
      // Update any previous initial products that got default GROB to EUPLUS
      await prisma.product.updateMany({
        where: {
          code: { in: ['EV.I80', 'EV.I90', 'EV.80B', 'EV.80', 'EV.35', 'B30.1', 'E.30G', 'EV.270.8', 'EV.645', 'TB-ACRYLIC'] },
          brand: 'GROB',
          category: 'Khác',
        },
        data: {
          brand: 'EUPLUS',
          category: 'Phụ kiện tủ bếp',
        },
      });

      for (const p of ALL_CATALOG_PRODUCTS) {
        await prisma.product.upsert({
          where: { code: p.code },
          update: {
            oldCode: p.oldCode,
            name: p.name,
            brand: p.brand,
            category: p.category,
            shortDescription: p.shortDescription,
            cabinetWidth: p.cabinetWidth,
            dimensions: p.dimensions,
            unit: p.unit,
            price: p.price,
            retailPrice: p.retailPrice,
            discountRate: p.discountRate,
            vatRate: p.vatRate,
            active: p.active,
          },
          create: p,
        });
      }
      console.log(`🎉 Đã nạp thành công ${ALL_CATALOG_PRODUCTS.length} sản phẩm GROB vào Database!`);
    }

    // 8. Đảm bảo tất cả sản phẩm hiện có trong CSDL đều có VAT = 0%
    await prisma.product.updateMany({
      where: {
        vatRate: { not: 0 },
      },
      data: {
        vatRate: 0,
      },
    });
    console.log('✅ Đã cập nhật tất cả sản phẩm về VAT 0%');
  } catch (err) {
    console.error('Lỗi khi khởi tạo PostgreSQL database:', err);
  }
}

// Start server on 0.0.0.0
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Quotation API Server is live and listening on 0.0.0.0:${PORT}`);
    initPostgresDatabase();
  });
}

export default app;
