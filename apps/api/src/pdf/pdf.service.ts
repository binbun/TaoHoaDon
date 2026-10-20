import puppeteer, { Browser } from 'puppeteer';
import { Quotation } from '@taohoadon/shared';
import { renderQuotationHtml, renderDeliverySlipHtml } from './pdf.template';

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

/**
 * Generates an A4 PDF Buffer for delivery checking slip using Puppeteer.
 */
export async function generateDeliverySlipPdf(quotation: Quotation): Promise<Buffer> {
  const htmlContent = renderDeliverySlipHtml(quotation);
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

/**
 * Generates an ultra-clear, high-resolution PNG Buffer from quotation data using Puppeteer.
 */
export async function generateQuotationPng(quotation: Quotation): Promise<Buffer> {
  const htmlContent = renderQuotationHtml(quotation);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // 800px width with 2x deviceScaleFactor yields 1600px width crisp image
    await page.setViewport({
      width: 800,
      height: 1130,
      deviceScaleFactor: 2,
    });

    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    await page.addStyleTag({
      content: `
        body {
          padding: 12mm 14mm !important;
          background: #ffffff !important;
          box-sizing: border-box;
        }
      `,
    });

    const pngBuffer = await page.screenshot({
      type: 'png',
      fullPage: true,
    });

    return Buffer.from(pngBuffer);
  } finally {
    await page.close();
  }
}

/**
 * Generates an ultra-clear, high-resolution PNG Buffer for delivery checking slip using Puppeteer.
 */
export async function generateDeliverySlipPng(quotation: Quotation): Promise<Buffer> {
  const htmlContent = renderDeliverySlipHtml(quotation);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: 800,
      height: 1130,
      deviceScaleFactor: 2,
    });

    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    await page.addStyleTag({
      content: `
        body {
          padding: 12mm 14mm !important;
          background: #ffffff !important;
          box-sizing: border-box;
        }
      `,
    });

    const pngBuffer = await page.screenshot({
      type: 'png',
      fullPage: true,
    });

    return Buffer.from(pngBuffer);
  } finally {
    await page.close();
  }
}
