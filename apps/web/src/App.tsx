import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { QuotationsListPage } from './pages/QuotationsListPage';
import { QuotationBuilderPage } from './pages/QuotationBuilderPage';
import { QuotationPreviewPage } from './pages/QuotationPreviewPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { UsersPage } from './pages/UsersPage';
import { BrandsPage } from './pages/BrandsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DocumentTitle } from './pageTitles';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <DocumentTitle />
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Protected App Routes */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="quotations" element={<QuotationsListPage />} />
                <Route path="quotations/new" element={<QuotationBuilderPage />} />
                <Route path="quotations/:id/edit" element={<QuotationBuilderPage />} />
                <Route path="quotations/:id/preview" element={<QuotationPreviewPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="brands" element={<BrandsPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>

              {/* 404 Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
