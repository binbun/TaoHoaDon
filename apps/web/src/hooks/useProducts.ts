import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Product } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';

export const productKeys = {
  all: ['products'] as const,
  list: (params?: { search?: string; active?: string | boolean; brand?: string; category?: string; cabinetWidth?: string }) =>
    ['products', 'list', params] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
};

export function useProducts(params?: { search?: string; active?: string | boolean; brand?: string; category?: string; cabinetWidth?: string }) {
  return useQuery<Product[]>({
    queryKey: productKeys.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.brand) searchParams.append('brand', params.brand);
      if (params?.category) searchParams.append('category', params.category);
      if (params?.cabinetWidth) searchParams.append('cabinetWidth', params.cabinetWidth);
      if (params?.active !== undefined && params?.active !== '') {
        searchParams.append('active', String(params.active));
      }
      const query = searchParams.toString();
      return apiClient(`/products${query ? `?${query}` : ''}`);
    },
  });
}

export function useProduct(id?: string) {
  return useQuery<Product>({
    queryKey: productKeys.detail(id || ''),
    queryFn: () => apiClient(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      apiClient<Product>('/products', { method: 'POST', data }),
    onSuccess: (newProd) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      success(`Đã thêm phụ kiện "${newProd.name}" thành công`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể tạo sản phẩm mới');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      apiClient<Product>(`/products/${id}`, { method: 'PATCH', data }),
    onSuccess: (updatedProd) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      success(`Đã cập nhật phụ kiện "${updatedProd.name}" thành công`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể cập nhật sản phẩm');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      success('Đã xóa sản phẩm thành công');
    },
    onError: (err: any) => {
      error(err.message || 'Không thể xóa sản phẩm');
    },
  });
}
