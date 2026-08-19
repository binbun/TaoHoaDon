import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toastData.duration || 4000;
    const newToast: Toast = { ...toastData, id };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = (message: string, title?: string) => {
    addToast({ type: 'success', message, title: title || 'Thành công' });
  };

  const error = (message: string, title?: string) => {
    addToast({ type: 'error', message, title: title || 'Lỗi xử lý' });
  };

  const info = (message: string, title?: string) => {
    addToast({ type: 'info', message, title: title || 'Thông báo' });
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      {/* Toast Render Portal */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let Icon = CheckCircle2;
          let borderColor = 'border-emerald-500';
          let bgColor = 'bg-emerald-50 text-emerald-900';
          let iconColor = 'text-emerald-600';

          if (t.type === 'error') {
            Icon = XCircle;
            borderColor = 'border-rose-500';
            bgColor = 'bg-rose-50 text-rose-900';
            iconColor = 'text-rose-600';
          } else if (t.type === 'info') {
            Icon = Info;
            borderColor = 'border-blue-500';
            bgColor = 'bg-blue-50 text-blue-900';
            iconColor = 'text-blue-600';
          } else if (t.type === 'warning') {
            Icon = AlertCircle;
            borderColor = 'border-amber-500';
            bgColor = 'bg-amber-50 text-amber-900';
            iconColor = 'text-amber-600';
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-lg bg-white ${borderColor} transition-all duration-300 transform translate-y-0`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-sm">
                {t.title && <div className="font-semibold text-slate-900 mb-0.5">{t.title}</div>}
                <div className="text-slate-600 leading-relaxed">{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
