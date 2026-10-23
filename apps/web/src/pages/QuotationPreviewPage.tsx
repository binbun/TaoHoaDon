import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toBlob } from 'html-to-image';
import { useQuotation, useDuplicateQuotation } from '../hooks';
import { formatCurrency, formatNumber, formatDate, generateEmvcoQrPayload } from '@taohoadon/shared';
import { QRCodeSVG } from 'qrcode.react';
import { getFullApiUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Skeleton } from '../components/Skeleton';
import { PaymentFormModal } from '../components/PaymentFormModal';
import { PaymentHistory } from '../components/CustomerDebtModal';
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
  Check,
  ClipboardCheck,
  Wallet,
  Plus,
} from 'lucide-react';

export const QuotationPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'invoice' | 'delivery'>('invoice');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopyingPng, setIsCopyingPng] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Fetch Quotation Details & Duplicate Mutation from custom hooks
  const { data: quotation, isLoading, isError } = useQuotation(id);
  const duplicateMutation = useDuplicateQuotation();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    success(`Đã sao chép: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

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

  // Copy High-Resolution PNG directly to Clipboard (for instant Ctrl+V into Zalo / Chat)
  const handleCopyPng = async () => {
    if (!quotation) return;
    const isDelivery = activeTab === 'delivery';
    const targetEl = sheetRef.current;
    if (!targetEl) {
      error('Không tìm thấy khung hiển thị hóa đơn');
      return;
    }
    if (typeof window.ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      error('Trình duyệt không hỗ trợ sao chép ảnh trực tiếp');
      return;
    }

    try {
      setIsCopyingPng(true);
      info(`Đang tạo ảnh ${isDelivery ? 'Phiếu giao hàng' : 'Hóa đơn'} để sao chép...`);

      // Pass the promise synchronously to ClipboardItem so iOS Safari / Firefox keep the user gesture
      const blobPromise = toBlob(targetEl, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          boxShadow: 'none',
          margin: '0',
        },
      }).then((blob) => {
        if (!blob) {
          throw new Error('Không thể tạo dữ liệu ảnh');
        }
        return blob;
      });

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobPromise }),
      ]);
      success('Đã sao chép ảnh vào bộ nhớ tạm! Bạn có thể dán (Ctrl + V) ngay vào Zalo.');
    } catch (err: any) {
      console.error('Lỗi khi sao chép ảnh:', err);
      error(err.message || 'Không thể sao chép ảnh vào bộ nhớ tạm');
    } finally {
      setIsCopyingPng(false);
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
                variant="outline"
                size="sm"
                className="text-xs px-2.5 py-1.5 flex-shrink-0 font-medium text-slate-700 hover:text-emerald-700 hover:border-emerald-300 transition-colors shadow-2xs"
                leftIcon={
                  isCopyingPng ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                  )
                }
                onClick={handleCopyPng}
                disabled={isCopyingPng}
              >
                Sao chép ảnh
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sao chép ảnh vào bộ nhớ tạm để dán (Ctrl+V) ngay sang Zalo hoặc tin nhắn</TooltipContent>
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
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'invoice'
              ? 'bg-white text-[#14733E] shadow-sm font-bold border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
          >
            <FileText className="w-4 h-4 text-[#1B9550]" />
            <span>Hóa đơn khách hàng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'delivery'
              ? 'bg-white text-[#14733E] shadow-sm font-bold border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
          >
            <Truck className="w-4 h-4 text-[#1B9550]" />
            <span>Phiếu giao hàng / Kiểm hàng</span>
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

      {/* Payment Tracking (Hidden in Print) */}
      <div className="no-print bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-600" />
            Thanh toán đơn hàng
          </h2>
          <Button
            variant="primary"
            size="sm"
            className="text-xs justify-center"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsPaymentOpen(true)}
          >
            Ghi nhận thanh toán
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
            <div className="text-slate-500">Tiền đơn này</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{formatCurrency(quotation.orderAmount ?? 0)}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
            <div className="text-emerald-700">Đã trả</div>
            <div className="font-bold text-emerald-700 text-sm mt-0.5">{formatCurrency(quotation.paidAmount ?? 0)}</div>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
            <div className="text-amber-800">Đơn này còn nợ</div>
            <div className="font-bold text-amber-700 text-sm mt-0.5">{formatCurrency(quotation.remainingAmount ?? 0)}</div>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
            <div className="text-amber-800">{(quotation.customerDebt ?? 0) < 0 ? 'Khách trả dư' : 'Tổng nợ của khách'}</div>
            <div className="font-bold text-amber-700 text-sm mt-0.5">{formatCurrency(Math.abs(quotation.customerDebt ?? 0))}</div>
          </div>
        </div>

        <PaymentHistory
          customerId={quotation.customerId}
          payments={quotation.payments ?? []}
          emptyText="Chưa có khoản thanh toán nào cho đơn này"
        />
      </div>

      <PaymentFormModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        customerId={quotation.customerId}
        customerName={quotation.customer?.companyName}
        quotationId={quotation.id}
        quotationNumber={quotation.quotationNumber}
        suggestedAmount={quotation.remainingAmount ?? 0}
      />

      {/* Mobile Tip for A4 Sheet Viewing */}
      <div className="sm:hidden flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xl no-print">
        <Info className="w-4 h-4 text-[#1B9550] flex-shrink-0" />
        <span>Vuốt ngang để xem chi tiết toàn bộ bản in A4 hoặc bấm In/Tải PDF.</span>
      </div>

      {/* A4 Paper Sheet Preview Container */}
      <div className="a4-sheet-mobile-container">
        {activeTab === 'invoice' ? (
          /* ==================== TAB 1: CUSTOMER INVOICE (FULL PRICING & QR) ==================== */
          <div
            ref={sheetRef}
            className="a4-sheet font-sans text-slate-800 text-[12px] leading-relaxed select-text shadow-xl"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3 mb-4 gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/grob-logo.png"
                  alt="Logo GROB"
                  className="h-14 w-auto object-contain shrink-0"
                />
                <div>
                  <div className="text-[14px] font-black text-slate-900 uppercase tracking-tight leading-tight">
                    CÔNG TY TNHH ĐẦU TƯ KIM KHÍ THÔNG MINH VIỆT ĐỨC
                  </div>
                  <div className="text-[10.5px] text-slate-600 mt-1 font-medium">
                    Phân phối chính hãng: GROB - EUPLUS - EUROKING - KINGENBLU - BLUM
                  </div>
                </div>
              </div>
              <div className="text-right text-[10.5px] text-slate-600 bg-slate-50 border border-slate-200 p-2.5 rounded-lg leading-tight shrink-0">
                <div className="font-bold text-rose-600 text-[12px]">NPP BÍCH ĐIỀU</div>
                <div>Hotline: 0917 418 989 - 0945 636 567</div>
                <div>Zalo: 0348 932 347 - 0917 418 989</div>
                <div>Địa chỉ: Số 147 phố Hát, Thôn Đông Thành, xã Hát Môn, Tp. Hà Nội</div>
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="flex justify-between items-end mb-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {quotation.title || 'HÓA ĐƠN BÁN HÀNG'}
                </h1>
                <p className="text-xs text-slate-500">
                  Đơn hàng phụ kiện tủ bếp thông minh chính hãng
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-right text-xs text-slate-600 space-y-0.5">
                <div>Số đơn hàng: <strong className="text-slate-900">{quotation.quotationNumber}</strong></div>
                <div>Ngày lập: <strong className="text-slate-900">{formatDate(quotation.quotationDate)}</strong></div>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                Thông tin khách hàng
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
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
                <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase tracking-normal border-t border-slate-300 border-b-2 border-slate-400">
                  <th className="py-2.5 px-2 text-center w-10 whitespace-nowrap">STT</th>
                  <th className="py-2.5 px-2.5 text-left w-24 whitespace-nowrap">Mã sản phẩm</th>
                  <th className="py-2.5 px-3 text-left">Tên sản phẩm</th>
                  <th className="py-2.5 px-2 text-center w-12 whitespace-nowrap">ĐVT</th>
                  <th className="py-2.5 px-2 text-center w-12 whitespace-nowrap">SL</th>
                  <th className="py-2.5 px-2 text-right w-28 whitespace-nowrap">Đơn giá (đ)</th>
                  <th className="py-2.5 px-2.5 text-right w-32 whitespace-nowrap">Thành tiền (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[12px]">
                {items.map((item, index) => {
                  const productCode = item.productCodeSnapshot || (item as any).product?.code || '---';
                  return (
                    <tr key={item.id || index} className="align-top">
                      <td className="py-2.5 px-2 text-center text-slate-500 whitespace-nowrap">{index + 1}</td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 text-[11.5px] bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200 inline-block tracking-tight">
                          {productCode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 text-[12.5px]">{item.productNameSnapshot}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600 whitespace-nowrap">{item.unit || 'Bộ'}</td>
                      <td className="py-2.5 px-2 text-center font-medium whitespace-nowrap">{item.quantity}</td>
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        <div className="text-slate-700 font-medium">{formatNumber(item.unitPrice)}</div>
                        {item.discount > 0 && (
                          <div className="text-[10.5px] text-rose-600 font-medium whitespace-nowrap mt-0.5">
                            -{formatNumber(item.discountAmount ?? (item.quantity * item.unitPrice * (item.discount / 100)))} ({item.discount}%)
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap">{formatNumber(item.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-400 font-medium text-slate-700 text-[12px]">
                  <td
                    colSpan={5}
                    rowSpan={
                      2 +
                      (quotation.discountTotal > 0 ? 1 : 0) +
                      (quotation.vatTotal > 0 ? 1 : 0) +
                      (quotation.previousDebt && quotation.previousDebt > 0 ? 1 : 0)
                    }
                    className="py-2.5 px-2 align-top text-left"
                  >
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 rounded-xl p-3 max-w-[420px] shadow-xs">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200 shrink-0 shadow-xs">
                        <QRCodeSVG
                          value={generateEmvcoQrPayload({})}
                          size={105}
                          level="M"
                          marginSize={0}
                          title="Mã QR thanh toán"
                        />
                      </div>
                      <div className="text-[12px] text-slate-700 leading-relaxed space-y-1.5 flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-[12.5px] uppercase tracking-wide flex items-center justify-between whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#1B9550] inline-block shrink-0"></span>
                            Thông tin chuyển khoản
                          </span>
                        </div>
                        <div className="flex items-center justify-between whitespace-nowrap">
                          <span>STK: <strong className="text-slate-900 font-extrabold tracking-wider text-[13px]">19026197143010</strong></span>
                          <button
                            type="button"
                            onClick={() => handleCopy('19026197143010', 'stk')}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors shrink-0 ml-1"
                            title="Sao chép STK"
                            aria-label="Sao chép STK"
                          >
                            {copiedField === 'stk' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="whitespace-nowrap">Ngân hàng: <strong className="text-slate-900 font-bold">TECHCOMBANK</strong></div>
                        <div className="whitespace-nowrap">Chủ TK: <strong className="text-slate-900 font-bold uppercase">Tran Thi Bich Dieu</strong></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-medium text-slate-600">Tạm tính:</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap">{formatCurrency(quotation.subtotal)}</td>
                </tr>
                {quotation.discountTotal > 0 && (
                  <tr className="text-rose-600 text-[12px]">
                    <td className="py-1 px-2.5 text-right whitespace-nowrap">Tổng chiết khấu:</td>
                    <td className="py-1 px-2.5 text-right font-bold whitespace-nowrap">-{formatCurrency(quotation.discountTotal)}</td>
                  </tr>
                )}
                {quotation.vatTotal > 0 && (
                  <tr className="text-slate-700 text-[12px]">
                    <td className="py-1 px-2.5 text-right whitespace-nowrap">Thuế GTGT (VAT):</td>
                    <td className="py-1 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap">{formatCurrency(quotation.vatTotal)}</td>
                  </tr>
                )}
                {quotation.previousDebt && quotation.previousDebt > 0 ? (
                  <tr className="text-amber-800 bg-amber-50/60 font-semibold text-[12px]">
                    <td className="py-1.5 px-2.5 text-right whitespace-nowrap">Dư nợ cũ từ các đơn trước:</td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-amber-700 whitespace-nowrap">+{formatCurrency(quotation.previousDebt)}</td>
                  </tr>
                ) : null}
                <tr className="border-t border-slate-300 text-slate-900 text-[14px] font-black bg-emerald-50/40">
                  <td className="py-2.5 px-2.5 text-right uppercase whitespace-nowrap">TỔNG CỘNG:</td>
                  <td className="py-2.5 px-2.5 text-right text-[#1B9550] text-[16px] whitespace-nowrap">{formatCurrency(quotation.grandTotal)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Notes & Warranty Terms */}
            {quotation.note && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 text-[11.5px]">
                <div className="font-bold text-slate-800 uppercase tracking-wider mb-1.5 text-slate-800 text-xs">
                  Ghi chú & Chính sách bảo hành:
                </div>
                <div className="text-slate-600 whitespace-pre-line leading-relaxed">
                  {quotation.note}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-slate-200 text-[12px]">
              <div>
                <div className="font-bold text-slate-800 uppercase text-[12.5px]">KHÁCH HÀNG</div>
                <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
              </div>
              <div>
                <div className="font-bold text-slate-900 uppercase text-[12.5px]">NGƯỜI BÁN HÀNG</div>
                <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== TAB 2: DELIVERY CHECK SLIP (MATCHING USER SAMPLE IMAGE) ==================== */
          <div
            ref={sheetRef}
            className="a4-sheet font-sans text-slate-900 text-[12px] leading-relaxed select-text shadow-xl"
          >
            {/* Top Distributor Bar */}
            <div className="flex justify-between items-center border-b-2 border-[#1B9550] pb-2.5 mb-3.5 gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/grob-logo.png"
                  alt="Logo GROB"
                  className="h-12 w-auto object-contain shrink-0"
                />
                <div>
                  <div className="text-[14px] font-black text-slate-900 uppercase tracking-tight leading-tight">
                    CÔNG TY TNHH ĐẦU TƯ KIM KHÍ THÔNG MINH VIỆT ĐỨC
                  </div>
                  <div className="text-[10.5px] text-slate-600 font-medium mt-0.5">
                    Phân phối chính hãng: GROB - EUPLUS - EUROKING - KINGENBLU - BLUM
                  </div>
                </div>
              </div>
              <div className="text-right text-[10.5px] text-slate-600 leading-tight">
                <div>Hotline: <strong className="text-rose-600">0917 418 989 - 0945 636 567</strong></div>
                <div>ĐC: Số 147 phố Hát, Hát Môn, Hà Nội</div>
              </div>
            </div>

            {/* Centered Document Title matching User's Image:
                HÓA ĐƠN BÁN HÀNG
                số: ...
                Ngày ... tháng ... năm 2026 */}
            <div className="text-center my-3">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wide">
                HÓA ĐƠN BÁN HÀNG
              </h1>
              <div className="text-[13px] text-slate-700 font-medium mt-1">
                số: <strong className="font-bold text-slate-900 font-mono">{quotation.quotationNumber}</strong>
              </div>
              <div className="text-[12px] text-slate-600 italic mt-0.5">
                Ngày {day} tháng {month} năm {year}
              </div>
            </div>

            {/* Customer & Delivery Address Card */}
            <div className="bg-slate-50/80 border border-slate-300 rounded-lg p-3 mb-3.5 text-[12px]">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                <div>
                  <span className="text-slate-500 inline-block w-24">Khách hàng:</span>
                  <strong className="text-slate-900">{customer?.companyName || 'Khách hàng đại lý'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 inline-block w-24">Điện thoại:</span>
                  <strong className="text-slate-900">{customer?.phone || '---'}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 inline-block w-24">Địa chỉ giao:</span>
                  <span className="text-slate-800 font-medium">{customer?.address || '---'}</span>
                </div>
              </div>
            </div>

            {/* Delivery Items Table (Bordered grid matching photo: Stt | Mã hàng | Tên sản phẩm | ĐVT | Số lượng) */}
            <table className="w-full border-collapse mb-3.5 border border-slate-800">
              <thead>
                <tr className="bg-slate-100 text-slate-900 text-[12px] font-bold">
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
