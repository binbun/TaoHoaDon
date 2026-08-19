import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Customer } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';

export const customerKeys = {
  all: ['customers'] as const,
  list: (search?: string) => ['customers', 'list', search] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
};

export function useCustomers(search?: string) {
  return useQuery<Customer[]>({
    queryKey: customerKeys.list(search),
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return apiClient(`/customers${params}`);
    },
  });
}

export function useCustomer(id?: string) {
  return useQuery<Customer>({
    queryKey: customerKeys.detail(id || ''),
    queryFn: () => apiClient(`/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: Partial<Customer>) =>
      apiClient<Customer>('/customers', { method: 'POST', data }),
    onSuccess: (newCust) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      success(`Đã thêm khách hàng "${newCust.companyName}" thành công`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể tạo thông tin khách hàng');
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      apiClient<Customer>(`/customers/${id}`, { method: 'PATCH', data }),
    onSuccess: (updatedCust) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      success(`Đã cập nhật thông tin khách hàng "${updatedCust.companyName}" thành công`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể cập nhật khách hàng');
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      success('Đã xóa khách hàng thành công');
    },
    onError: (err: any) => {
      error(err.message || 'Không thể xóa khách hàng');
    },
  });
}
