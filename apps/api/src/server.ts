import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import authRoutes from './auth/auth.routes';
import productsRoutes from './products/products.routes';
import customersRoutes from './customers/customers.routes';
import quotationsRoutes from './quotations/quotations.routes';
import dashboardRoutes from './dashboard/dashboard.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: '*', // Allow web client from any domain (Vercel, Localhost, etc.)
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check (Supports both /health and /api/health)
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TaoHoaDon Quotation API',
  });
});

// API Routes (Supports both with /api prefix and without /api prefix)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/products', '/products'], productsRoutes);
app.use(['/api/customers', '/customers'], customersRoutes);
app.use(['/api/quotations', '/quotations'], quotationsRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

// Auto Seed Database if brand new
async function autoSeedDatabase() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Phát hiện database mới. Đang tự động nạp Admin và dữ liệu EUPLUS...');
      const passwordHash = await bcrypt.hash('123456', 10);
      const admin = await prisma.user.create({
        data: {
          name: 'Nhà Phân Phối Bích Điều',
          email: 'admin@baogia.vn',
          passwordHash,
          role: 'ADMIN',
        },
      });

      // Sample Products
      const initialProducts = [
        { code: 'EV.I80', name: 'Giá bát nâng hạ thông minh SUS304 - KT 800', shortDescription: 'Cơ cấu trợ lực nâng hạ 2 tầng Inox 304 cao cấp, giảm chấn êm ái, khay hứng nước PVC.', unit: 'Bộ', price: 2596320, vatRate: 8, active: true },
        { code: 'EV.I90', name: 'Giá bát nâng hạ thông minh SUS304 - KT 900', shortDescription: 'Cơ cấu trợ lực nâng hạ 2 tầng Inox 304 cao cấp cho khoang tủ 900mm.', unit: 'Bộ', price: 2682720, vatRate: 8, active: true },
        { code: 'EV.80B', name: 'Giá để xoong nồi nan dẹt SUS304 - KT 800', shortDescription: 'Nan dẹt dày dặn Inox 304 kèm ray trượt âm giảm chấn chịu tải trọng 35kg.', unit: 'Bộ', price: 913680, vatRate: 8, active: true },
        { code: 'EV.80', name: 'Giá bát đĩa đa năng nan dẹt SUS304 - KT 800', shortDescription: 'Khay cài bát đĩa nan dẹt Inox 304 tủ dưới, kèm khay hứng nước và ray giảm chấn.', unit: 'Bộ', price: 951480, vatRate: 8, active: true },
        { code: 'EV.35', name: 'Giá dao thớt đa năng nan dẹt SUS304 - KT 350', shortDescription: 'Tích hợp cài dao, thớt, đũa thìa, móc muôi thìa và ray trượt giảm chấn.', unit: 'Bộ', price: 1004400, vatRate: 8, active: true },
        { code: 'B30.1', name: 'Thùng gạo gương đen thông minh nút xoay', shortDescription: 'Mặt gương đen sang trọng, tự động đong gạo 150g-250g chống ẩm mốc.', unit: 'Chiếc', price: 813240, vatRate: 8, active: true },
        { code: 'E.30G', name: 'Thùng rác đôi gắn cánh âm tủ ray giảm chấn', shortDescription: '2 hố phân loại rác thải tự động mở nắp khi kéo cánh tủ, ray trượt giảm chấn.', unit: 'Bộ', price: 1030320, vatRate: 8, active: true },
        { code: 'EV.270.8', name: 'Mâm xoay 3/4 nan dẹt SUS304 - KT 800', shortDescription: 'Tối ưu góc chữ L tủ bếp, mở xoay 270 độ Inox 304 sáng bóng.', unit: 'Bộ', price: 1202040, vatRate: 8, active: true },
        { code: 'EV.645', name: 'Tủ kho 6 tầng cánh 450 nan dẹt SUS304', shortDescription: 'Hệ giá kho 12 rổ Inox 304 chứa đồ khô tiện nghi, khung sơn tĩnh điện cao cấp.', unit: 'Hệ', price: 4407480, vatRate: 8, active: true },
        { code: 'TB-ACRYLIC', name: 'Tủ bếp Acrylic bóng gương An Cường (Thùng MDF xanh chống ẩm)', shortDescription: 'Cánh phủ Acrylic no line bóng gương An Cường, thùng MDF lõi xanh chống ẩm tiêu chuẩn.', unit: 'Mét dài', price: 4800000, vatRate: 8, active: true },
      ];

      for (const p of initialProducts) {
        await prisma.product.upsert({
          where: { code: p.code },
          update: p,
          create: p,
        });
      }

      // Sample Customer
      await prisma.customer.create({
        data: {
          companyName: 'Công ty Cổ phần Kiến Trúc & Nội Thất HomeDecor',
          contactName: 'KTS. Nguyễn Tuấn Anh',
          email: 'tuananh@homedecor.vn',
          phone: '0988 567 890',
          address: 'Biệt thự BT2-16, KĐT Ngoại Giao Đoàn, Bắc Từ Liêm, Hà Nội',
          taxCode: '0108668899',
        },
      });

      console.log('✅ Đã tự động nạp tài khoản admin@baogia.vn và dữ liệu mẫu EUPLUS thành công!');
    }
  } catch (e) {
    console.error('Không thể auto-seed:', e);
  }
}

// Only listen if not imported (e.g. in test suites)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`🚀 Quotation API Server đang chạy tại http://localhost:${PORT}`);
    await autoSeedDatabase();
  });
}

export default app;
