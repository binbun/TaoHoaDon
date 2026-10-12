import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Brand, CreateBrandInput, UpdateBrandInput } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';

export const brandKeys = {
  all: ['brands'] as const,
  list: (activeOnly?: boolean | 'all') => ['brands', 'list', activeOnly] as const,
};

export function useBrands(activeOnly: boolean | 'all' = true) {
  return useQuery<Brand[]>({
    queryKey: brandKeys.list(activeOnly),
    queryFn: () => {
      const param = activeOnly === 'all' ? '?activeOnly=all' : '?activeOnly=true';
      return apiClient(`/brands${param}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: CreateBrandInput) =>
      apiClient<Brand>('/brands', { method: 'POST', data }),
    onSuccess: (newBrand) => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
      success(`Đã thêm thương hiệu "${newBrand.name}" thành công`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể tạo thương hiệu mới');
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBrandInput }) =>
      apiClient<Brand>(`/brands/${id}`, { method: 'PUT', data }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
      success(`Đã cập nhật thương hiệu "${updated.name}"`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể cập nhật thương hiệu');
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/brands/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
      success('Đã xóa thương hiệu thành công');
    },
    onError: (err: any) => {
      error(err.message || 'Không thể xóa thương hiệu');
    },
  });
}
