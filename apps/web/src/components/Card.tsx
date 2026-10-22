import React from 'react';
import { clsx } from 'clsx';
import { cn } from '../lib/utils';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  /** Classes for the body wrapper (merged over the default responsive padding) */
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden',
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && typeof title === 'string' ? (
              <h3 className="font-bold text-slate-900 text-base">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn('p-4 sm:p-6', bodyClassName)}>{children}</div>
    </div>
  );
};
