/**
 * VietQR Specification & EMVCo Standard Generator for TaoHoaDon
 * Standardized banking QR code implementation adhering to Napas / VietQR specs.
 */

export interface BankConfig {
  bankId: string; // Napas BIN code (e.g. 970407 for Techcombank)
  bankCode: string; // Short code (e.g. TCB, VCB, MB)
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export const DEFAULT_BANK_CONFIG: BankConfig = {
  bankId: '970407', // Techcombank Napas BIN
  bankCode: 'TCB',
  bankName: 'Techcombank (Ngân hàng TMCP Kỹ Thương Việt Nam)',
  accountNumber: '19026197143010',
  accountName: 'TRAN THI BICH DIEU',
};

export interface PopularBank {
  bin: string;
  shortName: string;
  name: string;
}

export const POPULAR_BANKS: PopularBank[] = [
  { bin: '970407', shortName: 'TCB', name: 'Techcombank' },
  { bin: '970436', shortName: 'VCB', name: 'Vietcombank' },
  { bin: '970422', shortName: 'MB', name: 'MBBank' },
  { bin: '970418', shortName: 'BIDV', name: 'BIDV' },
  { bin: '970415', shortName: 'CTG', name: 'VietinBank' },
  { bin: '970416', shortName: 'ACB', name: 'ACB' },
  { bin: '970432', shortName: 'VPB', name: 'VPBank' },
  { bin: '970458', shortName: 'TPB', name: 'TPBank' },
  { bin: '970403', shortName: 'STB', name: 'Sacombank' },
  { bin: '970441', shortName: 'VIB', name: 'VIB' },
  { bin: '970440', shortName: 'SEAB', name: 'SeABank' },
];

export interface VietQrOptions {
  bankId?: string;
  accountNumber?: string;
  accountName?: string;
  amount?: number;
  description?: string;
  template?: 'compact' | 'compact2' | 'qr_only' | 'print';
}

/**
 * Calculates standard CRC16-CCITT checksum (ISO/IEC 13239) for EMVCo QR code.
 * Polynomial 0x1021, Initial 0xFFFF, no reflection.
 */
export function calculateCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    crc ^= code << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Helper to encode TLV (Tag-Length-Value) data for EMVCo format
 */
function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Generates an official EMVCo-compliant QR string for Napas VietQR standard.
 * Compatible with mobile banking scanners (Techcombank, VCB, MB, Momo, etc.).
 */
export function generateEmvcoQrPayload(options: VietQrOptions): string {
  const bankBin = options.bankId || DEFAULT_BANK_CONFIG.bankId;
  const accountNumber = options.accountNumber || DEFAULT_BANK_CONFIG.accountNumber;
  const amount = options.amount ? Math.round(options.amount) : 0;
  const description = options.description || '';

  // 1. Payload Format Indicator (Tag 00): '01'
  let payload = formatTlv('00', '01');

  // 2. Point of Initiation Method (Tag 01): '12' = Dynamic with amount, '11' = Static
  payload += formatTlv('01', amount > 0 ? '12' : '11');

  // 3. Merchant Account Information (Tag 38 for Napas VietQR)
  // Sub-tag 00: GUID 'A000000727'
  const guid = formatTlv('00', 'A000000727');
  // Sub-tag 01: Beneficiary Bank BIN (Sub-subtag 00) and Account Number (Sub-subtag 01)
  const bankBinTlv = formatTlv('00', bankBin);
  const accountTlv = formatTlv('01', accountNumber);
  const paymentNetwork = formatTlv('01', `${bankBinTlv}${accountTlv}`);
  // Sub-tag 02: Service Code 'QRIBFTTA' (Transfer to Account)
  const serviceCode = formatTlv('02', 'QRIBFTTA');
  const merchantInfoValue = `${guid}${paymentNetwork}${serviceCode}`;
  payload += formatTlv('38', merchantInfoValue);

  // 4. Transaction Currency (Tag 53): '704' (VND)
  payload += formatTlv('53', '704');

  // 5. Transaction Amount (Tag 54) if specified
  if (amount > 0) {
    payload += formatTlv('54', amount.toString());
  }

  // 6. Country Code (Tag 58): 'VN'
  payload += formatTlv('58', 'VN');

  // 7. Additional Data Field Template (Tag 62)
  if (description) {
    // Sub-tag 08: Purpose of transaction / reference code
    const purposeTlv = formatTlv('08', description.slice(0, 25));
    payload += formatTlv('62', purposeTlv);
  }

  // 8. CRC16 Checksum (Tag 63)
  const payloadForCrc = `${payload}6304`;
  const checksum = calculateCrc16(payloadForCrc);

  return `${payloadForCrc}${checksum}`;
}

/**
 * Generates dynamic VietQR QuickLink image URL.
 * Automatically formats query parameters for VietQR CDN image gateway.
 */
export function generateVietQrUrl(options: VietQrOptions): string {
  const bankId = options.bankId || DEFAULT_BANK_CONFIG.bankId;
  const accountNumber = options.accountNumber || DEFAULT_BANK_CONFIG.accountNumber;
  const accountName = options.accountName || DEFAULT_BANK_CONFIG.accountName;
  const template = options.template || 'compact2';
  const amount = options.amount ? Math.round(options.amount) : 0;
  const description = (options.description || '').trim();

  const baseUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-${template}.png`;
  const params = new URLSearchParams();

  if (amount > 0) {
    params.set('amount', amount.toString());
  }
  if (description) {
    params.set('addInfo', description);
  }
  if (accountName) {
    params.set('accountName', accountName);
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Extracts Quotation / Invoice number from transaction content / bank memo.
 * Detects patterns like 'DH-2026-0001', 'CN-2026-0001', 'HD-2026-0001', 'DH20260001', etc.
 */
export function extractQuotationNumberFromContent(content: string): string | null {
  if (!content) return null;

  const normalized = content.toUpperCase().trim();

  // Pattern 1: Standard prefix with hyphen/space (DH-2026-0001, CN-2026-0002, HD-2026-0003)
  const standardMatch = normalized.match(/\b(DH|CN|HD)[-_ ]?(\d{4})[-_ ]?(\d{3,5})\b/);
  if (standardMatch) {
    const prefix = standardMatch[1];
    const year = standardMatch[2];
    const seq = standardMatch[3].padStart(4, '0');
    return `${prefix}-${year}-${seq}`;
  }

  // Pattern 2: Generic code matching (DH-XXXXX, CN-XXXXX)
  const genericMatch = normalized.match(/\b(DH|CN|HD)-[A-Z0-9_-]+\b/);
  if (genericMatch) {
    return genericMatch[0];
  }

  return null;
}
