import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Quotation, DashboardStats } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';

export const quotationKeys = {
  all: ['quotations'] as const,
  list: (params?: { search?: string; status?: string; creatorId?: string }) =>
    ['quotations', 'list', params] as const,
  detail: (id: string) => ['quotations', 'detail', id] as const,
  dashboardStats: ['dashboard-stats'] as const,
};

export function useQuotations(params?: { search?: string; status?: string; creatorId?: string }) {
  return useQuery<Quotation[]>({
    queryKey: quotationKeys.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.creatorId) searchParams.append('creatorId', params.creatorId);
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
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(updatedQuote.id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
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

export function useIssueQuotation() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Quotation>(`/quotations/${id}/issue`, { method: 'POST' }),
    onSuccess: (issuedQuote) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(issuedQuote.id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
      success(`Đã phát hành chính thức hóa đơn ${issuedQuote.quotationNumber}!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể phát hành đơn hàng');
    },
  });
}

export function useVoidQuotation() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient<Quotation>(`/quotations/${id}/void`, { method: 'POST', data: { reason } }),
    onSuccess: (voidedQuote) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(voidedQuote.id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
      success(`Đã hủy hóa đơn ${voidedQuote.quotationNumber}!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể hủy hóa đơn');
    },
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient<Quotation>(`/quotations/${id}/credit-note`, { method: 'POST', data }),
    onSuccess: (creditNote) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
      success(`Đã tạo hóa đơn điều chỉnh ${creditNote.quotationNumber} thành công!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể tạo hóa đơn điều chỉnh');
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient<{ payment: any; updatedQuotation: Quotation }>(`/quotations/${id}/payments`, {
        method: 'POST',
        data,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(res.updatedQuotation.id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
      success(`Ghi nhận thanh toán thành công!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể ghi nhận thanh toán');
    },
  });
}
