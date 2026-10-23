import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { useQuotation } from './hooks';

const APP_NAME = 'QuotationPro';

// Single source for page names: used by the Navbar header and the browser tab title
const PAGE_TITLES: { path: string; title: string }[] = [
  { path: '/', title: 'Tổng Quan' },
  { path: '/login', title: 'Đăng Nhập' },
  { path: '/quotations', title: 'Quản Lý Đơn Hàng' },
  { path: '/quotations/new', title: 'Tạo Đơn Hàng' },
  { path: '/quotations/:id/preview', title: 'Xem Trước Đơn Hàng' },
  { path: '/quotations/:id/edit', title: 'Chỉnh Sửa Đơn Hàng' },
  { path: '/products', title: 'Phụ Kiện & Tủ Bếp' },
  { path: '/brands', title: 'Thương Hiệu' },
  { path: '/customers', title: 'Khách Hàng & Đại Lý' },
  { path: '/users', title: 'Quản Lý Tài Khoản' },
  { path: '/audit-logs', title: 'Nhật Ký Hoạt Động & Bảo Mật' },
];

const NOT_FOUND_TITLE = 'Không Tìm Thấy Trang';

export function getPageTitle(pathname: string): string {
  return PAGE_TITLES.find((p) => matchPath(p.path, pathname))?.title ?? NOT_FOUND_TITLE;
}

/** Keeps the browser tab title in sync with the current route. Mount once inside the router. */
export function DocumentTitle() {
  const { pathname } = useLocation();
  const quotationMatch =
    matchPath('/quotations/:id/preview', pathname) || matchPath('/quotations/:id/edit', pathname);
  // Shares the page's cached query, so no extra request
  const { data: quotation } = useQuotation(quotationMatch?.params.id);

  let title = getPageTitle(pathname);
  if (quotationMatch && quotation) {
    title = quotationMatch.pattern.path.endsWith('/edit')
      ? `Sửa ${quotation.quotationNumber}`
      : `${quotation.quotationNumber} · ${quotation.customer?.companyName ?? 'Đơn hàng'}`;
  }

  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);

  return null;
}
