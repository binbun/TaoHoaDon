import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys } from '../hooks/useProducts';
import { Modal } from './Modal';
import { Button } from './Button';
import { BrandBadge } from './BrandBadge';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '@taohoadon/shared';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface ProductExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  index: number;
  code: string;
  oldCode?: string;
  unit: string;
  brand: string;
  category: string;
  name: string;
  cabinetWidth?: string;
  dimensions?: string;
  shortDescription?: string;
  price: number;
  isValid: boolean;
  errors: string[];
}

export const ProductExcelImportModal: React.FC<ProductExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error, info } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'ERRORS'>('ALL');
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 1. Download Excel Template (Exact 10 fields matching "Thêm Sản Phẩm Mới")
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          'Mã hàng chính (*)': 'C1EC.70B',
          'Mã cũ (Catalogue)': 'GP1-70',
          'Đơn vị tính (*)': 'Bộ',
          'Hãng sản xuất / Thương hiệu': 'GROB',
          'Danh mục phân loại': 'Phụ kiện tủ bếp',
          'Tên sản phẩm / Quy cách (*)': 'Giá bát nâng hạ thông minh SUS304 - KT 700',
          'Khoang tủ (mm)': '700',
          'Kích thước lắp đặt (R*S*C)': 'W665*D280*H650',
          'Mô tả chi tiết / Đặc tính & bảo hành': 'Inox 304 bảo hành gỉ vĩnh viễn, ray giảm chấn, bảo hành 24 tháng',
          'Đơn giá phân phối / Đại lý (đ) (*)': 2887500,
        },
        {
          'Mã hàng chính (*)': 'EP-800',
          'Mã cũ (Catalogue)': '',
          'Đơn vị tính (*)': 'Bộ',
          'Hãng sản xuất / Thương hiệu': 'EUPLUS',
          'Danh mục phân loại': 'Giá xoong nồi & bát đĩa',
          'Tên sản phẩm / Quy cách (*)': 'Giá để xoong nồi nan dẹt Inox 304 EUPLUS - KT 800',
          'Khoang tủ (mm)': '800',
          'Kích thước lắp đặt (R*S*C)': 'W765*D450*H175',
          'Mô tả chi tiết / Đặc tính & bảo hành': 'Inox 304 nan dẹt kèm ray âm giảm chấn, bảo hành 24 tháng',
          'Đơn giá phân phối / Đại lý (đ) (*)': 1850000,
        },
        {
          'Mã hàng chính (*)': '20K2E00',
          'Mã cũ (Catalogue)': '',
          'Đơn vị tính (*)': 'Bộ',
          'Hãng sản xuất / Thương hiệu': 'BLUM',
          'Danh mục phân loại': 'Ray - Bản lề - Tay nâng',
          'Tên sản phẩm / Quy cách (*)': 'Bộ cơ cấu tay nâng Blum Aventos HF 25',
          'Khoang tủ (mm)': '',
          'Kích thước lắp đặt (R*S*C)': 'Hệ số lực 5350 - 10150',
          'Mô tả chi tiết / Đặc tính & bảo hành': 'Tay nâng cánh đôi Blum chính hãng nhập khẩu Áo',
          'Đơn giá phân phối / Đại lý (đ) (*)': 3450000,
        },
        {
          'Mã hàng chính (*)': 'EK-600',
          'Mã cũ (Catalogue)': '',
          'Đơn vị tính (*)': 'Bộ',
          'Hãng sản xuất / Thương hiệu': 'EUROKING',
          'Danh mục phân loại': 'Giá dao thớt & gia vị',
          'Tên sản phẩm / Quy cách (*)': 'Giá dao thớt gia vị đa năng EUROKING - KT 600',
          'Khoang tủ (mm)': '600',
          'Kích thước lắp đặt (R*S*C)': 'W560*D475*H460',
          'Mô tả chi tiết / Đặc tính & bảo hành': 'Chất liệu Inox SUS304 nan tròn có khay hứng nước, bảo hành 24 tháng',
          'Đơn giá phân phối / Đại lý (đ) (*)': 1650000,
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);

      // Optimal column widths for readability
      ws['!cols'] = [
        { wch: 18 }, // Mã hàng chính (*)
        { wch: 18 }, // Mã cũ (Catalogue)
        { wch: 14 }, // Đơn vị tính (*)
        { wch: 26 }, // Hãng sản xuất / Thương hiệu
        { wch: 24 }, // Danh mục phân loại
        { wch: 45 }, // Tên sản phẩm / Quy cách (*)
        { wch: 16 }, // Khoang tủ (mm)
        { wch: 26 }, // Kích thước lắp đặt (R*S*C)
        { wch: 55 }, // Mô tả chi tiết / Đặc tính & bảo hành
        { wch: 30 }, // Đơn giá phân phối / Đại lý (đ) (*)
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_San_Pham');

      XLSX.writeFile(wb, 'Mau_Nhap_San_Pham_Phu_Kien.xlsx');
      info('Đã tải xuống file Excel mẫu thành công.');
    } catch (err: any) {
      error('Không thể tạo file mẫu: ' + err.message);
    }
  };

  // 2. Parse Number Safely
  const parseNum = (val: any, fallback = 0): number => {
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    if (!val) return fallback;
    const str = String(val).replace(/[\s.₫đ,]/g, '').trim();
    const parsed = parseFloat(str);
    return isNaN(parsed) ? fallback : parsed;
  };

  // 3. Process Uploaded File
  const processFile = (file: File) => {
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      error('Vui lòng chọn file Excel định dạng .xlsx, .xls hoặc .csv');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawData || rawData.length === 0) {
          error('File Excel không có dữ liệu dòng nào.');
          setParsedRows([]);
          return;
        }

        const seenCodes = new Set<string>();
        const rows: ParsedRow[] = [];

        rawData.forEach((row, idx) => {
          // Flexible key lookup for header columns
          const getVal = (...keys: string[]): string => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find(
                (rk) => rk.trim().toLowerCase() === k.toLowerCase()
              );
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
                return String(row[foundKey]).trim();
              }
            }
            return '';
          };

          const code = getVal(
            'Mã hàng chính (*)',
            'Mã hàng chính',
            'Mã hàng',
            'Mã sản phẩm (*)',
            'Mã sản phẩm',
            'Mã SP',
            'Code'
          ).toUpperCase();

          const oldCode = getVal(
            'Mã cũ (Catalogue)',
            'Mã cũ (Catalogue)',
            'Mã cũ',
            'Mã catalogue',
            'Old Code'
          );

          const unit = getVal(
            'Đơn vị tính (*)',
            'Đơn vị tính',
            'ĐVT',
            'Unit'
          ) || 'Bộ';

          const brand = getVal(
            'Hãng sản xuất / Thương hiệu',
            'Hãng sản xuất',
            'Thương hiệu',
            'Hãng (*)',
            'Hãng',
            'Brand'
          ) || 'GROB';

          const category = getVal(
            'Danh mục phân loại',
            'Danh mục',
            'Phân loại',
            'Category',
            'Loại'
          ) || 'Phụ kiện tủ bếp';

          const name = getVal(
            'Tên sản phẩm / Quy cách (*)',
            'Tên sản phẩm / Quy cách',
            'Tên sản phẩm (*)',
            'Tên sản phẩm',
            'Tên SP',
            'Tên hàng',
            'Quy cách',
            'Name'
          );

          const cabinetWidth = getVal(
            'Khoang tủ (mm)',
            'Khoang tủ',
            'Kích thước khoang tủ',
            'Cabinet Width'
          );

          const dimensions = getVal(
            'Kích thước lắp đặt (R*S*C)',
            'Kích thước lắp đặt',
            'Kích thước (R*S*C)',
            'Kích thước',
            'Quy cách / Kích thước',
            'Dimensions'
          );

          const shortDescription = getVal(
            'Mô tả chi tiết / Đặc tính & bảo hành',
            'Mô tả chi tiết',
            'Đặc tính & bảo hành',
            'Mô tả',
            'Ghi chú',
            'Description'
          );

          const rawPrice = getVal(
            'Đơn giá phân phối / Đại lý (đ) (*)',
            'Đơn giá phân phối / Đại lý (đ)',
            'Đơn giá phân phối',
            'Giá phân phối',
            'Giá đại lý',
            'Giá bán (*)',
            'Giá bán',
            'Đơn giá',
            'Price'
          );

          const price = parseNum(rawPrice, 0);

          // Validation
          const errorsList: string[] = [];
          if (!code) {
            errorsList.push('Thiếu mã hàng chính');
          } else if (seenCodes.has(code)) {
            errorsList.push('Mã hàng trùng lặp trong file');
          } else {
            seenCodes.add(code);
          }

          if (!name) {
            errorsList.push('Thiếu tên sản phẩm / quy cách');
          }

          if (price <= 0 || isNaN(price)) {
            errorsList.push('Đơn giá phân phối không hợp lệ');
          }

          rows.push({
            index: idx + 2, // Excel 1-based + 1 header row
            code,
            oldCode: oldCode || undefined,
            name,
            brand: brand.toUpperCase(),
            category,
            unit,
            cabinetWidth: cabinetWidth || undefined,
            dimensions: dimensions || undefined,
            price,
            shortDescription: shortDescription || undefined,
            isValid: errorsList.length === 0,
            errors: errorsList,
          });
        });

        setParsedRows(rows);
        const validCount = rows.filter((r) => r.isValid).length;
        const errCount = rows.length - validCount;

        if (errCount > 0) {
          info(`Đọc được ${rows.length} dòng: ${validCount} hợp lệ, ${errCount} dòng có lỗi cần sửa.`);
        } else {
          success(`Đọc thành công ${validCount} sản phẩm sẵn sàng nhập vào hệ thống!`);
        }
      } catch (err: any) {
        error('Lỗi khi đọc file Excel: ' + (err.message || 'File không hợp lệ'));
        setParsedRows([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // 4. Submit Valid Products
  const handleSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      error('Không có sản phẩm hợp lệ nào để nhập.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = validRows.map((r) => ({
        code: r.code,
        oldCode: r.oldCode || null,
        name: r.name,
        brand: r.brand,
        category: r.category,
        unit: r.unit,
        cabinetWidth: r.cabinetWidth || null,
        dimensions: r.dimensions || null,
        price: r.price,
        retailPrice: 0,
        discountRate: 0,
        vatRate: 0,
        shortDescription: r.shortDescription || null,
        active: true,
      }));

      const response: any = await apiClient('/products/bulk-import', {
        method: 'POST',
        data: {
          products: payload,
          overwriteExisting,
        },
      });

      const createdCount = response?.createdCount ?? 0;
      const updatedCount = response?.updatedCount ?? 0;
      const skippedCount = response?.skippedCount ?? 0;

      queryClient.invalidateQueries({ queryKey: productKeys.all });
      success(
        `Nhập dữ liệu thành công! Thêm mới: ${createdCount}, Cập nhật: ${updatedCount}` +
          (skippedCount > 0 ? `, Bỏ qua: ${skippedCount}` : '')
      );

      onSuccess();
      handleReset();
      onClose();
    } catch (err: any) {
      error(err.message || 'Không thể lưu danh sách sản phẩm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFileName('');
    setParsedRows([]);
    setFilterType('ALL');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;
  const displayedRows =
    filterType === 'ERRORS' ? parsedRows.filter((r) => !r.isValid) : parsedRows;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Nhập Sản Phẩm Hàng Loạt Từ Excel"
      subtitle="Thêm mới hoặc cập nhật hàng trăm phụ kiện tủ bếp nhanh chóng chỉ với 1 file Excel"
      maxWidth="5xl"
    >
      <div className="space-y-4">
        {/* Step 1: Upload & Template Section */}
        {parsedRows.length === 0 ? (
          <div className="space-y-4">
            {/* Template Download Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl gap-3">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-8 h-8 text-[#1B9550] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Chưa có file mẫu Excel?
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Tải về file Excel mẫu chuẩn gồm đúng 10 trường thông tin tương ứng với biểu mẫu tạo sản phẩm (Mã hàng chính, Mã cũ, ĐVT, Hãng, Danh mục, Tên & Quy cách, Khoang tủ, Kích thước lắp đặt, Mô tả, Đơn giá phân phối).
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-[#1B9550] text-[#14733E] hover:bg-emerald-100/60 font-semibold text-xs"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleDownloadTemplate}
              >
                Tải file Excel mẫu (.xlsx)
              </Button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-[#1B9550] bg-emerald-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-[#1B9550] hover:bg-slate-50/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 bg-emerald-100/70 text-[#14733E] rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                Kéo thả file Excel vào đây, hoặc click để chọn file
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hỗ trợ định dạng <strong>.xlsx</strong>, <strong>.xls</strong> hoặc <strong>.csv</strong>. Tối đa 2.000 dòng/lần.
              </p>
            </div>
          </div>
        ) : (
          /* Step 2: Live Preview & Validation Table */
          <div className="space-y-4">
            {/* Top Stats Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200 gap-3">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800">{fileName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">Tổng: <strong>{parsedRows.length}</strong> dòng</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                  ✓ {validCount} hợp lệ
                </span>
                {errorCount > 0 && (
                  <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full font-bold">
                    ✕ {errorCount} lỗi
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs py-1 px-2.5"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={handleReset}
                >
                  Chọn file khác
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs py-1 px-2.5 border-[#1B9550] text-[#14733E]"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleDownloadTemplate}
                >
                  Tải file mẫu
                </Button>
              </div>
            </div>

            {/* Overwrite Option & Filter Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-200 pb-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1B9550] focus:ring-[#1B9550] border-slate-300"
                />
                <span className="font-medium text-slate-800">
                  Cập nhật thông tin & giá nếu mã hàng đã tồn tại trong hệ thống
                </span>
              </label>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    filterType === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({parsedRows.length})
                </button>
                {errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterType('ERRORS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      filterType === 'ERRORS'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    }`}
                  >
                    Chỉ dòng lỗi ({errorCount})
                  </button>
                )}
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-[420px] overflow-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">Dòng</th>
                    <th className="py-2.5 px-3 w-10 text-center">TT</th>
                    <th className="py-2.5 px-3">Mã hàng chính</th>
                    <th className="py-2.5 px-3">Mã cũ</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Tên sản phẩm / Quy cách</th>
                    <th className="py-2.5 px-3 text-center">Hãng</th>
                    <th className="py-2.5 px-3">Danh mục</th>
                    <th className="py-2.5 px-3 text-center">ĐVT</th>
                    <th className="py-2.5 px-3 text-center">Khoang tủ</th>
                    <th className="py-2.5 px-3">Kích thước (R*S*C)</th>
                    <th className="py-2.5 px-3 text-right">Đơn giá PP (đ)</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Mô tả / Lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400">
                        Không có dòng dữ liệu nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((r) => (
                      <tr
                        key={r.index}
                        className={`hover:bg-slate-50 transition-colors ${
                          !r.isValid ? 'bg-rose-50/50' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {r.index}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {r.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline-block" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 inline-block" />
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {r.code || <span className="text-rose-500 italic">Trống</span>}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {r.oldCode || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 whitespace-normal min-w-[220px]">
                          {r.name || <span className="text-rose-500 italic">Trống</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <BrandBadge brand={r.brand} />
                        </td>
                        <td className="py-2 px-3 text-slate-700 text-[11px]">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {r.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {r.unit}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700 font-medium">
                          {r.cabinetWidth ? `${r.cabinetWidth}mm` : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                          {r.dimensions || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(r.price)}
                        </td>
                        <td className="py-2 px-3 whitespace-normal min-w-[180px]">
                          {!r.isValid ? (
                            <div className="text-[10.5px] text-rose-600 font-bold">
                              {r.errors.join(', ')}
                            </div>
                          ) : (
                            <div className="text-[10.5px] text-slate-500 line-clamp-2" title={r.shortDescription}>
                              {r.shortDescription || <span className="text-emerald-600 font-medium">✓ Hợp lệ</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {errorCount > 0 ? (
                  <span className="text-amber-700 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    Các dòng có lỗi sẽ tự động được bỏ qua khi nhập.
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    Tất cả các dòng dữ liệu đều hợp lệ và sẵn sàng lưu.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleReset();
                    onClose();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none justify-center text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={validCount === 0 || isSubmitting}
                  leftIcon={
                    isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )
                  }
                  className="flex-1 sm:flex-none justify-center text-xs font-bold"
                >
                  {isSubmitting
                    ? 'Đang nhập dữ liệu...'
                    : `Xác nhận nhập ${validCount} sản phẩm`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
