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
import { EmptyState } from '../components/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../components/ui/tooltip';
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
  Loader2,
  MoreVertical,
  Layers,
} from 'lucide-react';

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

  const statusTabs = [
    { key: 'ALL', label: 'Tất cả đơn' },
    { key: 'DRAFT', label: 'Bản nháp' },
    { key: 'SENT', label: 'Đã gửi' },
    { key: 'PAID', label: 'Đã thanh toán' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-blue-600" />
            Quản Lý Đơn Hàng Phụ Kiện & Tủ Bếp
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
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

      {/* Filter Toolbar & Radix Tabs */}
      <Card className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
          <div className="w-full md:w-96">
            <Input
              placeholder="Tìm theo số đơn hàng, tên khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftElement={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Radix Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList className="w-full md:w-auto justify-start overflow-x-auto">
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Quotations Table with Radix Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : quotations.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số đơn hàng & Tiêu đề</TableHead>
                <TableHead>Khách hàng / Đại lý</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>
                    <span
                      onClick={() => navigate(`/quotations/${q.id}/preview`)}
                      className="font-bold text-blue-600 hover:underline cursor-pointer block text-sm"
                    >
                      {q.quotationNumber}
                    </span>
                    <div className="text-xs text-slate-500 line-clamp-1 max-w-[200px] sm:max-w-xs mt-0.5">
                      {q.title}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-semibold text-slate-900 text-sm">{q.customer?.companyName || '---'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {q.customer?.contactName ? `LH: ${q.customer.contactName}` : ''}
                      {q.customer?.phone ? ` - ${q.customer.phone}` : ''}
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-bold text-slate-900 whitespace-nowrap text-sm">
                    {formatCurrency(q.grandTotal)}
                    <div className="text-[11px] text-slate-400 font-normal">
                      {q.items?.length || 0} sản phẩm
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{formatDate(q.quotationDate)}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-center whitespace-nowrap">
                    <Badge status={q.status} />
                  </TableCell>

                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigate(`/quotations/${q.id}/preview`)}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-95"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Xem chi tiết</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleDownloadPdf(q)}
                            disabled={downloadingId === q.id}
                            className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40 active:scale-95"
                          >
                            {downloadingId === q.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Tải file PDF</TooltipContent>
                      </Tooltip>

                      {/* Radix DropdownMenu for Row Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:scale-95">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/quotations/${q.id}/edit`)}>
                            <Edit className="w-4 h-4 text-indigo-500 mr-2" />
                            <span>Chỉnh sửa</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => duplicateMutation.mutate(q.id)}
                            disabled={duplicateMutation.isPending}
                          >
                            <Copy className="w-4 h-4 text-emerald-500 mr-2" />
                            <span>Nhân bản</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeletingId(q.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span>Xóa đơn hàng</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

      {/* Delete Confirmation with Radix AlertDialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa đơn hàng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa đơn hàng này? Toàn bộ danh sách chi tiết phụ kiện bên trong sẽ bị xóa và không thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deletingId && deleteMutation.mutate(deletingId, { onSuccess: () => setDeletingId(null) })}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
