import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../api/client';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Building2, Lock, Mail, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@baogia.vn');
  const [password, setPassword] = useState('123456');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Vui lòng điền đầy đủ email và mật khẩu');
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        data: { email, password },
      });

      login(res.token, res.user);
      success(`Chào mừng trở lại, ${res.user.name}!`);
      navigate('/');
    } catch (err: any) {
      error(err.message || 'Đăng nhập thất bại, vui lòng kiểm tra lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@baogia.vn');
    setPassword('123456');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-100">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">QuotationPro</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập để quản lý và tạo đơn hàng chuyên nghiệp</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="admin@baogia.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftElement={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Mật khẩu"
            type="password"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftElement={<Lock className="w-4 h-4" />}
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 text-sm font-semibold shadow-md shadow-blue-500/20"
              isLoading={isLoading}
            >
              Đăng nhập hệ thống
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
