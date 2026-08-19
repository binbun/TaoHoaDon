import { Quotation, formatCurrency, formatDate } from '@taohoadon/shared';

export function renderQuotationHtml(quotation: Quotation): string {
  const customer = quotation.customer;
  const items = quotation.items || [];

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo giá ${quotation.quotationNumber} - EUPLUS</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
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
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }

    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo-text {
      background: #1e40af;
      color: #ffffff;
      font-size: 22px;
      font-weight: 900;
      padding: 6px 14px;
      border-radius: 6px;
      letter-spacing: 1px;
      display: inline-block;
    }

    .company-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.3;
    }

    .company-sub {
      font-size: 9.5px;
      color: #475569;
      margin-top: 2px;
    }

    .distributor-box {
      text-align: right;
      font-size: 9.5px;
      color: #334155;
      line-height: 1.35;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 10px;
      border-radius: 6px;
    }

    .distributor-box strong {
      color: #b91c1c;
      font-size: 10.5px;
    }

    /* TITLE & META */
    .title-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 14px;
    }

    .doc-title {
      font-size: 17px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: -0.2px;
      text-transform: uppercase;
    }

    .doc-subtitle {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
      margin-top: 1px;
    }

    .doc-meta-badge {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 5px 10px;
      text-align: right;
    }

    .doc-meta-item {
      font-size: 10px;
      color: #475569;
    }

    .doc-meta-item strong {
      color: #0f172a;
      font-size: 10.5px;
    }

    /* CUSTOMER INFO BOX */
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }

    .info-card-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e40af;
      margin-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }

    .customer-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      column-gap: 16px;
      row-gap: 3px;
    }

    .info-row {
      font-size: 10.5px;
      color: #334155;
    }

    .info-row span {
      color: #64748b;
      display: inline-block;
      min-width: 85px;
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
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 7px 8px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
      text-align: left;
    }

    table.items-table td {
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 10.5px;
    }

    table.items-table tr:last-child td {
      border-bottom: 2px solid #cbd5e1;
    }

    .col-stt { width: 5%; text-align: center; color: #64748b; }
    .col-product { width: 45%; }
    .col-unit { width: 10%; text-align: center; color: #475569; }
    .col-qty { width: 8%; text-align: center; }
    .col-price { width: 15%; text-align: right; }
    .col-total { width: 17%; text-align: right; font-weight: 700; color: #0f172a; }

    .product-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 11px;
      margin-bottom: 2px;
    }

    .product-desc {
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.3;
    }

    .discount-badge {
      display: inline-block;
      font-size: 9px;
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
      align-items: flex-start;
      margin-top: 8px;
      page-break-inside: avoid;
    }

    .notes-box {
      width: 55%;
      background: #fafafa;
      border: 1px solid #f1f5f9;
      border-radius: 6px;
      padding: 8px 12px;
    }

    .notes-title {
      font-size: 10px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .notes-content {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.4;
      white-space: pre-line;
    }

    .summary-box {
      width: 41%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: #475569;
      padding: 2.5px 0;
    }

    .summary-row.discount {
      color: #dc2626;
    }

    .summary-row.taxable {
      border-top: 1px dashed #cbd5e1;
      padding-top: 5px;
      margin-top: 2px;
      color: #334155;
      font-weight: 600;
    }

    .summary-row.grand-total {
      border-top: 2px solid #1e3a8a;
      margin-top: 6px;
      padding-top: 6px;
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
    }

    .grand-total .amount {
      color: #1e40af;
      font-size: 13.5px;
    }

    /* SIGNATURE */
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 28px;
      page-break-inside: avoid;
    }

    .signature-col {
      width: 45%;
      text-align: center;
    }

    .sig-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .sig-sub {
      font-size: 9.5px;
      color: #64748b;
      font-style: italic;
    }

    .sig-space {
      height: 55px;
    }

    .sig-name {
      font-size: 11px;
      font-weight: 700;
      color: #1e40af;
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
        <div class="brand-logo-text">EUPLUS</div>
        <div>
          <div class="company-title">CÔNG TY TNHH ĐẦU TƯ KIM KHÍ THÔNG MINH VIỆT ĐỨC</div>
          <div class="company-sub">Số nhà 1, ngách 298/77/30/21 Đ.Ngọc Hồi, T. Yên Ngưu, X.Đại Thanh, TP Hà Nội</div>
        </div>
      </div>
      <div class="distributor-box">
        <div><strong>NHÀ PHÂN PHỐI: BÍCH ĐIỀU</strong></div>
        <div>Hotline: 0917 418 989 - 0945 636 567</div>
        <div>ĐC: Số 147 phố Hát, Thôn Đông Thành, xã Hát Môn, TP. Hà Nội</div>
      </div>
    </div>

    <!-- Title & Meta -->
    <div class="title-section">
      <div>
        <div class="doc-title">${quotation.title || 'BÁO GIÁ PHỤ KIỆN TỦ BẾP EUPLUS'}</div>
        <div class="doc-subtitle">Báo giá phụ kiện tủ bếp thông minh Inox SUS304 chính hãng</div>
      </div>
      <div class="doc-meta-badge">
        <div class="doc-meta-item">Số báo giá: <strong>${quotation.quotationNumber}</strong></div>
        <div class="doc-meta-item">Ngày lập: <strong>${formatDate(quotation.quotationDate)}</strong></div>
        <div class="doc-meta-item">Hiệu lực đến: <strong>${formatDate(quotation.validUntil)}</strong></div>
      </div>
    </div>

    <!-- Customer Card -->
    <div class="info-card">
      <div class="info-card-title">Thông tin khách hàng / Đối tác / Công trình</div>
      <div class="customer-grid">
        <div class="info-row">
          <span>Khách hàng:</span> <strong>${customer?.companyName || 'Khách hàng đại lý'}</strong>
        </div>
        <div class="info-row">
          <span>Người đại diện:</span> <strong>${customer?.contactName || '---'}</strong>
        </div>
        <div class="info-row">
          <span>Điện thoại:</span> ${customer?.phone || '---'}
        </div>
        <div class="info-row">
          <span>Email:</span> ${customer?.email || '---'}
        </div>
        <div class="info-row">
          <span>Địa chỉ công trình:</span> ${customer?.address || '---'}
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
          <th class="col-product">Tên sản phẩm / Phụ kiện tủ bếp</th>
          <th class="col-unit">ĐVT</th>
          <th class="col-qty">SL</th>
          <th class="col-price">Đơn giá (đ)</th>
          <th class="col-total">Thành tiền (đ)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => `
          <tr>
            <td class="col-stt">${index + 1}</td>
            <td class="col-product">
              <div class="product-title">${item.productNameSnapshot}</div>
              ${item.descriptionSnapshot ? `<div class="product-desc">${item.descriptionSnapshot}</div>` : ''}
              ${item.discount > 0 ? `<div class="discount-badge">Chiết khấu: -${formatCurrency(item.discount)}</div>` : ''}
            </td>
            <td class="col-unit">${item.unit || 'Bộ'}</td>
            <td class="col-qty">${item.quantity}</td>
            <td class="col-price">${formatCurrency(item.unitPrice)}</td>
            <td class="col-total">${formatCurrency(item.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Bottom: Notes & Summary -->
    <div class="bottom-section">
      <div class="notes-box">
        <div class="notes-title">Chính sách bảo hành & Cam kết</div>
        <div class="notes-content">${quotation.note || `- Toàn bộ phụ kiện Inox SUS304 bảo hành hoen gỉ vĩnh viễn chính hãng EUPLUS.\n- Bảo hành ray trượt giảm chấn, cơ cấu piston nâng hạ 02 năm đổi mới.\n- Báo giá có giá trị đến ngày ${formatDate(quotation.validUntil)}.\n- Cảm ơn Quý đối tác đã tin tưởng lựa chọn thiết bị phụ kiện tủ bếp EUPLUS!`}</div>
      </div>
      <div class="summary-box">
        <div class="summary-row">
          <span>Tạm tính (Subtotal):</span>
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

    <!-- Signatures -->
    <div class="signature-section">
      <div class="signature-col">
        <div class="sig-title">ĐẠI DIỆN KHÁCH HÀNG / ĐẠI LÝ</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </div>
      <div class="signature-col">
        <div class="sig-title">NHÀ PHÂN PHỐI EUPLUS - BÍCH ĐIỀU</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên & đóng dấu)</div>
        <div class="sig-space"></div>
        <div class="sig-name">Đại Diện Kinh Doanh & Kỹ Thuật</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Báo giá số ${quotation.quotationNumber} • EUPLUS Smart Kitchen Hardware • Trang 1/1
    </div>
  </div>
</body>
</html>`;
}
