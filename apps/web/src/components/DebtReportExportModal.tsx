import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { DebtReportResponse, buildWorkbook, showDay } from '../lib/debtReportWorkbook';
import {
  LunarMonth,
  formatLunarMonth,
  getLunarMonthsOfYear,
  solarToLunar,
} from '@taohoadon/shared';
import { Download } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface DebtReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const todayDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const monthKey = (m: Pick<LunarMonth, 'month' | 'leap'>) => `${m.month}${m.leap ? 'N' : ''}`;

export const DebtReportExportModal: React.FC<DebtReportExportModalProps> = ({ isOpen, onClose }) => {
  const { success, error } = useToast();
  const today = useMemo(() => solarToLunar(todayDay()), []);

  const [year, setYear] = useState(today.year);
  const [selectedKey, setSelectedKey] = useState(monthKey(today));
  const [isExporting, setIsExporting] = useState(false);

  // Default to the current lunar month each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setYear(today.year);
      setSelectedKey(monthKey(today));
    }
  }, [isOpen, today]);

  const months = useMemo(() => getLunarMonthsOfYear(year), [year]);
  const selected = months.find((m) => monthKey(m) === selectedKey) ?? months[0];
  const years = Array.from({ length: 6 }, (_, i) => today.year - 4 + i);

  const handleExport = async () => {
    if (!selected) return;
    try {
      setIsExporting(true);
      const report = await apiClient<DebtReportResponse>(
        `/reports/debt?fromDate=${selected.start}&toDate=${selected.end}`
      );
      const fileName = `Don_hang_thang_${selected.month}${selected.leap ? '_nhuan' : ''}_${selected.year}_am_lich.xlsx`;
      XLSX.writeFile(buildWorkbook(report, selected), fileName);
      success(`Đã tải xuống ${fileName}`);
      onClose();
    } catch (err: any) {
      error(err.message || 'Không thể xuất báo cáo công nợ');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xuất Báo Cáo Công Nợ" subtitle="Theo tháng âm lịch" maxWidth="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="debt-report-year" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Năm âm lịch
            </label>
            <Select
              value={String(year)}
              onValueChange={(v) => {
                setYear(Number(v));
                setSelectedKey('1');
              }}
            >
              <SelectTrigger id="debt-report-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="debt-report-month" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tháng âm lịch
            </label>
            <Select value={selected ? monthKey(selected) : ''} onValueChange={setSelectedKey}>
              <SelectTrigger id="debt-report-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={monthKey(m)} value={monthKey(m)}>
                    Tháng {m.month}
                    {m.leap ? ' nhuận' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selected && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-900">{formatLunarMonth(selected)}</div>
            <div>
              Dương lịch: <strong className="text-slate-900">{showDay(selected.start)}</strong> –{' '}
              <strong className="text-slate-900">{showDay(selected.end)}</strong>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed">
          File Excel liệt kê các đơn hàng tạo trong tháng (Ngày tạo, Số đơn hàng, Tên KH, Tổng tiền hàng, Nợ cũ, Tổng
          thanh toán, Đã TT, Còn lại): trang <strong>Tất cả</strong> gồm mọi khách hàng, sau đó mỗi khách hàng một trang riêng.
        </p>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isExporting}>
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="primary"
            leftIcon={<Download className="w-4 h-4" />}
            isLoading={isExporting}
            onClick={handleExport}
            disabled={!selected}
          >
            Tải file Excel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
