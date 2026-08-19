import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { PlusCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Bảng Điều Khiển Tổng Quan';
    if (path === '/quotations') return 'Quản Lý Báo Giá';
    if (path === '/quotations/new') return 'Tạo Báo Giá Mới';
    if (path.includes('/preview')) return 'Xem Trước & Xuất Báo Giá';
    if (path.includes('/edit')) return 'Chỉnh Sửa Báo Giá';
    if (path === '/products') return 'Danh Mục Sản Phẩm & Dịch Vụ';
    if (path === '/customers') return 'Danh Bạ Khách Hàng';
    return 'Hệ Thống Báo Giá';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-3">
        {location.pathname !== '/quotations/new' && (
          <Button
            size="sm"
            variant="primary"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => navigate('/quotations/new')}
          >
            Tạo báo giá
          </Button>
        )}
      </div>
    </header>
  );
};
