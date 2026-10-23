import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { CustomerDebtDetail } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';
import { customerKeys } from './useCustomers';
import { quotationKeys } from './useQuotations';

export const debtKeys = {
  detail: (customerId: string) => ['customers', 'debt', customerId] as const,
};

export interface PaymentInput {
  amount: number;
  paidAt: string;
  note?: string | null;
  quotationId?: string | null;
}

export function useCustomerDebt(customerId?: string) {
  return useQuery<CustomerDebtDetail>({
    queryKey: debtKeys.detail(customerId || ''),
    queryFn: () => apiClient(`/customers/${customerId}/debt`),
    enabled: !!customerId,
  });
}

// Payments change order statuses and customer debt, so refresh both
function useInvalidateDebt() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: customerKeys.all });
    queryClient.invalidateQueries({ queryKey: quotationKeys.all });
    queryClient.invalidateQueries({ queryKey: quotationKeys.dashboardStats });
  };
}

export function useCreatePayment() {
  const invalidate = useInvalidateDebt();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: PaymentInput }) =>
      apiClient<CustomerDebtDetail>(`/customers/${customerId}/payments`, { method: 'POST', data }),
    onSuccess: () => {
      invalidate();
      success('Đã ghi nhận thanh toán');
    },
    onError: (err: any) => {
      error(err.message || 'Không thể ghi nhận thanh toán');
    },
  });
}

export function useDeletePayment() {
  const invalidate = useInvalidateDebt();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ customerId, batchId }: { customerId: string; batchId: string }) =>
      apiClient<CustomerDebtDetail>(`/customers/${customerId}/payments/${batchId}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      success('Đã xóa khoản thanh toán');
    },
    onError: (err: any) => {
      error(err.message || 'Không thể xóa khoản thanh toán');
    },
  });
}
