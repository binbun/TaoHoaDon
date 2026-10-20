import { Quotation, formatCurrency, formatNumber, formatDate, generateVietQrUrl } from '@taohoadon/shared';
import { PAYMENT_QR_BASE64 } from './paymentQr';
import { GROB_LOGO_BASE64 } from './grobLogo';

export function renderQuotationHtml(quotation: Quotation): string {
  const customer = quotation.customer;
  const items = quotation.items || [];
  const dynamicQrUrl = generateVietQrUrl({
    template: 'qr_only',
  });

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Đơn hàng ${quotation.quotationNumber} - Bích Điều</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 8mm 10mm 10mm 10mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.45;
      color: #1e293b;
      background: #ffffff;
      padding: 0;
    }

    .container {
      width: 100%;
      max-width: 100%;
    }

    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1B9550;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }

    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo-img {
      height: 50px;
      width: auto;
      object-fit: contain;
    }

    .company-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.25;
    }

    .company-sub {
      font-size: 10px;
      color: #475569;
      margin-top: 2px;
    }

    .distributor-box {
      text-align: right;
      font-size: 10px;
      color: #334155;
      line-height: 1.35;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 10px;
      border-radius: 6px;
    }

    .distributor-box strong {
      color: #b91c1c;
      font-size: 11.5px;
    }

    /* TITLE & META */
    .title-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 12px;
    }

    .doc-title {
      font-size: 19px;
      font-weight: 800;
      color: #14733E;
      letter-spacing: -0.2px;
      text-transform: uppercase;
    }

    .doc-subtitle {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
      margin-top: 1px;
    }

    .doc-meta-badge {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 12px;
      text-align: right;
    }

    .doc-meta-item {
      font-size: 11px;
      color: #475569;
    }

    .doc-meta-item strong {
      color: #0f172a;
      font-size: 11.5px;
    }

    /* CUSTOMER INFO BOX */
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 9px 14px;
      margin-bottom: 12px;
    }

    .info-card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1B9550;
      margin-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }

    .customer-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      column-gap: 20px;
      row-gap: 4px;
    }

    .info-row {
      font-size: 11.5px;
      color: #334155;
    }

    .info-row span {
      color: #64748b;
      display: inline-block;
      min-width: 90px;
    }

    .info-row strong {
      color: #0f172a;
    }

    /* TABLE */
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    table.items-table th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      padding: 8px 8px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
      text-align: left;
      white-space: nowrap;
    }

    table.items-table td {
      padding: 7px 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 11.5px;
    }

    table.items-table tr:last-child td {
      border-bottom: 2px solid #cbd5e1;
    }

    .col-stt { width: 5%; text-align: center; color: #64748b; white-space: nowrap; }
    .col-code { width: 13%; font-weight: 700; color: #0f172a; font-family: monospace; font-size: 11px; white-space: nowrap; }
    .col-product { width: 35%; }
    .col-unit { width: 7%; text-align: center; color: #475569; white-space: nowrap; }
    .col-qty { width: 6%; text-align: center; font-weight: 600; white-space: nowrap; }
    .col-price { width: 17%; text-align: right; white-space: nowrap; }
    .col-total { width: 17%; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap; }

    .product-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 12px;
      margin-bottom: 2px;
    }

    .product-desc {
      font-size: 10px;
      color: #64748b;
      line-height: 1.35;
    }

    .discount-badge {
      display: inline-block;
      font-size: 9.5px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
      padding: 1px 4px;
      margin-top: 2px;
    }

    /* SUMMARY SECTION */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      margin-top: 8px;
      gap: 12px;
      page-break-inside: avoid;
    }

    .qr-payment-box {
      width: 53%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .qr-img-wrap {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .qr-code-img {
      width: 120px;
      height: 120px;
      object-fit: contain;
      display: block;
    }

    .qr-details {
      font-size: 11.5px;
      color: #475569;
      line-height: 1.55;
      flex: 1;
      min-width: 0;
    }

    .qr-title {
      font-size: 12.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #0f172a;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .qr-title::before {
      content: "";
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #1B9550;
    }

    .qr-line {
      margin-bottom: 4px;
      font-size: 11.5px;
      white-space: nowrap;
    }

    .qr-line strong {
      color: #0f172a;
      font-size: 12px;
    }

    .qr-line strong.stk-val {
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    .qr-hint {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 3px;
      line-height: 1.3;
    }

    .notes-box {
      margin-top: 10px;
      background: #fafafa;
      border: 1px solid #f1f5f9;
      border-radius: 6px;
      padding: 8px 12px;
      page-break-inside: avoid;
    }

    .notes-title {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .notes-content {
      font-size: 10.5px;
      color: #475569;
      line-height: 1.4;
      white-space: pre-line;
    }

    .summary-box {
      width: 45%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: #475569;
      padding: 3px 0;
    }

    .summary-row.discount {
      color: #dc2626;
    }

    .summary-row.taxable {
      border-top: 1px dashed #cbd5e1;
      padding-top: 5px;
      margin-top: 3px;
      color: #334155;
      font-weight: 600;
    }

    .summary-row.grand-total {
      border-top: 2px solid #1B9550;
      margin-top: 6px;
      padding-top: 6px;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }

    .grand-total .amount {
      color: #1B9550;
      font-size: 15px;
      font-weight: 900;
    }

    /* SIGNATURE */
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 22px;
      page-break-inside: avoid;
    }

    .signature-col {
      width: 45%;
      text-align: center;
    }

    .sig-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .sig-sub {
      font-size: 10.5px;
      color: #64748b;
      font-style: italic;
    }

    .sig-space {
      height: 48px;
    }

    .sig-name {
      font-size: 11.5px;
      font-weight: 700;
      color: #14733E;
    }

    /* FOOTER */
    .footer {
      margin-top: 20px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="brand-box">
        <img src="${GROB_LOGO_BASE64}" alt="Logo GROB" class="brand-logo-img" />
        <div>
          <div class="company-title">CÔNG TY TNHH ĐẦU TƯ KIM KHÍ THÔNG MINH VIỆT ĐỨC</div>
          <div class="company-sub">Phân phối chính hãng: GROB - EUPLUS - EUROKING - KINGENBLU - BLUM</div>
        </div>
      </div>
      <div class="distributor-box">
        <div><strong>NPP BÍCH ĐIỀU</strong></div>
        <div>Hotline: 0917 418 989 - 0945 636 567</div>
        <div>ĐC: Số 147 phố Hát, Thôn Đông Thành, xã Hát Môn, TP. Hà Nội</div>
      </div>
    </div>

    <!-- Title & Meta -->
    <div class="title-section">
      <div>
        <div class="doc-title">${quotation.title || 'HÓA ĐƠN BÁN HÀNG'}</div>
        <div class="doc-subtitle">Đơn hàng phụ kiện tủ bếp thông minh chính hãng</div>
      </div>
      <div class="doc-meta-badge">
        <div class="doc-meta-item">Số đơn hàng: <strong>${quotation.quotationNumber}</strong></div>
        <div class="doc-meta-item">Ngày lập: <strong>${formatDate(quotation.quotationDate)}</strong></div>
      </div>
    </div>

    <!-- Customer Card -->
    <div class="info-card">
      <div class="info-card-title">Thông tin khách hàng</div>
      <div class="customer-grid">
        <div class="info-row">
          <span>Khách hàng:</span> <strong>${customer?.companyName || 'Khách hàng đại lý'}</strong>
        </div>
        ${customer?.contactName ? `
        <div class="info-row">
          <span>Người đại diện:</span> <strong>${customer.contactName}</strong>
        </div>` : ''}
        <div class="info-row">
          <span>Điện thoại:</span> ${customer?.phone || '---'}
        </div>
        ${customer?.email ? `
        <div class="info-row">
          <span>Email:</span> ${customer.email}
        </div>` : ''}
        <div class="info-row">
          <span>Địa chỉ giao hàng:</span> ${customer?.address || '---'}
        </div>
        <div class="info-row">
          <span>Mã số thuế:</span> ${customer?.taxCode || '---'}
        </div>
      </div>
    </div>

    <!-- Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-stt">STT</th>
          <th class="col-code">Mã SP</th>
          <th class="col-product">Tên sản phẩm</th>
          <th class="col-unit">ĐVT</th>
          <th class="col-qty">SL</th>
          <th class="col-price">Đơn giá (đ)</th>
          <th class="col-total">Thành tiền (đ)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => {
    const productCode = item.productCodeSnapshot || (item as any).product?.code || '-';
    return `
          <tr>
            <td class="col-stt">${index + 1}</td>
            <td class="col-code">${productCode}</td>
            <td class="col-product">
              <div class="product-title">${item.productNameSnapshot}</div>
            </td>
            <td class="col-unit">${item.unit || 'Bộ'}</td>
            <td class="col-qty">${item.quantity}</td>
            <td class="col-price">
              <div>${formatNumber(item.unitPrice)}</div>
              ${item.discount > 0 ? `<div class="discount-badge" style="margin-top: 2px;">-${formatNumber(item.discountAmount || (item.quantity * item.unitPrice * (item.discount / 100)))} (${item.discount}%)</div>` : ''}
            </td>
            <td class="col-total">${formatNumber(item.total)}</td>
          </tr>
        `;
  }).join('')}
      </tbody>
    </table>

    <!-- Bottom: QR Payment & Summary -->
    <div class="bottom-section">
      <div class="qr-payment-box">
        <div class="qr-img-wrap">
          <img src="${PAYMENT_QR_BASE64}" alt="VietQR Techcombank" class="qr-code-img" />
        </div>
        <div class="qr-details">
          <div class="qr-title">Thông tin chuyển khoản</div>
          <div class="qr-line">STK: <strong class="stk-val">19026197143010</strong></div>
          <div class="qr-line">Ngân hàng: <strong>TECHCOMBANK</strong></div>
          <div class="qr-line">Chủ TK: <strong style="text-transform: uppercase;">Tran Thi Bich Dieu</strong></div>
        </div>
      </div>
      <div class="summary-box">
        <div class="summary-row">
          <span>Tạm tính:</span>
          <span>${formatCurrency(quotation.subtotal)}</span>
        </div>
        ${quotation.discountTotal > 0 ? `
          <div class="summary-row discount">
            <span>Chiết khấu (Discount):</span>
            <span>-${formatCurrency(quotation.discountTotal)}</span>
          </div>
        ` : ''}
        <div class="summary-row taxable">
          <span>Tiền trước VAT:</span>
          <span>${formatCurrency(quotation.taxableTotal)}</span>
        </div>
        <div class="summary-row">
          <span>Tiền thuế VAT:</span>
          <span>${formatCurrency(quotation.vatTotal)}</span>
        </div>
        ${(quotation.previousDebt && quotation.previousDebt > 0) ? `
          <div class="summary-row" style="color: #b91c1c; font-weight: 600;">
            <span>Dư nợ cũ:</span>
            <span>+${formatCurrency(quotation.previousDebt)}</span>
          </div>
        ` : ''}
        <div class="summary-row grand-total">
          <span>TỔNG CỘNG:</span>
          <span class="amount">${formatCurrency(quotation.grandTotal)}</span>
        </div>
      </div>
    </div>

    <!-- Notes & Terms -->
    <div class="notes-box">
      <div class="notes-title">Chính sách bảo hành & Cam kết</div>
      <div class="notes-content">${quotation.note || `- Toàn bộ phụ kiện Inox SUS304 bảo hành hoen gỉ vĩnh viễn chính hãng.\n- Bảo hành sản phẩm 24 tháng lỗi 1 đổi 1 đối với phụ kiện GROB\n- Miễn phí vận chuyển trong khu vực, giao hàng toàn quốc`}</div>
    </div>

    <!-- Signatures -->
    <div class="signature-section">
      <div class="signature-col">
        <div class="sig-title">KHÁCH HÀNG</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </div>
      <div class="signature-col">
        <div class="sig-title">NGƯỜI BÁN HÀNG</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Đơn hàng số ${quotation.quotationNumber} • Hệ thống Phụ kiện Tủ bếp Thông minh (GRÖB • EUPLUS • KINGENBLU) • Trang 1/1
    </div>
  </div>
</body>
</html>`;
}

/**
 * Renders the Delivery Note / Delivery Check Slip HTML template (without prices/totals).
 * Matches the paper invoice layout provided:
 * HÓA ĐƠN BÁN HÀNG / Số / Ngày... tháng... năm... / Stt - Mã hàng - Tên sản phẩm - ĐVT - Số lượng / Khách hàng - Người bán hàng.
 */
export function renderDeliverySlipHtml(quotation: Quotation): string {
  const customer = quotation.customer;
  const items = quotation.items || [];

  const dateObj = new Date(quotation.quotationDate);
  const day = !isNaN(dateObj.getTime()) ? String(dateObj.getDate()).padStart(2, '0') : '.....';
  const month = !isNaN(dateObj.getTime()) ? String(dateObj.getMonth() + 1).padStart(2, '0') : '.....';
  const year = !isNaN(dateObj.getTime()) ? String(dateObj.getFullYear()) : '2026';

  // Ensure table looks complete with minimum 8 rows like paper invoice
  const minRows = 8;
  const blankRowsCount = Math.max(0, minRows - items.length);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Phiếu giao hàng ${quotation.quotationNumber} - Bích Điều</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
    }

    .container {
      width: 100%;
    }

    /* TOP DISTRIBUTOR INFO */
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1B9550;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }

    .distributor-name {
      font-size: 15px;
      font-weight: 900;
      color: #14733E;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .distributor-sub {
      font-size: 10px;
      color: #475569;
      font-weight: 500;
      margin-top: 1px;
    }

    .distributor-contact {
      text-align: right;
      font-size: 10px;
      color: #334155;
      line-height: 1.35;
    }

    .distributor-contact strong {
      color: #b91c1c;
      font-size: 11px;
    }

    /* TITLE SECTION */
    .title-section {
      text-align: center;
      margin-bottom: 14px;
    }

    .main-title {
      font-size: 21px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
      margin-bottom: 3px;
    }

    .order-number {
      font-size: 12.5px;
      color: #334155;
      margin-bottom: 2px;
    }

    .order-number strong {
      font-weight: 700;
      color: #0f172a;
    }

    .order-date {
      font-size: 12px;
      font-style: italic;
      color: #475569;
    }

    /* RECIPIENT DETAILS */
    .delivery-info-card {
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
      background: #f8fafc;
      font-size: 11.5px;
    }

    .delivery-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      column-gap: 16px;
      row-gap: 3px;
    }

    .delivery-item span.label {
      color: #64748b;
      display: inline-block;
      min-width: 85px;
    }

    .delivery-item strong {
      color: #0f172a;
    }

    /* TABLE */
    table.delivery-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }

    table.delivery-table th,
    table.delivery-table td {
      border: 1px solid #334155;
      padding: 7px 8px;
      font-size: 11.5px;
      vertical-align: middle;
    }

    table.delivery-table th {
      background-color: #f1f5f9;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.3px;
      color: #0f172a;
      padding: 8px 6px;
    }

    .col-stt {
      width: 42px;
      text-align: center;
      font-weight: 600;
      color: #475569;
    }

    .col-code {
      width: 130px;
      text-align: center;
      font-family: monospace;
      font-weight: 700;
      font-size: 11px;
      color: #0f172a;
    }

    .col-name {
      text-align: left;
      font-weight: 600;
      color: #0f172a;
    }

    .col-unit {
      width: 60px;
      text-align: center;
      color: #475569;
    }

    .col-qty {
      width: 70px;
      text-align: center;
      font-weight: 800;
      font-size: 12px;
      color: #0f172a;
    }

    .blank-cell {
      height: 28px;
    }

    /* SUMMARY TOTAL PIECES */
    .delivery-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 16px;
      padding: 6px 10px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
    }

    /* SIGNATURES */
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      text-align: center;
      margin-top: 14px;
      padding-top: 10px;
    }

    .sig-col .sig-title {
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .sig-col .sig-sub {
      font-size: 9.5px;
      font-style: italic;
      color: #64748b;
    }

    .sig-space {
      height: 75px;
    }

    /* FOOTER */
    .footer-note {
      text-align: center;
      font-size: 9px;
      color: #64748b;
      margin-top: 16px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Top Distributor Bar -->
    <div class="top-header">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="${GROB_LOGO_BASE64}" alt="Logo GROB" style="height: 38px; width: auto; object-fit: contain;" />
        <div>
          <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.2;">
            CÔNG TY TNHH ĐẦU TƯ KIM KHÍ THÔNG MINH VIỆT ĐỨC
          </div>
          <div style="font-size: 9px; color: #475569; margin-top: 1px;">
            Phân phối chính hãng: GROB - EUPLUS - EUROKING - KINGENBLU - BLUM
          </div>
        </div>
      </div>
      <div class="distributor-contact">
        <div><strong style="color: #b91c1c;">NPP BÍCH ĐIỀU</strong></div>
        <div>Hotline: 0917 418 989 - 0945 636 567</div>
        <div>Zalo: 0348 932 347 - 0917 418 989</div>
        <div>Địa chỉ: Số 147 phố Hát, Thôn Đông Thành, xã Hát Môn, Tp. Hà Nội</div>
      </div>
    </div>

    <!-- Title Section -->
    <div class="title-section">
      <h1 class="main-title">HÓA ĐƠN BÁN HÀNG</h1>
      <div class="order-number">số: <strong>${quotation.quotationNumber}</strong></div>
      <div class="order-date">Ngày ${day} tháng ${month} năm ${year}</div>
    </div>

    <!-- Delivery & Customer Details -->
    <div class="delivery-info-card">
      <div class="delivery-grid">
        <div class="delivery-item">
          <span class="label">Khách hàng:</span>
          <strong>${customer?.companyName || 'Khách hàng đại lý'}</strong>
        </div>
        <div class="delivery-item">
          <span class="label">Điện thoại:</span>
          <strong>${customer?.phone || '---'}</strong>
        </div>
        <div class="delivery-item" style="grid-column: span 2;">
          <span class="label">Địa chỉ giao:</span>
          <span>${customer?.address || '---'}</span>
        </div>
      </div>
    </div>

    <!-- Table of Items (Clean bordered grid like invoice image) -->
    <table class="delivery-table">
      <thead>
        <tr>
          <th class="col-stt">Stt</th>
          <th class="col-code">Mã hàng</th>
          <th class="col-name">Tên sản phẩm</th>
          <th class="col-unit">ĐVT</th>
          <th class="col-qty">Số lượng</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => {
    const productCode = item.productCodeSnapshot || (item as any).product?.code || '-';
    return `
          <tr>
            <td class="col-stt">${index + 1}</td>
            <td class="col-code">${productCode}</td>
            <td class="col-name">${item.productNameSnapshot}</td>
            <td class="col-unit">${item.unit || 'Bộ'}</td>
            <td class="col-qty">${item.quantity}</td>
          </tr>
        `;
  }).join('')}
        ${Array.from({ length: blankRowsCount }).map((_, idx) => `
          <tr class="blank-row">
            <td class="col-stt blank-cell">${items.length + idx + 1}</td>
            <td class="col-code blank-cell"></td>
            <td class="col-name blank-cell"></td>
            <td class="col-unit blank-cell"></td>
            <td class="col-qty blank-cell"></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Total quantity summary -->
    <div class="delivery-summary">
      <div>Tổng số mặt hàng: <strong>${items.length}</strong></div>
      <div>Tổng số lượng sản phẩm giao: <strong>${items.reduce((sum, it) => sum + (it.quantity || 0), 0)}</strong></div>
    </div>

    <!-- Signatures -->
    <div class="signature-section">
      <div class="sig-col">
        <div class="sig-title">Khách hàng</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </div>
      <div class="sig-col">
        <div class="sig-title">Người bán hàng</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-note">
      Vui lòng kiểm tra kỹ số lượng, mã hàng và tình trạng sản phẩm trước khi ký nhận bàn giao.
    </div>
  </div>
</body>
</html>`;
}
