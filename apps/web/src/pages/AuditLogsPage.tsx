import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { AuditLog } from '@taohoadon/shared';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  Calendar,
  Filter,
  User,
  Activity,
  Globe,
  Clock,
} from 'lucide-react';

interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const AuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('ALL');
  const [resource, setResource] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', { search, action, resource, startDate, endDate, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (action !== 'ALL') params.append('action', action);
      if (resource !== 'ALL') params.append('resource', resource);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page.toString());
      params.append('limit', '30');

      return await apiClient<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
    },
  });

  const getActionBadge = (actionStr: string) => {
    switch (actionStr) {
      case 'AUTH_LOGIN_SUCCESS':
        return <Badge variant="success">Đăng nhập thành công</Badge>;
      case 'AUTH_LOGIN_FAILED':
        return <Badge variant="danger">Đăng nhập thất bại</Badge>;
      case 'AUTH_LOGOUT':
        return <Badge variant="default">Đăng xuất</Badge>;
      case 'CHANGE_PASSWORD_SUCCESS':
        return <Badge variant="info">Đổi mật khẩu</Badge>;
      case 'CHANGE_PASSWORD_FAILED':
        return <Badge variant="danger">Đổi MK thất bại</Badge>;
      case 'CREATE_USER':
        return <Badge variant="purple">Tạo tài khoản</Badge>;
      case 'UPDATE_USER':
        return <Badge variant="warning">Cập nhật tài khoản</Badge>;
      case 'DELETE_USER':
        return <Badge variant="danger">Xóa tài khoản</Badge>;
      case 'RESET_PASSWORD':
        return <Badge variant="warning">Reset mật khẩu</Badge>;
      case 'CREATE_QUOTATION':
        return <Badge variant="success">Tạo đơn hàng</Badge>;
      case 'UPDATE_QUOTATION':
        return <Badge variant="info">Cập nhật đơn hàng</Badge>;
      case 'DELETE_QUOTATION':
        return <Badge variant="danger">Xóa đơn hàng</Badge>;
      case 'DUPLICATE_QUOTATION':
        return <Badge variant="purple">Nhân bản đơn hàng</Badge>;
      case 'EXPORT_PDF':
        return <Badge variant="default">Xuất file PDF</Badge>;
      default:
        return <Badge variant="default">{actionStr}</Badge>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderDetails = (detailsStr?: string | null) => {
    if (!detailsStr) return <span className="text-slate-400 italic">Không có chi tiết</span>;
    try {
      const parsed = JSON.parse(detailsStr);
      return (
        <pre className="text-xs bg-slate-900 text-emerald-300 p-4 rounded-xl overflow-x-auto font-mono">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">{detailsStr}</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-blue-600" />
            Nhật Ký Hoạt Động & Bảo Mật
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi chi tiết các thao tác đăng nhập, chỉnh sửa đơn hàng, đổi mật khẩu và quản lý hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Tìm theo tên, email, đối tượng..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftElement={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium"
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="AUTH_LOGIN_SUCCESS">Đăng nhập thành công</option>
              <option value="AUTH_LOGIN_FAILED">Đăng nhập thất bại</option>
              <option value="CHANGE_PASSWORD_SUCCESS">Đổi mật khẩu</option>
              <option value="CREATE_QUOTATION">Tạo đơn hàng</option>
              <option value="UPDATE_QUOTATION">Cập nhật đơn hàng</option>
              <option value="DELETE_QUOTATION">Xóa đơn hàng</option>
              <option value="DUPLICATE_QUOTATION">Nhân bản đơn hàng</option>
              <option value="EXPORT_PDF">Xuất file PDF</option>
              <option value="CREATE_USER">Tạo tài khoản</option>
              <option value="UPDATE_USER">Sửa tài khoản</option>
              <option value="DELETE_USER">Xóa tài khoản</option>
              <option value="RESET_PASSWORD">Reset mật khẩu</option>
            </select>
          </div>

          {/* Resource Filter */}
          <div>
            <select
              value={resource}
              onChange={(e) => {
                setResource(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium"
            >
              <option value="ALL">Tất cả phân hệ</option>
              <option value="QUOTATION">Đơn hàng (QUOTATION)</option>
              <option value="AUTH">Xác thực (AUTH)</option>
              <option value="USER">Tài khoản (USER)</option>
              <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
              <option value="PRODUCT">Sản phẩm (PRODUCT)</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              title="Từ ngày"
              className="w-full h-10 px-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              title="Đến ngày"
              className="w-full h-10 px-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            />
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !data?.data || data.data.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Không tìm thấy nhật ký hoạt động nào"
              description="Thử thay đổi bộ lọc tìm kiếm hoặc khoảng thời gian."
              icon={<ShieldAlert className="w-10 h-10 text-slate-400" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Người thực hiện</th>
                  <th className="py-3.5 px-4">Hành động</th>
                  <th className="py-3.5 px-4">Phân hệ</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data.data.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        {formatDateTime(log.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                          {log.userName ? log.userName.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                        </div>
                        <div className="truncate max-w-[180px]">
                          <div className="font-semibold text-slate-900 truncate">{log.userName || 'Hệ thống / Ẩn danh'}</div>
                          {log.userEmail && <div className="text-[11px] text-slate-400 truncate">{log.userEmail}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {log.resource}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-xs">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-400" />
                        {log.ipAddress || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLog(log)}
                        className="text-xs px-2.5 py-1"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Xem
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination && data.pagination.totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Trang <strong>{data.pagination.page}</strong> / <strong>{data.pagination.totalPages}</strong> ({data.pagination.total} bản ghi)
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Chi Tiết Nhật Ký Hoạt Động"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500 font-medium">Hành động:</span>
                <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Thời gian:</span>
                <p className="font-semibold text-slate-800 mt-1">{formatDateTime(selectedLog.createdAt)}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Người thực hiện:</span>
                <p className="font-semibold text-slate-800 mt-1">{selectedLog.userName || 'Hệ thống'} ({selectedLog.userEmail || 'N/A'})</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">IP Address:</span>
                <p className="font-mono text-slate-800 mt-1">{selectedLog.ipAddress || '—'}</p>
              </div>
              {selectedLog.resourceId && (
                <div className="col-span-2">
                  <span className="text-slate-500 font-medium">Resource ID:</span>
                  <p className="font-mono text-slate-800 mt-1">{selectedLog.resourceId}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Dữ liệu chi tiết (Payload / Context)
              </h4>
              {renderDetails(selectedLog.details)}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
