import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '../hooks';
import { formatCurrency, formatDate } from '@taohoadon/shared';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Skeleton } from '../components/Skeleton';
import {
  FileText,
  Calendar,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-4 sm:p-8 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-blue-800/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hệ thống báo giá EUPLUS Kitchen</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Xin chào, NPP Bích Điều! 👋</h1>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Quản lý báo giá phụ kiện tủ bếp thông minh Inox 304, module tủ bếp cao cấp và xuất file PDF chuẩn A4 gửi đối tác/đại lý nhanh chóng.
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          className="bg-white text-blue-900 hover:bg-blue-50 font-bold shadow-md self-stretch sm:self-auto justify-center"
          leftIcon={<PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />}
          onClick={() => navigate('/quotations/new')}
        >
          + Tạo báo giá mới
        </Button>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Card className="border-l-4 border-l-blue-500 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Báo Giá</p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mt-2" />
              ) : (
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  {stats?.totalQuotations || 0}
                </h3>
              )}
            </div>
            <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tháng Này</p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mt-2" />
              ) : (
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  {stats?.monthQuotations || 0}
                </h3>
              )}
            </div>
            <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Doanh Số</p>
              {isLoading ? (
                <Skeleton className="h-7 w-28 mt-2" />
              ) : (
                <h3 className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1 truncate">
                  {formatCurrency(stats?.totalGrandTotal || 0)}
                </h3>
              )}
            </div>
            <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã Thanh Toán</p>
              {isLoading ? (
                <Skeleton className="h-7 w-28 mt-2" />
              ) : (
                <h3 className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1 truncate">
                  {formatCurrency(stats?.acceptedGrandTotal || 0)}
                </h3>
              )}
            </div>
            <div className="p-2.5 sm:p-3 bg-amber-50 text-amber-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Quotations Table */}
      <Card
        title="Báo Giá Gần Đây"
        subtitle="Danh sách các báo giá phụ kiện và tủ bếp vừa được lập"
        action={
          <Button
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm px-2 sm:px-3"
            rightIcon={<ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            onClick={() => navigate('/quotations')}
          >
            Xem tất cả
          </Button>
        }
      >
        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : stats?.recentQuotations && stats.recentQuotations.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-[600px] sm:min-w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 sm:px-4">Số báo giá</th>
                    <th className="py-3 px-3 sm:px-4">Khách hàng / Đại lý</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Tổng tiền</th>
                    <th className="py-3 px-3 sm:px-4">Ngày lập</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentQuotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 sm:px-4 font-bold text-blue-600">
                        <span
                          onClick={() => navigate(`/quotations/${q.id}/preview`)}
                          className="cursor-pointer hover:underline"
                        >
                          {q.quotationNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 font-medium text-slate-900">
                        {q.customer?.companyName || '---'}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(q.grandTotal)}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(q.quotationDate)}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                        <Badge status={q.status} />
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs px-2.5 py-1"
                          leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                          onClick={() => navigate(`/quotations/${q.id}/preview`)}
                        >
                          Xem
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-sm">
            Chưa có báo giá nào được tạo. Hãy bấm <strong>+ Tạo báo giá mới</strong> để bắt đầu.
          </div>
        )}
      </Card>
    </div>
  );
};
