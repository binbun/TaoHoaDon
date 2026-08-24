import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidth={maxWidth} className="p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 pr-12">
          <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {title}
          </DialogTitle>
          {subtitle && (
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 sm:p-6 max-h-[calc(90vh-100px)] overflow-y-auto">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};
