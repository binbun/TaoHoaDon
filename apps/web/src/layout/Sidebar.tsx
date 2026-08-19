import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Package,
  Users,
  ShieldCheck,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, logout } = useAuth();

  const isManager = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const navItems = [
    {
      label: 'Tổng quan',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      label: 'Báo giá',
      path: '/quotations',
      icon: FileText,
      subItems: [
        { label: 'Tất cả báo giá', path: '/quotations' },
        { label: 'Tạo báo giá mới', path: '/quotations/new', icon: PlusCircle },
      ],
    },
    {
      label: 'Phụ kiện & Tủ bếp',
      path: '/products',
      icon: Package,
    },
    {
      label: 'Khách hàng & Đại lý',
      path: '/customers',
      icon: Users,
    },
  ];

  if (isManager) {
    navItems.push({
      label: 'Quản lý tài khoản',
      path: '/users',
      icon: ShieldCheck,
      subItems: undefined as any,
    });
  }

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded">SUPER ADMIN</span>;
      case 'ADMIN':
        return <span className="text-[9px] font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.5 rounded">QUẢN TRỊ VIÊN</span>;
      default:
        return <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded">NHÂN VIÊN</span>;
    }
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1.5 bg-blue-600 rounded-lg text-white font-black text-sm tracking-wider shadow-md shadow-blue-500/20">
            EUPLUS
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight leading-tight">
              QuotationPro
            </h1>
            <p className="text-[10px] text-blue-400 font-medium">Phụ kiện & Tủ bếp thông minh</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Danh mục quản lý
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.path} className="space-y-1">
              <NavLink
                to={item.path}
                end={item.path === '/'}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>

              {item.subItems && (
                <div className="pl-9 space-y-1">
                  {item.subItems.map((sub) => (
                    <NavLink
                      key={sub.path}
                      to={sub.path}
                      onClick={handleLinkClick}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                          isActive
                            ? 'text-blue-400 font-semibold bg-slate-800/80'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        )
                      }
                    >
                      {sub.icon && <sub.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                      <span>{sub.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 pb-safe">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30 flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">{user?.name || 'NPP Bích Điều'}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {getRoleBadge(user?.role)}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (onClose) onClose();
              logout();
            }}
            title="Đăng xuất"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col h-screen fixed left-0 top-0 z-30 shadow-xl border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Panel */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />

          {/* Drawer Sliding Panel */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 shadow-2xl border-r border-slate-800">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
