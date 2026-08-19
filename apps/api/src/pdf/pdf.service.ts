import puppeteer, { Browser } from 'puppeteer';
import { Quotation } from '@taohoadon/shared';
import { renderQuotationHtml } from './pdf.template';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });
  }
  return browserInstance;
}

/**
 * Generates an A4 PDF Buffer from quotation data using Puppeteer.
 */
export async function generateQuotationPdf(quotation: Quotation): Promise<Buffer> {
  const htmlContent = renderQuotationHtml(quotation);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}
