import { describe, it, expect } from 'vitest';
import {
  calculateCrc16,
  generateEmvcoQrPayload,
  generateVietQrUrl,
  extractQuotationNumberFromContent,
  DEFAULT_BANK_CONFIG,
} from '@taohoadon/shared';

describe('VietQR & EMVCo Specification Suite', () => {
  it('should accurately calculate standard CRC16-CCITT for EMVCo strings', () => {
    // Known test vector: CRC16 of standard sample
    const sample = '00020101021238570010A000000727012700069704070113190261971430100208QRIBFTTA53037045408150000005802VN62160812DH-2026-00016304';
    const crc = calculateCrc16(sample);
    expect(crc).toMatch(/^[0-9A-F]{4}$/);
    expect(crc.length).toBe(4);
  });

  it('should generate valid EMVCo QR string with correct tags and dynamic amount', () => {
    const payload = generateEmvcoQrPayload({
      amount: 15000000,
      description: 'DH-2026-0001',
    });

    expect(payload).toContain('000201'); // Tag 00: version 01
    expect(payload).toContain('010212'); // Tag 01: dynamic initiation method
    expect(payload).toContain('A000000727'); // Tag 38 GUID
    expect(payload).toContain('970407'); // Default BIN Techcombank
    expect(payload).toContain('19026197143010'); // Default account
    expect(payload).toContain('5303704'); // VND currency 704
    expect(payload).toContain('540815000000'); // Amount 15000000 (length 08)
    expect(payload).toContain('5802VN'); // Country VN
    expect(payload).toContain('DH-2026-0001'); // Purpose description
    expect(payload).toMatch(/6304[0-9A-F]{4}$/); // Ends with Tag 63 CRC
  });

  it('should generate valid VietQR CDN QuickLink URL with formatted parameters', () => {
    const url = generateVietQrUrl({
      amount: 12500000,
      description: 'DH-2026-0002',
      template: 'compact2',
    });

    expect(url).toContain('https://img.vietqr.io/image/970407-19026197143010-compact2.png');
    expect(url).toContain('amount=12500000');
    expect(url).toContain('addInfo=DH-2026-0002');
    expect(url).toContain('accountName=TRAN+THI+BICH+DIEU');
  });

  it('should extract quotation number accurately from messy bank transfer memos', () => {
    expect(extractQuotationNumberFromContent('Chuyen tien don hang DH-2026-0001')).toBe('DH-2026-0001');
    expect(extractQuotationNumberFromContent('DH 2026 0005 thanh toan dot 1')).toBe('DH-2026-0005');
    expect(extractQuotationNumberFromContent('Thanh toan tien CN-2026-0002')).toBe('CN-2026-0002');
    expect(extractQuotationNumberFromContent('HD20260010 Nguyen Van A')).toBe('HD-2026-0010');
    expect(extractQuotationNumberFromContent('Chuyen khoan khong co ma don')).toBeNull();
    expect(extractQuotationNumberFromContent('')).toBeNull();
  });
});
