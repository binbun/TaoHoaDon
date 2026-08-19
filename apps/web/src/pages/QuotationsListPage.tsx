import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useQuotations,
  useDeleteQuotation,
  useDuplicateQuotation,
} from '../hooks';
import { Quotation, formatCurrency, formatDate } from '@taohoadon/shared';
import { getFullApiUrl } from '../api/client';
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
  const { success, error, info } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Custom Hooks
  const { data: responseData, isLoading } = useQuotations({
    search,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  }) as any;

  const deleteMutation = useDeleteQuotation();
  const duplicateMutation = useDuplicateQuotation();

  const quotations: Quotation[] = responseData?.data || (Array.isArray(responseData) ? responseData : []);

  // Download PDF
  const handleDownloadPdf = async (q: Quotation) => {
    try {
      setDownloadingId(q.id);
      info(`Đang tạo PDF cho đơn hàng ${q.quotationNumber}...`);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(getFullApiUrl(`/quotations/${q.id}/pdf`), {
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
      link.download = `Don_Hang_EUPLUS_${q.quotationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      success(`Đã tải xuống file Don_Hang_EUPLUS_${q.quotationNumber}.pdf`);
    } catch (err: any) {
      error(err.message || 'Không thể xuất file PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const statusTabs: { key: string; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'DRAFT', label: 'Bản nháp' },
    { key: 'SENT', label: 'Đã gửi' },
    { key: 'PAID', label: 'Đã thanh toán' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Quản Lý Đơn Hàng Phụ Kiện & Tủ Bếp</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Tạo, xem trước, nhân bản và xuất bản in PDF theo quy chuẩn EUPLUS Kitchen
          </p>
        </div>
        <Button
          variant="primary"
          className="self-stretch sm:self-auto justify-center"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/quotations/new')}
        >
          Tạo đơn hàng mới
        </Button>
      </div>

      {/* Filter Toolbar & Status Pills */}
      <Card className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
          <div className="w-full md:w-96">
            <Input
              placeholder="Tìm theo số đơn hàng, tên khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftElement={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Status Tabs with Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1.5 md:pb-0 scrollbar-none">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Quotations Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : quotations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[680px] sm:min-w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Số đơn hàng & Tiêu đề</th>
                  <th className="py-3 px-3 sm:px-4">Khách hàng / Đại lý</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Tổng tiền</th>
                  <th className="py-3 px-3 sm:px-4">Ngày tạo</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 sm:px-4">
                      <span
                        onClick={() => navigate(`/quotations/${q.id}/preview`)}
                        className="font-bold text-blue-600 hover:underline cursor-pointer block text-sm"
                      >
                        {q.quotationNumber}
                      </span>
                      <div className="text-xs text-slate-500 line-clamp-1 max-w-[200px] sm:max-w-xs mt-0.5">
                        {q.title}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 sm:px-4">
                      <div className="font-medium text-slate-900 text-sm">{q.customer?.companyName || '---'}</div>
                      {q.customer?.contactName && (
                        <div className="text-xs text-slate-500">{q.customer.contactName}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {formatCurrency(q.grandTotal)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {q.items?.length || 0} sản phẩm
                      </div>
                    </td>

                    <td className="py-3.5 px-3 sm:px-4 text-xs text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{formatDate(q.quotationDate)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                      <Badge status={q.status} />
                    </td>

                    <td className="py-3.5 px-3 sm:px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/quotations/${q.id}/preview`)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-95"
                        title="Xem chi tiết đơn hàng"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => navigate(`/quotations/${q.id}/edit`)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors active:scale-95"
                        title="Chỉnh sửa đơn hàng"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => duplicateMutation.mutate(q.id)}
                        disabled={duplicateMutation.isPending}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40 active:scale-95"
                        title="Nhân bản đơn hàng"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDownloadPdf(q)}
                        disabled={downloadingId === q.id}
                        className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40 active:scale-95"
                        title="Tải file PDF"
                      >
                        {downloadingId === q.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => setDeletingId(q.id)}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors active:scale-95"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Không tìm thấy đơn hàng nào"
            description="Hãy bắt đầu tạo đơn hàng đầu tiên cho đối tác / đại lý của bạn."
            actionText="Tạo đơn hàng mới"
            onAction={() => navigate('/quotations/new')}
            icon={<FileText className="w-10 h-10" />}
          />
        )}
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId, { onSuccess: () => setDeletingId(null) })}
        title="Xác nhận xóa đơn hàng"
        message="Bạn có chắc chắn muốn xóa đơn hàng này? Toàn bộ danh sách chi tiết phụ kiện bên trong sẽ bị xóa và không thể khôi phục."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
