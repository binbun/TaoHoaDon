import { prisma } from '../prisma';
import { calculateQuotationTotals } from '@taohoadon/shared';

/**
 * Generates the next sequential quotation or credit note number in format: [PREFIX]-YYYY-XXXX
 * (e.g. DH-2026-0001 or CN-2026-0001) with collision-resistant verification.
 */
export async function generateQuotationNumber(customPrefix?: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = customPrefix || `DH-${currentYear}-`;

  const latestQuote = await prisma.quotation.findFirst({
    where: {
      quotationNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      quotationNumber: 'desc',
    },
    select: {
      quotationNumber: true,
    },
  });

  let nextSequence = 1;
  if (latestQuote && latestQuote.quotationNumber) {
    const parts = latestQuote.quotationNumber.split('-');
    if (parts.length >= 3) {
      const parsed = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  // Double-check collision resistance in case of manual entries
  let candidate = `${prefix}${String(nextSequence).padStart(4, '0')}`;
  let exists = await prisma.quotation.findUnique({
    where: { quotationNumber: candidate },
    select: { id: true },
  });

  while (exists) {
    nextSequence += 1;
    candidate = `${prefix}${String(nextSequence).padStart(4, '0')}`;
    exists = await prisma.quotation.findUnique({
      where: { quotationNumber: candidate },
      select: { id: true },
    });
  }

  return candidate;
}

export { calculateQuotationTotals };
