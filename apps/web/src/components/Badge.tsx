import React from 'react';
import { clsx } from 'clsx';
import { getStatusInfo } from '@taohoadon/shared';

interface BadgeProps {
  status?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  children?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, variant, children, className }) => {
  if (status) {
    const info = getStatusInfo(status);
    return (
      <span
        className={clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide shadow-xs',
          info.bg,
          info.text,
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
        {info.label}
      </span>
    );
  }

  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variants[variant || 'default'],
        className
      )}
    >
      {children}
    </span>
  );
};
