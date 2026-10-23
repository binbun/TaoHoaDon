import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Quotation, DashboardStats } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';
import { customerKeys } from './useCustomers';

export const quotationKeys = {
  all: ['quotations'] as const,
  list: (params?: QuotationListParams) => ['quotations', 'list', params] as const,
  detail: (id: string) => ['quotations', 'detail', id] as const,
  dashboardStats: ['dashboard-stats'] as const,
};

export interface QuotationListParams {
  search?: string;
  status?: string;
  creatorId?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
}

export function useQuotations(params?: QuotationListParams) {
  return useQuery<Quotation[]>({
    queryKey: quotationKeys.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.creatorId) searchParams.append('creatorId', params.creatorId);
      if (params?.fromDate) searchParams.append('fromDate', params.fromDate);
      if (params?.toDate) searchParams.append('toDate', params.toDate);
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
      queryClient.setQueryData(quotationKeys.detail(newQuote.id), newQuote);
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      if (newQuote.customerId) {
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(newQuote.customerId) });
      }
      success(`Tạo đơn hàng ${newQuote.quotationNumber} thành công!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể tạo đơn hàng mới');
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
      queryClient.setQueryData(quotationKeys.detail(updatedQuote.id), updatedQuote);
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(updatedQuote.id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      if (updatedQuote.customerId) {
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(updatedQuote.customerId) });
      }
      success(`Cập nhật đơn hàng ${updatedQuote.quotationNumber} thành công!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể cập nhật đơn hàng');
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
      success('Đã xóa đơn hàng thành công');
    },
    onError: (err: any) => {
      error(err.message || 'Không thể xóa đơn hàng');
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
      success(`Đã nhân bản sang đơn hàng ${newQuote.quotationNumber}!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể nhân bản đơn hàng');
    },
  });
}
