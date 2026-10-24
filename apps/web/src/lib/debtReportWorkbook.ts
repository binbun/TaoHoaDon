import * as XLSX from 'xlsx';
import { DebtReportRow, LunarMonth, formatLunarMonth, solarToLunar } from '@taohoadon/shared';

export const showDay = (day: string) => day.split('-').reverse().join('/');

export interface DebtReportOrder {
  id: string;
  customerId: string;
  quotationDate: string; // YYYY-MM-DD
  quotationNumber: string;
  companyName: string;
  orderAmount: number;
  previousDebt: number;
  grandTotal: number;
  paid: number; // paid on this invoice by the end of the month
  remaining: number; // grandTotal − paid
}

export interface DebtReportResponse {
  fromDate: string;
  toDate: string;
  rows: DebtReportRow[];
  orders: DebtReportOrder[];
}

const MONEY_FORMAT = '#,##0';

const HEADER = ['Ngày tạo', 'Số đơn hàng', 'Tên KH', 'Tổng tiền hàng', 'Nợ cũ', 'Tổng thanh toán', 'Đã TT', 'Còn lại'];

const SUMMARY_HEADER = ['Tên KH', 'Số điện thoại', 'Nợ đầu tháng', 'Phát sinh', 'Đã thanh toán', 'Nợ cuối tháng'];

const lunarDay = (day: string) => {
  const l = solarToLunar(day);
  return `${l.day}/${l.month}${l.leap ? ' nhuận' : ''} ÂL`;
};

// Thousands separators for the money columns
function formatMoneyColumns(sheet: XLSX.WorkSheet, firstMoneyColumn: number) {
  for (const [ref, cell] of Object.entries(sheet)) {
    if (!ref.startsWith('!') && (cell as XLSX.CellObject).t === 'n' && XLSX.utils.decode_cell(ref).c >= firstMoneyColumn) {
      (cell as XLSX.CellObject).z = MONEY_FORMAT;
    }
  }
}

function buildOrdersSheet(title: string, orders: DebtReportOrder[], month: LunarMonth) {
  const sheet = XLSX.utils.aoa_to_sheet([
    [`${title} - ${formatLunarMonth(month).toUpperCase()}`],
    [`Dương lịch ${showDay(month.start)} – ${showDay(month.end)}`],
    [],
    HEADER,
    ...orders.map((o) => [
      `${showDay(o.quotationDate)} (${lunarDay(o.quotationDate)})`,
      o.quotationNumber,
      o.companyName,
      o.orderAmount,
      o.previousDebt,
      o.grandTotal,
      o.paid,
      o.remaining,
    ]),
    // "Nợ cũ" / "Tổng thanh toán" / "Còn lại" are not summed: the same old debt repeats on each later invoice
    [
      '',
      '',
      `TỔNG ${orders.length} ĐƠN`,
      orders.reduce((sum, o) => sum + o.orderAmount, 0),
      '',
      '',
      orders.reduce((sum, o) => sum + o.paid, 0),
    ],
  ]);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADER.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: HEADER.length - 1 } },
  ];
  sheet['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 34 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
  formatMoneyColumns(sheet, 3);
  return sheet;
}

// One row per customer with debt or activity in the month; unlike invoice balances, these add up
function buildSummarySheet(rows: DebtReportRow[], month: LunarMonth) {
  const active = rows.filter((r) => r.openingBalance || r.billed || r.paid || r.closingBalance);
  const total = (pick: (r: DebtReportRow) => number) => active.reduce((sum, r) => sum + pick(r), 0);
  const sheet = XLSX.utils.aoa_to_sheet([
    [`TỔNG HỢP CÔNG NỢ - ${formatLunarMonth(month).toUpperCase()}`],
    [`Dương lịch ${showDay(month.start)} – ${showDay(month.end)}`],
    [],
    SUMMARY_HEADER,
    ...active.map((r) => [r.companyName, r.phone || '', r.openingBalance, r.billed, r.paid, r.closingBalance]),
    [
      `TỔNG ${active.length} KHÁCH HÀNG`,
      '',
      total((r) => r.openingBalance),
      total((r) => r.billed),
      total((r) => r.paid),
      total((r) => r.closingBalance),
    ],
  ]);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: SUMMARY_HEADER.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: SUMMARY_HEADER.length - 1 } },
  ];
  sheet['!cols'] = [{ wch: 34 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  formatMoneyColumns(sheet, 2);
  return sheet;
}

// Excel tab names: max 31 characters, no : \ / ? * [ ], and unique (case-insensitive)
function makeSheetName(name: string, used: Set<string>) {
  const base = name.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Khách hàng';
  let candidate = base;
  for (let i = 2; used.has(candidate.toLowerCase()); i++) {
    const suffix = ` (${i})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function buildWorkbook(report: DebtReportResponse, month: LunarMonth) {
  const workbook = XLSX.utils.book_new();
  const used = new Set<string>();

  // First tab: each customer's debt for the month
  XLSX.utils.book_append_sheet(workbook, buildSummarySheet(report.rows, month), makeSheetName('Tổng hợp', used));

  // Then every order of the month
  XLSX.utils.book_append_sheet(
    workbook,
    buildOrdersSheet('DANH SÁCH ĐƠN HÀNG', report.orders, month),
    makeSheetName('Tất cả', used)
  );

  // Then one tab per customer, in name order (grouped by id: two customers may share a name)
  const byCustomer = new Map<string, DebtReportOrder[]>();
  for (const o of report.orders) {
    byCustomer.set(o.customerId, [...(byCustomer.get(o.customerId) ?? []), o]);
  }
  [...byCustomer.values()]
    .sort((a, b) => a[0].companyName.localeCompare(b[0].companyName, 'vi'))
    .forEach((orders) => {
      const name = orders[0].companyName;
      XLSX.utils.book_append_sheet(
        workbook,
        buildOrdersSheet(`ĐƠN HÀNG ${name.toUpperCase()}`, orders, month),
        makeSheetName(name, used)
      );
    });

  return workbook;
}
