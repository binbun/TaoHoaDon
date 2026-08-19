import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Package,
  Users,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

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

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-30 shadow-xl border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
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
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>

              {item.subItems && (
                <div className="pl-9 space-y-1">
                  {item.subItems.map((sub) => (
                    <NavLink
                      key={sub.path}
                      to={sub.path}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                          isActive
                            ? 'text-blue-400 font-semibold bg-slate-800/80'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        )
                      }
                    >
                      {sub.icon && <sub.icon className="w-3.5 h-3.5" />}
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
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">{user?.name || 'NPP Bích Điều'}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@baogia.vn'}</div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Đăng xuất"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
