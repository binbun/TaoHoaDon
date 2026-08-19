import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Quotation, DashboardStats } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';

export const quotationKeys = {
  all: ['quotations'] as const,
  list: (params?: { search?: string; status?: string }) =>
    ['quotations', 'list', params] as const,
  detail: (id: string) => ['quotations', 'detail', id] as const,
  dashboardStats: ['dashboard-stats'] as const,
};

export function useQuotations(params?: { search?: string; status?: string }) {
  return useQuery<Quotation[]>({
    queryKey: quotationKeys.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.status) searchParams.append('status', params.status);
      const query = searchParams.toString();
      return apiClient(`/quotations${query ? `?${query}` : ''}`);
    },
  });
}

export function useQuotation(id?: string) {
  return useQuery<Quotation>({
    queryKey: quotationKeys.detail(id || ''),
    queryFn: () => apiClient(`/quotations/${id}`),
    enabled: !!id,
    retry: 1,
  });
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: quotationKeys.dashboardStats,
    queryFn: () => apiClient('/dashboard/stats'),
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: any) =>
      apiClient<Quotation>('/quotations', { method: 'POST', data }),
    onSuccess: (newQuote) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
      success(`Tạo báo giá ${newQuote.quotationNumber} thành công!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể tạo báo giá mới');
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient<Quotation>(`/quotations/${id}`, { method: 'PATCH', data }),
    onSuccess: (updatedQuote) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(updatedQuote.id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
      success(`Cập nhật báo giá ${updatedQuote.quotationNumber} thành công!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể cập nhật báo giá');
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient(`/quotations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
      success('Đã xóa báo giá thành công');
    },
    onError: (err: any) => {
      error(err.message || 'Không thể xóa báo giá');
    },
  });
}

export function useDuplicateQuotation() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Quotation>(`/quotations/${id}/duplicate`, { method: 'POST' }),
    onSuccess: (newQuote) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
      success(`Đã nhân bản sang báo giá ${newQuote.quotationNumber}!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể nhân bản báo giá');
    },
  });
}
