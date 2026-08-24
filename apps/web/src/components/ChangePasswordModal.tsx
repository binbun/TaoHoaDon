import React, { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Lock, KeyRound, CheckCircle2 } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { success, error } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Xác nhận mật khẩu mới không trùng khớp');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('Mật khẩu mới không được trùng với mật khẩu hiện tại');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient<{ token?: string }>('/auth/change-password', {
        method: 'POST',
        data: {
          currentPassword,
          newPassword,
          confirmPassword,
        },
      });

      if (res?.token) {
        localStorage.setItem('auth_token', res.token);
      }

      success('Đổi mật khẩu thành công!');
      handleClose();
    } catch (err: any) {
      const msg = err.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
      setErrorMessage(msg);
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Đổi Mật Khẩu Cá Nhân"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-blue-900 text-xs sm:text-sm">
          <KeyRound className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p>
            Mật khẩu mới phải chứa ít nhất <strong>6 ký tự</strong>. Sau khi đổi mật khẩu, phiên làm việc trên các thiết bị khác sẽ tự động đăng xuất.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Mật khẩu hiện tại <span className="text-rose-500">*</span>
          </label>
          <Input
            type="password"
            placeholder="Nhập mật khẩu đang sử dụng"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            leftElement={<Lock className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Mật khẩu mới <span className="text-rose-500">*</span>
          </label>
          <Input
            type="password"
            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            leftElement={<Lock className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
          </label>
          <Input
            type="password"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            leftElement={<Lock className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Cập nhật mật khẩu
          </Button>
        </div>
      </form>
    </Modal>
  );
};
