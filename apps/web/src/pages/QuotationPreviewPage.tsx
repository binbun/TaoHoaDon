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
  ArrowLeft,
  Edit,
  Download,
  Printer,
  Copy,
  Loader2,
  FileQuestion,
  Info,
} from 'lucide-react';

export const QuotationPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error, info } = useToast();

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
      info('Đang sinh file PDF chuẩn A4 từ máy chủ Puppeteer...');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(getFullApiUrl(`/quotations/${quotation.id}/pdf`), {
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
      link.download = `Bao_Gia_EUPLUS_${quotation.quotationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      success(`Đã tải xuống file Bao_Gia_EUPLUS_${quotation.quotationNumber}.pdf`);
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
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Không tìm thấy báo giá</h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          Báo giá này không tồn tại trong hệ thống hoặc đã bị xóa. Vui lòng kiểm tra lại đường dẫn.
        </p>
        <Button variant="primary" onClick={() => navigate('/quotations')}>
          Quay lại danh sách báo giá
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
          <Button
            variant="outline"
            size="sm"
            className="text-xs px-2.5 py-1.5 flex-shrink-0"
            leftIcon={<Edit className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
          >
            Sửa
          </Button>

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

          <Button
            variant="outline"
            size="sm"
            className="text-xs px-2.5 py-1.5 hidden sm:inline-flex flex-shrink-0"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={handlePrint}
          >
            In nhanh
          </Button>

          <Button
            variant="primary"
            size="sm"
            className="text-xs px-3 py-1.5 shadow-xs shadow-blue-500/20 flex-shrink-0"
            leftIcon={isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Mobile Tip for A4 Sheet Viewing */}
      <div className="sm:hidden flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-xl no-print">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span>Vuốt ngang để xem chi tiết toàn bộ bản in A4 hoặc tải file PDF về iPhone.</span>
      </div>

      {/* A4 Paper Sheet Preview Container */}
      <div className="a4-sheet-mobile-container">
        <div className="a4-sheet font-sans text-slate-800 text-[11px] leading-relaxed select-text shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-blue-900 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-800 text-white font-black text-xl px-3 py-1.5 rounded-lg tracking-wider">
                EUPLUS
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 uppercase">
                  CÔNG TY TNHH ĐẦU TƯ KIM KHÍ THÔNG MINH VIỆT ĐỨC
                </div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">
                  Số nhà 1, ngách 298/77/30/21 Đ.Ngọc Hồi, T. Yên Ngưu, X.Đại Thanh, TP Hà Nội
                </div>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-600 bg-slate-50 border border-slate-200 p-2 rounded-lg leading-tight">
              <div className="font-bold text-rose-600">NHÀ PHÂN PHỐI: BÍCH ĐIỀU</div>
              <div>Hotline: 0917 418 989 - 0945 636 567</div>
              <div>ĐC: Số 147 phố Hát, Thôn Đông Thành, Hát Môn, Hà Nội</div>
            </div>
          </div>

          {/* Title & Metadata */}
          <div className="flex justify-between items-end mb-4">
            <div>
              <h1 className="text-lg font-black text-blue-900 uppercase tracking-tight">
                {quotation.title || 'BÁO GIÁ PHỤ KIỆN TỦ BẾP EUPLUS'}
              </h1>
              <p className="text-[11px] text-slate-500">
                Báo giá phụ kiện tủ bếp thông minh Inox SUS304 chính hãng
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-right text-[11px] text-slate-600 space-y-0.5">
              <div>Số báo giá: <strong className="text-slate-900">{quotation.quotationNumber}</strong></div>
              <div>Ngày lập: <strong className="text-slate-900">{formatDate(quotation.quotationDate)}</strong></div>
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-blue-700 border-b border-slate-200 pb-1 mb-2">
              Thông tin khách hàng
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
              <div>
                <span className="text-slate-500 inline-block w-28">Khách hàng:</span>
                <strong className="text-slate-900">{customer?.companyName || 'Khách hàng đại lý'}</strong>
              </div>
              <div>
                <span className="text-slate-500 inline-block w-28">Người đại diện:</span>
                <strong className="text-slate-900">{customer?.contactName || '---'}</strong>
              </div>
              <div>
                <span className="text-slate-500 inline-block w-28">Điện thoại:</span>
                <span>{customer?.phone || '---'}</span>
              </div>
              <div>
                <span className="text-slate-500 inline-block w-28">Email:</span>
                <span>{customer?.email || '---'}</span>
              </div>
              <div>
                <span className="text-slate-500 inline-block w-28">Địa chỉ công trình:</span>
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
                <th className="py-2 px-2.5 text-left">Tên sản phẩm / Phụ kiện tủ bếp</th>
                <th className="py-2 px-2.5 text-center w-16">ĐVT</th>
                <th className="py-2 px-2.5 text-center w-12">SL</th>
                <th className="py-2 px-2.5 text-right w-24">Đơn giá</th>
                <th className="py-2 px-2.5 text-right w-28">Thành tiền (đ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, index) => (
                <tr key={item.id || index} className="align-top">
                  <td className="py-2.5 px-2.5 text-center text-slate-500">{index + 1}</td>
                  <td className="py-2.5 px-2.5">
                    <div className="font-bold text-slate-900 text-[11.5px]">{item.productNameSnapshot}</div>
                    {item.descriptionSnapshot && (
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        {item.descriptionSnapshot}
                      </div>
                    )}
                    {item.discount > 0 && (
                      <div className="text-[9.5px] text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 inline-block mt-1">
                        Chiết khấu {item.discount}% (-{formatCurrency((item.discountAmount ?? (item.quantity * item.unitPrice * (item.discount / 100))) )})
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-center text-slate-600">{item.unit || 'Bộ'}</td>
                  <td className="py-2.5 px-2.5 text-center font-medium">{item.quantity}</td>
                  <td className="py-2.5 px-2.5 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-400 font-medium text-slate-700 text-[11px]">
                <td colSpan={5} className="py-2 px-2.5 text-right">Tạm tính (Subtotal):</td>
                <td className="py-2 px-2.5 text-right font-bold text-slate-900">{formatCurrency(quotation.subtotal)}</td>
              </tr>
              {quotation.discountTotal > 0 && (
                <tr className="text-rose-600 text-[11px]">
                  <td colSpan={5} className="py-1 px-2.5 text-right">Tổng chiết khấu:</td>
                  <td className="py-1 px-2.5 text-right font-bold">-{formatCurrency(quotation.discountTotal)}</td>
                </tr>
              )}
              {quotation.vatTotal > 0 && (
                <tr className="text-slate-700 text-[11px]">
                  <td colSpan={5} className="py-1 px-2.5 text-right">Thuế GTGT (VAT):</td>
                  <td className="py-1 px-2.5 text-right font-bold text-slate-900">{formatCurrency(quotation.vatTotal)}</td>
                </tr>
              )}
              {quotation.previousDebt && quotation.previousDebt > 0 ? (
                <tr className="text-amber-800 bg-amber-50/60 font-semibold text-[11px]">
                  <td colSpan={5} className="py-1.5 px-2.5 text-right">Dư nợ cũ từ các đơn trước:</td>
                  <td className="py-1.5 px-2.5 text-right font-bold text-amber-700">+{formatCurrency(quotation.previousDebt)}</td>
                </tr>
              ) : null}
              <tr className="border-t border-slate-300 text-blue-900 text-[13px] font-black bg-blue-50/50">
                <td colSpan={5} className="py-2.5 px-2.5 text-right uppercase">TỔNG CỘNG THANH TOÁN:</td>
                <td className="py-2.5 px-2.5 text-right text-blue-700 text-[14px]">{formatCurrency(quotation.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Notes & Warranty Terms */}
          {quotation.note && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 text-[10.5px]">
              <div className="font-bold text-slate-800 uppercase tracking-wider mb-1.5 text-blue-800">
                Ghi chú & Chính sách bảo hành EUPLUS:
              </div>
              <div className="text-slate-600 whitespace-pre-line leading-relaxed">
                {quotation.note}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-slate-200 text-[11px]">
            <div>
              <div className="font-bold text-slate-800 uppercase">ĐẠI DIỆN KHÁCH HÀNG</div>
              <div className="text-[10px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên & đóng dấu)</div>
              <div className="h-16"></div>
              <div className="font-semibold text-slate-700">{customer?.contactName || '---'}</div>
            </div>
            <div>
              <div className="font-bold text-blue-900 uppercase">ĐẠI DIỆN NPP BÍCH ĐIỀU - EUPLUS</div>
              <div className="text-[10px] text-slate-400 italic mt-0.5">(Ký & xác nhận giao hàng)</div>
              <div className="h-16"></div>
              <div className="font-bold text-slate-900">Trần Thị Bích Điều</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
