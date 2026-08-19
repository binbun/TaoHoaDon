import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Quotation, QuotationStatus, formatCurrency, formatDate } from '@taohoadon/shared';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Copy,
  Download,
  Trash2,
  Calendar,
  Building,
  Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';

export const QuotationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error, info } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch Quotations
  const { data: responseData, isLoading } = useQuery<{ data: Quotation[]; pagination: any }>({
    queryKey: ['quotations', search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      return apiClient(`/quotations?${params.toString()}`);
    },
  });

  const quotations: Quotation[] = responseData?.data || (Array.isArray(responseData) ? responseData : []);

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/quotations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Đã xóa báo giá thành công');
      setDeletingId(null);
    },
    onError: (err: any) => {
      error(err.message || 'Không thể xóa báo giá');
    },
  });

  // Duplicate Mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/quotations/${id}/duplicate`, { method: 'POST' }),
    onSuccess: (newQuote: Quotation) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success(`Đã nhân bản sang báo giá mới: ${newQuote.quotationNumber}`);
      navigate(`/quotations/${newQuote.id}/preview`);
    },
    onError: (err: any) => {
      error(err.message || 'Nhân bản báo giá thất bại');
    },
  });

  // Handle PDF Download
  const handleDownloadPdf = async (q: Quotation) => {
    try {
      setDownloadingId(q.id);
      info('Đang sinh file PDF chuẩn A4 trên server...');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/quotations/${q.id}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Lỗi khi tải file PDF từ máy chủ');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bao_Gia_${q.quotationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      success(`Đã tải xuống file Bao_Gia_${q.quotationNumber}.pdf thành công!`);
    } catch (err: any) {
      error(err.message || 'Không thể xuất file PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const statusTabs: { label: string; value: string }[] = [
    { label: 'Tất cả', value: 'ALL' },
    { label: 'Bản nháp (Draft)', value: 'DRAFT' },
    { label: 'Đã gửi (Sent)', value: 'SENT' },
    { label: 'Đã duyệt (Accepted)', value: 'ACCEPTED' },
    { label: 'Từ chối (Rejected)', value: 'REJECTED' },
    { label: 'Hết hạn (Expired)', value: 'EXPIRED' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Danh Sách Báo Giá</h1>
          <p className="text-sm text-slate-500">Quản lý, chỉnh sửa, nhân bản và xuất PDF báo giá cho đối tác</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/quotations/new')}
        >
          Tạo báo giá mới
        </Button>
      </div>

      {/* Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={clsx(
                'px-4 py-2 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2',
                statusFilter === tab.value
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <Card className="p-4">
          <div className="max-w-md">
            <Input
              placeholder="Tìm theo số báo giá, tiêu đề, tên khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftElement={<Search className="w-4 h-4" />}
            />
          </div>
        </Card>
      </div>

      {/* Quotation Table */}
      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : quotations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Số báo giá</th>
                  <th className="py-3 px-4">Khách hàng & Tiêu đề</th>
                  <th className="py-3 px-4">Thời hạn</th>
                  <th className="py-3 px-4 text-right">Tổng thanh toán</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      <span
                        onClick={() => navigate(`/quotations/${q.id}/preview`)}
                        className="cursor-pointer hover:underline flex items-center gap-1.5"
                      >
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span>{q.quotationNumber}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{q.customer?.companyName || '---'}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 max-w-sm truncate">
                        {q.title}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Lập: {formatDate(q.quotationDate)}</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Hạn: {formatDate(q.validUntil)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 text-sm">
                      {formatCurrency(q.grandTotal)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={q.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/quotations/${q.id}/preview`)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Xem trước & In"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/quotations/${q.id}/edit`)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateMutation.mutate(q.id)}
                          disabled={duplicateMutation.isPending}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50"
                          title="Nhân bản báo giá"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(q)}
                          disabled={downloadingId === q.id}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors disabled:opacity-50"
                          title="Tải PDF"
                        >
                          {downloadingId === q.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeletingId(q.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Không tìm thấy báo giá nào"
            description="Bạn chưa có báo giá nào phù hợp với bộ lọc hiện tại."
            actionText="Tạo báo giá mới"
            onAction={() => navigate('/quotations/new')}
            icon={<FileText className="w-10 h-10" />}
          />
        )}
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Xác nhận xóa báo giá"
        message="Hành động này sẽ xóa vĩnh viễn báo giá và toàn bộ các dòng sản phẩm liên quan. Bạn có chắc chắn muốn xóa?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
