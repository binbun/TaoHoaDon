import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useQuotations,
  useDeleteQuotation,
  useDuplicateQuotation,
} from '../hooks';
import { Quotation, QuotationStatus, formatCurrency, formatDate } from '@taohoadon/shared';
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
      info(`Đang tạo PDF cho báo giá ${q.quotationNumber}...`);

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
      link.download = `Bao_Gia_EUPLUS_${q.quotationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      success(`Đã tải xuống file Bao_Gia_EUPLUS_${q.quotationNumber}.pdf`);
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
    { key: 'ACCEPTED', label: 'Đã duyệt' },
    { key: 'REJECTED', label: 'Từ chối' },
    { key: 'EXPIRED', label: 'Hết hạn' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản Lý Báo Giá Phụ Kiện & Tủ Bếp</h1>
          <p className="text-sm text-slate-500">
            Tạo, xem trước, nhân bản và xuất bản in PDF theo quy chuẩn EUPLUS Kitchen
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/quotations/new')}
        >
          Tạo báo giá mới
        </Button>
      </div>

      {/* Filter Toolbar & Status Pills */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-96">
            <Input
              placeholder="Tìm theo số báo giá (BG-2026-...), tên khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftElement={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
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
      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : quotations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Số báo giá & Tiêu đề</th>
                  <th className="py-3 px-4">Khách hàng / Đại lý</th>
                  <th className="py-3 px-4 text-right">Tổng tiền</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div
                        onClick={() => navigate(`/quotations/${q.id}/preview`)}
                        className="font-mono font-bold text-blue-600 hover:underline cursor-pointer text-sm"
                      >
                        {q.quotationNumber}
                      </div>
                      <div className="text-xs font-medium text-slate-800 line-clamp-1 mt-0.5 max-w-sm">
                        {q.title}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{q.customer?.companyName || 'Khách lẻ'}</span>
                      </div>
                      {q.customer?.contactName && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          LH: {q.customer.contactName}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {formatCurrency(q.grandTotal)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {q.items?.length || 0} sản phẩm
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Lập: {formatDate(q.quotationDate)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Hạn: {formatDate(q.validUntil)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge status={q.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => navigate(`/quotations/${q.id}/preview`)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Xem bản in A4"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => navigate(`/quotations/${q.id}/edit`)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => duplicateMutation.mutate(q.id)}
                        disabled={duplicateMutation.isPending}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-40"
                        title="Nhân bản báo giá"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDownloadPdf(q)}
                        disabled={downloadingId === q.id}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors disabled:opacity-40"
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
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
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
            title="Không tìm thấy báo giá nào"
            description="Hãy bắt đầu tạo báo giá đầu tiên cho đối tác / đại lý của bạn."
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
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId, { onSuccess: () => setDeletingId(null) })}
        title="Xác nhận xóa báo giá"
        message="Bạn có chắc chắn muốn xóa báo giá này? Toàn bộ danh sách chi tiết phụ kiện bên trong sẽ bị xóa và không thể khôi phục."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
