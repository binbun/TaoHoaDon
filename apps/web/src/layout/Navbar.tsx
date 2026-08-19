import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PlusCircle, Menu } from 'lucide-react';

interface NavbarProps {
  onOpenMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Tổng Quan';
    if (path === '/quotations') return 'Quản Lý Báo Giá';
    if (path === '/quotations/new') return 'Tạo Báo Giá';
    if (path.includes('/preview')) return 'Xem Trước Báo Giá';
    if (path.includes('/edit')) return 'Chỉnh Sửa Báo Giá';
    if (path === '/products') return 'Phụ Kiện & Tủ Bếp';
    if (path === '/customers') return 'Khách Hàng & Đại Lý';
    if (path === '/users') return 'Quản Lý Tài Khoản';
    return 'Hệ Thống Báo Giá';
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-md">
          {getPageTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {location.pathname !== '/quotations/new' && (
          <Button
            size="sm"
            variant="primary"
            className="text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-xs"
            leftIcon={<PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            onClick={() => navigate('/quotations/new')}
          >
            <span className="hidden sm:inline">Tạo báo giá</span>
            <span className="sm:hidden">Tạo mới</span>
          </Button>
        )}
      </div>
    </header>
  );
};
