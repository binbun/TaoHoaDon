import { prisma } from '../prisma';
import { calculateQuotationTotals } from '@taohoadon/shared';

/**
 * Generates the next sequential quotation number in format: DH-YYYY-XXXX (e.g. DH-2026-0001)
 */
export async function generateQuotationNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `DH-${currentYear}-`;

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
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  const formattedSeq = String(nextSequence).padStart(4, '0');
  return `${prefix}${formattedSeq}`;
}

export { calculateQuotationTotals };
