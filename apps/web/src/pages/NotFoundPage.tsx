import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { FileQuestion, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4">
        <FileQuestion className="w-16 h-16" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">404 - Trang không tồn tại</h1>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        Đường dẫn bạn đang truy cập không tồn tại hoặc đã được di chuyển sang địa chỉ khác.
      </p>
      <Button
        variant="primary"
        leftIcon={<Home className="w-4 h-4" />}
        onClick={() => navigate('/')}
      >
        Trở về Trang Tổng Quan
      </Button>
    </div>
  );
};
