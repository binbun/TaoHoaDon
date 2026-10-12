import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuotation, useDuplicateQuotation } from '../hooks';
import { formatCurrency, formatDate } from '@taohoadon/shared';
import { getFullApiUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Skeleton } from '../components/Skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../components/ui/tooltip';
import {
  ArrowLeft,
  Edit,
  Download,
  Printer,
  Copy,
  Loader2,
  FileQuestion,
  Info,
  FileText,
  Truck,
  CheckCircle2,
} from 'lucide-react';

export const QuotationPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'invoice' | 'delivery'>('invoice');
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch Quotation Details & Duplicate Mutation from custom hooks
  const { data: quotation, isLoading, isError } = useQuotation(id);
  const duplicateMutation = useDuplicateQuotation();

  const handleDuplicate = () => {
    if (id) {
      duplicateMutation.mutate(id, {
        onSuccess: (newQuote) => navigate(`/quotations/${newQuote.id}/preview`),
      });
    }
  };

  // Download Server-Side Puppeteer PDF
  const handleDownloadPdf = async () => {
    if (!quotation) return;
    try {
      setIsDownloading(true);
      const isDelivery = activeTab === 'delivery';
      info(`Đang xuất file PDF ${isDelivery ? 'Phiếu giao hàng' : 'Hóa đơn'} từ máy chủ...`);

      const token = localStorage.getItem('auth_token');
      const url = getFullApiUrl(`/quotations/${quotation.id}/pdf${isDelivery ? '?type=delivery' : ''}`);
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Lỗi khi tải file PDF từ máy chủ');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const safeNum = quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = isDelivery ? `Phieu_Giao_Hang_${safeNum}.pdf` : `Don_Hang_${safeNum}.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      success(`Đã tải xuống ${filename}`);
    } catch (err: any) {
      error(err.message || 'Không thể xuất file PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // If Error / Not Found
  if (isError || (!isLoading && !quotation)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-200 my-8 max-w-lg mx-auto shadow-sm">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-full mb-4">
          <FileQuestion className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Không tìm thấy đơn hàng</h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          Đơn hàng này không tồn tại trong hệ thống hoặc đã bị xóa. Vui lòng kiểm tra lại đường dẫn.
        </p>
        <Button variant="primary" onClick={() => navigate('/quotations')}>
          Quay lại danh sách đơn hàng
        </Button>
      </div>
    );
  }

  if (isLoading || !quotation) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px] sm:h-[800px] w-full max-w-[210mm] mx-auto" />
      </div>
    );
  }

  const customer = quotation.customer;
  const items = quotation.items || [];

  // Parse Date Components for Delivery Sheet (Ngày ... tháng ... năm ...)
  const dateObj = new Date(quotation.quotationDate);
  const day = !isNaN(dateObj.getTime()) ? String(dateObj.getDate()).padStart(2, '0') : '.....';
  const month = !isNaN(dateObj.getTime()) ? String(dateObj.getMonth() + 1).padStart(2, '0') : '.....';
  const year = !isNaN(dateObj.getTime()) ? String(dateObj.getFullYear()) : '2026';

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="no-print bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs px-2.5 py-1.5"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/quotations')}
          >
            Quay lại
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs sm:text-sm text-slate-900">{quotation.quotationNumber}</span>
            <Badge status={quotation.status} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2.5 py-1.5 flex-shrink-0"
                leftIcon={<Edit className="w-3.5 h-3.5" />}
                onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
              >
                Sửa
              </Button>
            </TooltipTrigger>
            <TooltipContent>Chỉnh sửa đơn hàng</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2.5 py-1.5 flex-shrink-0"
                leftIcon={<Copy className="w-3.5 h-3.5" />}
                onClick={handleDuplicate}
                isLoading={duplicateMutation.isPending}
              >
                Nhân bản
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tạo bản sao mới</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2.5 py-1.5 hidden sm:inline-flex flex-shrink-0 font-medium text-slate-700"
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                onClick={handlePrint}
              >
                {activeTab === 'delivery' ? 'In phiếu giao hàng' : 'In hóa đơn'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>In trực tiếp từ trình duyệt mẫu đang xem</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="primary"
                size="sm"
                className="text-xs px-3 py-1.5 shadow-xs shadow-[#1B9550]/20 flex-shrink-0"
                leftIcon={isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                {activeTab === 'delivery' ? 'Tải PDF giao hàng' : 'Download PDF'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Xuất file PDF chuẩn A4 mẫu đang xem</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Document Type Switcher Tabs (Hidden in Print) */}
      <div className="no-print bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeTab === 'invoice'
                ? 'bg-white text-[#14733E] shadow-sm font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className="w-4 h-4 text-[#1B9550]" />
            <span>Hóa đơn khách hàng</span>
            <span className="text-[10.5px] bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded-md font-medium">
              Đầy đủ giá & QR
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeTab === 'delivery'
                ? 'bg-white text-[#14733E] shadow-sm font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Truck className="w-4 h-4 text-[#1B9550]" />
            <span>Phiếu giao hàng / Kiểm hàng</span>
            <span className="text-[10.5px] bg-emerald-100 text-[#14733E] px-1.5 py-0.5 rounded-md font-bold">
              Theo mẫu ảnh
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 hidden md:flex items-center gap-1.5 pr-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#1B9550]" />
          <span>
            {activeTab === 'delivery'
              ? 'Mẫu gọn gàng ẩn giá tiền & công nợ, chuyên dùng để kiểm đếm bàn giao hàng'
              : 'Mẫu đầy đủ chi tiết đơn giá, chiết khấu, VAT, nợ cũ và thông tin chuyển khoản'}
          </span>
        </div>
      </div>

      {/* Mobile Tip for A4 Sheet Viewing */}
      <div className="sm:hidden flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xl no-print">
        <Info className="w-4 h-4 text-[#1B9550] flex-shrink-0" />
        <span>Vuốt ngang để xem chi tiết toàn bộ bản in A4 hoặc bấm In/Tải PDF.</span>
      </div>

      {/* A4 Paper Sheet Preview Container */}
      <div className="a4-sheet-mobile-container">
        {activeTab === 'invoice' ? (
          /* ==================== TAB 1: CUSTOMER INVOICE (FULL PRICING & QR) ==================== */
          <div className="a4-sheet font-sans text-slate-800 text-[11px] leading-relaxed select-text shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3 mb-4 gap-3">
              <div className="flex items-center gap-3.5">
                <div className="bg-[#1B9550] text-white font-black text-xl px-5 py-2 rounded-lg tracking-wider whitespace-nowrap shrink-0 border-2 border-[#14733E] print:border-slate-800 shadow-sm flex items-center justify-center min-w-[140px]">
                  BÍCH ĐIỀU
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase">
                    NHÀ PHÂN PHỐI PHỤ KIỆN TỦ BẾP & TỦ BẾP THÔNG MINH
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5 font-medium">
                    Phân phối chính hãng: GRÖB • EUPLUS • KINGENBLU
                  </div>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-600 bg-slate-50 border border-slate-200 p-2 rounded-lg leading-tight shrink-0">
                <div className="font-bold text-rose-600">NPP BÍCH ĐIỀU</div>
                <div>Hotline: 0917 418 989 - 0945 636 567</div>
                <div>ĐC: Số 147 phố Hát, Thôn Đông Thành, Hát Môn, Hà Nội</div>
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="flex justify-between items-end mb-4">
              <div>
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  {quotation.title || 'HÓA ĐƠN BÁN HÀNG'}
                </h1>
                <p className="text-[11px] text-slate-500">
                  Đơn hàng phụ kiện tủ bếp thông minh chính hãng
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-right text-[11px] text-slate-600 space-y-0.5">
                <div>Số đơn hàng: <strong className="text-slate-900">{quotation.quotationNumber}</strong></div>
                <div>Ngày lập: <strong className="text-slate-900">{formatDate(quotation.quotationDate)}</strong></div>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                Thông tin khách hàng
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                <div>
                  <span className="text-slate-500 inline-block w-28">Khách hàng:</span>
                  <strong className="text-slate-900">{customer?.companyName || 'Khách hàng đại lý'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 inline-block w-28">Điện thoại:</span>
                  <span>{customer?.phone || '---'}</span>
                </div>
                <div>
                  <span className="text-slate-500 inline-block w-28">Địa chỉ giao hàng:</span>
                  <span>{customer?.address || '---'}</span>
                </div>
                <div>
                  <span className="text-slate-500 inline-block w-28">Mã số thuế:</span>
                  <span>{customer?.taxCode || '---'}</span>
                </div>
              </div>
            </div>

            {/* Table of Items */}
            <table className="w-full border-collapse mb-4">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-[10.5px] font-bold uppercase tracking-wider border-t border-slate-300 border-b-2 border-slate-400">
                  <th className="py-2 px-2.5 text-center w-8">STT</th>
                  <th className="py-2 px-2.5 text-left w-28">Mã sản phẩm</th>
                  <th className="py-2 px-2.5 text-left">Tên sản phẩm</th>
                  <th className="py-2 px-2.5 text-center w-14">ĐVT</th>
                  <th className="py-2 px-2.5 text-center w-12">SL</th>
                  <th className="py-2 px-2.5 text-right w-24">Đơn giá</th>
                  <th className="py-2 px-2.5 text-right w-28">Thành tiền (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, index) => {
                  const productCode = item.productCodeSnapshot || (item as any).product?.code || '---';
                  return (
                    <tr key={item.id || index} className="align-top">
                      <td className="py-2.5 px-2.5 text-center text-slate-500">{index + 1}</td>
                      <td className="py-2.5 px-2.5">
                        <span className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200 inline-block tracking-tight">
                          {productCode}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className="font-bold text-slate-900 text-[11.5px]">{item.productNameSnapshot}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-slate-600">{item.unit || 'Bộ'}</td>
                      <td className="py-2.5 px-2.5 text-center font-medium">{item.quantity}</td>
                      <td className="py-2.5 px-2.5 text-right">
                        <div className="text-slate-700">{formatCurrency(item.unitPrice)}</div>
                        {item.discount > 0 && (
                          <div className="text-[9.5px] text-rose-600 font-medium whitespace-nowrap mt-0.5">
                            -{formatCurrency(item.discountAmount ?? (item.quantity * item.unitPrice * (item.discount / 100)))} ({item.discount}%)
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-400 font-medium text-slate-700 text-[11px]">
                  <td
                    colSpan={4}
                    rowSpan={
                      2 +
                      (quotation.discountTotal > 0 ? 1 : 0) +
                      (quotation.vatTotal > 0 ? 1 : 0) +
                      (quotation.previousDebt && quotation.previousDebt > 0 ? 1 : 0)
                    }
                    className="py-2.5 px-2 align-top text-left"
                  >
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 max-w-[360px] shadow-xs">
                      <div className="bg-white p-1 rounded-lg border border-slate-200 shrink-0 shadow-xs">
                        <img
                          src="/payment-qr.png"
                          alt="Mã QR thanh toán VietQR Techcombank"
                          className="w-[82px] h-[96px] object-contain"
                        />
                      </div>
                      <div className="text-[10px] text-slate-600 leading-tight space-y-1">
                        <div className="font-bold text-slate-800 text-[10.5px] uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1B9550] inline-block"></span>
                          Thông tin chuyển khoản
                        </div>
                        <div>STK: <strong className="text-slate-900 font-bold tracking-wider text-[11px]">19026197143010</strong></div>
                        <div>Ngân hàng: <strong className="text-slate-900 font-semibold">Techcombank</strong></div>
                        <div>Chủ TK: <strong className="text-slate-900 font-semibold uppercase">Tran Thi Bich Dieu</strong></div>
                      </div>
                    </div>
                  </td>
                  <td colSpan={2} className="py-2 px-2.5 text-right">Tạm tính:</td>
                  <td className="py-2 px-2.5 text-right font-bold text-slate-900">{formatCurrency(quotation.subtotal)}</td>
                </tr>
                {quotation.discountTotal > 0 && (
                  <tr className="text-rose-600 text-[11px]">
                    <td colSpan={2} className="py-1 px-2.5 text-right">Tổng chiết khấu:</td>
                    <td className="py-1 px-2.5 text-right font-bold">-{formatCurrency(quotation.discountTotal)}</td>
                  </tr>
                )}
                {quotation.vatTotal > 0 && (
                  <tr className="text-slate-700 text-[11px]">
                    <td colSpan={2} className="py-1 px-2.5 text-right">Thuế GTGT (VAT):</td>
                    <td className="py-1 px-2.5 text-right font-bold text-slate-900">{formatCurrency(quotation.vatTotal)}</td>
                  </tr>
                )}
                {quotation.previousDebt && quotation.previousDebt > 0 ? (
                  <tr className="text-amber-800 bg-amber-50/60 font-semibold text-[11px]">
                    <td colSpan={2} className="py-1.5 px-2.5 text-right">Dư nợ cũ từ các đơn trước:</td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-amber-700">+{formatCurrency(quotation.previousDebt)}</td>
                  </tr>
                ) : null}
                <tr className="border-t border-slate-300 text-slate-900 text-[13px] font-black bg-emerald-50/40">
                  <td colSpan={2} className="py-2.5 px-2.5 text-right uppercase">TỔNG CỘNG THANH TOÁN:</td>
                  <td className="py-2.5 px-2.5 text-right text-[#1B9550] text-[14px]">{formatCurrency(quotation.grandTotal)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Notes & Warranty Terms */}
            {quotation.note && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 text-[10.5px]">
                <div className="font-bold text-slate-800 uppercase tracking-wider mb-1.5 text-slate-800">
                  Ghi chú & Chính sách bảo hành:
                </div>
                <div className="text-slate-600 whitespace-pre-line leading-relaxed">
                  {quotation.note}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-slate-200 text-[11px]">
              <div>
                <div className="font-bold text-slate-800 uppercase">KHÁCH HÀNG</div>
                <div className="text-[10px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
              </div>
              <div>
                <div className="font-bold text-slate-900 uppercase">NGƯỜI BÁN HÀNG</div>
                <div className="text-[10px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== TAB 2: DELIVERY CHECK SLIP (MATCHING USER SAMPLE IMAGE) ==================== */
          <div className="a4-sheet font-sans text-slate-900 text-[11px] leading-relaxed select-text shadow-xl">
            {/* Top Distributor Bar */}
            <div className="flex justify-between items-center border-b-2 border-[#1B9550] pb-2.5 mb-3.5 gap-3">
              <div>
                <div className="text-sm font-black text-[#14733E] uppercase tracking-wide">
                  NPP BÍCH ĐIỀU
                </div>
                <div className="text-[9.5px] text-slate-500 font-medium">
                  Phụ kiện tủ bếp thông minh chính hãng GRÖB • EUPLUS • KINGENBLU
                </div>
              </div>
              <div className="text-right text-[9.5px] text-slate-600 leading-tight">
                <div>Hotline: <strong className="text-rose-600">0917 418 989 - 0945 636 567</strong></div>
                <div>ĐC: Số 147 phố Hát, Hát Môn, Hà Nội</div>
              </div>
            </div>

            {/* Centered Document Title matching User's Image:
                HÓA ĐƠN BÁN HÀNG
                số: ...
                Ngày ... tháng ... năm 2026 */}
            <div className="text-center my-3">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
                HÓA ĐƠN BÁN HÀNG
              </h1>
              <div className="text-xs text-slate-700 font-medium mt-1">
                số: <strong className="font-bold text-slate-900 font-mono">{quotation.quotationNumber}</strong>
              </div>
              <div className="text-[11.5px] text-slate-600 italic mt-0.5">
                Ngày {day} tháng {month} năm {year}
              </div>
            </div>

            {/* Customer & Delivery Address Card */}
            <div className="bg-slate-50/80 border border-slate-300 rounded-lg p-3 mb-3.5 text-[11px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                <div>
                  <span className="text-slate-500 inline-block w-24">Khách hàng:</span>
                  <strong className="text-slate-900">{customer?.companyName || 'Khách hàng đại lý'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 inline-block w-24">Điện thoại:</span>
                  <strong className="text-slate-900">{customer?.phone || '---'}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 inline-block w-24">Địa chỉ giao:</span>
                  <span className="text-slate-800 font-medium">{customer?.address || '---'}</span>
                </div>
                {quotation.note && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 inline-block w-24">Ghi chú giao:</span>
                    <span className="text-slate-700 italic">{quotation.note}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Items Table (Bordered grid matching photo: Stt | Mã hàng | Tên sản phẩm | ĐVT | Số lượng) */}
            <table className="w-full border-collapse mb-3.5 border border-slate-800">
              <thead>
                <tr className="bg-slate-100 text-slate-900 text-[11px] font-bold">
                  <th className="py-2 px-2 text-center w-12 border border-slate-800">Stt</th>
                  <th className="py-2 px-2.5 text-center w-36 border border-slate-800">Mã hàng</th>
                  <th className="py-2 px-3 text-center border border-slate-800">Tên sản phẩm</th>
                  <th className="py-2 px-2 text-center w-16 border border-slate-800">ĐVT</th>
                  <th className="py-2 px-2 text-center w-24 border border-slate-800">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const productCode = item.productCodeSnapshot || (item as any).product?.code || '---';
                  return (
                    <tr key={item.id || index} className="align-middle">
                      <td className="py-2 px-2 text-center text-slate-600 border border-slate-800 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-900 border border-slate-800">
                        {productCode}
                      </td>
                      <td className="py-2 px-3 text-left font-semibold text-slate-900 border border-slate-800">
                        {item.productNameSnapshot}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-700 border border-slate-800">
                        {item.unit || 'Bộ'}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900 text-xs border border-slate-800">
                        {item.quantity}
                      </td>
                    </tr>
                  );
                })}
                {/* Blank rows matching user sample image to fill out grid */}
                {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, idx) => (
                  <tr key={`blank-${idx}`} className="h-7">
                    <td className="py-1 px-2 text-center text-slate-300 border border-slate-800">
                      {items.length + idx + 1}
                    </td>
                    <td className="py-1 px-2.5 border border-slate-800"></td>
                    <td className="py-1 px-3 border border-slate-800"></td>
                    <td className="py-1 px-2 border border-slate-800"></td>
                    <td className="py-1 px-2 border border-slate-800"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total items & quantity summary */}
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 mb-5">
              <div>
                Tổng số mặt hàng: <strong className="text-slate-900 font-bold">{items.length}</strong>
              </div>
              <div>
                Tổng số lượng sản phẩm bàn giao: <strong className="text-[#14733E] font-bold text-xs">{items.reduce((sum, it) => sum + (it.quantity || 0), 0)}</strong>
              </div>
            </div>

            {/* Signatures matching photo: Khách hàng (left) & Người bán hàng (right) */}
            <div className="grid grid-cols-2 gap-8 text-center pt-2 text-[11px]">
              <div>
                <div className="font-bold text-slate-900">Khách hàng</div>
                <div className="text-[10px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-20"></div>
              </div>
              <div>
                <div className="font-bold text-slate-900">Người bán hàng</div>
                <div className="text-[10px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-20"></div>
              </div>
            </div>

            {/* Small Footer Notice */}
            <div className="text-center text-[9.5px] text-slate-400 mt-5 border-t border-dashed border-slate-200 pt-2.5">
              * Quý khách vui lòng kiểm đếm kỹ chủng loại, mã hàng và số lượng trước khi nhận bàn giao.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
