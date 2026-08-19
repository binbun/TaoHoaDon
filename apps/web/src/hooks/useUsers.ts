import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { User, CreateUserInput, UpdateUserInput } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';

export const userKeys = {
  all: ['users'] as const,
  list: () => ['users', 'list'] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
};

export function useUsers() {
  return useQuery<User[]>({
    queryKey: userKeys.list(),
    queryFn: () => apiClient<User[]>('/users'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: CreateUserInput) =>
      apiClient<User>('/users', { method: 'POST', data }),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      success(`Tạo tài khoản "${newUser.name}" thành công!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể tạo tài khoản');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      apiClient<User>(`/users/${id}`, { method: 'PATCH', data }),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      success(`Cập nhật tài khoản "${updatedUser.name}" thành công!`);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể cập nhật tài khoản');
    },
  });
}

export function useResetPassword() {
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiClient(`/users/${id}/reset-password`, {
        method: 'POST',
        data: { newPassword },
      }),
    onSuccess: () => {
      success('Đặt lại mật khẩu thành công!');
    },
    onError: (err: any) => {
      error(err.message || 'Không thể đặt lại mật khẩu');
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      success('Đã xóa tài khoản thành công!');
    },
    onError: (err: any) => {
      error(err.message || 'Không thể xóa tài khoản');
    },
  });
}
