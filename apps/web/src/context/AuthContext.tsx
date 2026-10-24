import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, ApiError } from '../api/client';
import { User } from '@taohoadon/shared';

// Helper giải mã an toàn payload JWT và kiểm tra hạn sử dụng
function parseJwtPayload(token: string): { exp?: number; [key: string]: any } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return false;
  // Hết hạn nếu thời gian hiện tại >= payload.exp (tính bằng milliseconds)
  return Date.now() >= payload.exp * 1000;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) return null;
    if (isTokenExpired(savedToken)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      return null;
    }
    return savedToken;
  });

  const [user, setUser] = useState<User | null>(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken || isTokenExpired(savedToken)) {
      return null;
    }
    const savedUser = localStorage.getItem('auth_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        if (isTokenExpired(savedToken)) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setToken(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        try {
          const userData = await apiClient<User>('/auth/me');
          setUser(userData);
          localStorage.setItem('auth_user', JSON.stringify(userData));
        } catch (err: any) {
          // CHỈ xóa phiên khi máy chủ xác nhận lỗi 401 (token hết hạn thật sự hoặc tài khoản/tokenVersion bị đổi)
          if (err instanceof ApiError && err.statusCode === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setToken(null);
            setUser(null);
          } else {
            // Lỗi mạng, máy tính vừa thức dậy sau sleep, server đang khởi động:
            // Giữ nguyên phiên đăng nhập trong localStorage để không ngắt quãng người dùng
            console.warn('Không thể kết nối đến máy chủ để làm mới thông tin phiên, tiếp tục sử dụng phiên hiện tại:', err);
          }
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Managers may delete payments, change "Nợ đầu kỳ" and export the debt report (the API enforces it too)
export const useIsManager = () => {
  const { user } = useAuth();
  return user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
};
