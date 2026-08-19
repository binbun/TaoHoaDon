export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions extends RequestInit {
  data?: any;
}

export class ApiError extends Error {
  statusCode: number;
  errors?: { path: string; message: string }[];

  constructor(message: string, statusCode: number, errors?: { path: string; message: string }[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, headers, ...customConfig } = options;

  const token = localStorage.getItem('auth_token');

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const config: RequestInit = {
    ...customConfig,
    headers: defaultHeaders,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, config);

  if (response.status === 401) {
    // If not already on login page, redirect to login
    if (!window.location.pathname.includes('/login')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
  }

  let responseData: any;
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    const errorMsg = responseData?.message || `Lỗi yêu cầu: ${response.statusText}`;
    throw new ApiError(errorMsg, response.status, responseData?.errors);
  }

  return responseData.data !== undefined ? responseData.data : responseData;
}
