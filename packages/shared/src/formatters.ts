/**
 * Formats a number to Vietnamese Dong currency string (e.g. 2.887.500 ₫)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Formats a numeric input with dot thousands separator (e.g. 1000000 -> "1.000.000")
 */
export function formatThousands(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const numStr = val.toString().replace(/\D/g, '');
  if (!numStr) return '';
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parses a thousands-formatted string back to number (e.g. "1.000.000" -> 1000000)
 */
export function parseThousands(str: string | number | null | undefined): number {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return str;
  const cleaned = str.toString().replace(/\./g, '').replace(/,/g, '').replace(/\D/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

/**
 * Formats standard number without currency symbol (e.g. 2.887.500)
 */
export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats ISO date string to DD/MM/YYYY
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats status to Vietnamese readable text and color badge variant
 */
export function getStatusInfo(status: string): { label: string; color: string; bg: string; text: string } {
  switch (status) {
    case 'DRAFT':
      return { label: 'Bản nháp', color: 'gray', bg: 'bg-slate-100', text: 'text-slate-700' };
    case 'SENT':
      return { label: 'Đã gửi', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' };
    case 'PAID':
    case 'ACCEPTED':
      return { label: 'Đã thanh toán', color: 'green', bg: 'bg-emerald-100', text: 'text-emerald-700' };
    default:
      return { label: status, color: 'gray', bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}
