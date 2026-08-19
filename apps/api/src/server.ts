import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
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

// Only listen if not imported (e.g. in test suites)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Quotation API Server đang chạy tại http://localhost:${PORT}`);
  });
}

export default app;
