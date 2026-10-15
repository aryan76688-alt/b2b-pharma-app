import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { saveInvoiceToLocalStorage } from './storage';

export interface InvoiceItem {
  productName: string;
  packing?: string;
  mfg?: string;
  mrp: number;
  batchNo?: string;
  expiryDate?: string;
  quantity: number;
  freeQuantity?: number;
  ptr: number;
  discountPercent?: number;
  hsn?: string;
  gstPercent?: number;
  lineTotal: number;
}

export interface InvoiceParty {
  partyName: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  mobile?: string;
  dlNumber?: string;
  panNumber?: string;
  gstNumber?: string;
  outstanding?: number;
}

export interface InvoiceOrder {
  id: string;
  orderNumber: string;
  orderDate?: string | Date;
  salesmanName?: string;
  items: InvoiceItem[];
  subtotal?: number;
  discountAmount?: number;
  totalAmount: number;
  remarks?: string;
}

/**
 * Generates an exact 1-to-1 replica of the MARG ERP 9 Tax Invoice from Shreeji Healthcare
 * Matching the authentic invoice:
 * - SHREEJI HEALTHCARE (A UNIT OF SHREEJI 7)
 * - GSTIN: 24DDBPP1598D2ZK, DL NO: 20B-179295, 21B-179296
 * - 14-Column Marg Layout with Batch, Exp, Qty, Free, PTR, HSN, GST%
 * - Bank of Baroda Account Details & Marg Tax Breakdown Formula
 */
export async function generateInvoicePDF(order: InvoiceOrder, party: InvoiceParty): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;

  // Header Data
  const companyName = 'SHREEJI HEALTHCARE';
  const companyUnit = '(A UNIT OF SHREEJI 7)';
  const companyAddress = 'SHOP 3&4 GF-NARAYAN COMPLEX,DEHGAM-MODASA ROAD, DEHGAM-382305.';
  const companyPhone = 'Phone : 9924544283 E-Mail : shreejiseven@gmail.com';
  const companyGst = 'GSTIN : 24DDBPP1598D2ZK  D.L.NO : 20B-179295 , 21B- 179296';

  let startY = margin + 2;

  // Draw Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(companyName, pageWidth / 2, startY, { align: 'center' });

  startY += 4.5;
  doc.setFontSize(8.5);
  doc.text(companyUnit, pageWidth / 2, startY, { align: 'center' });

  startY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(companyAddress, pageWidth / 2, startY, { align: 'center' });

  startY += 3.5;
  doc.text(companyPhone, pageWidth / 2, startY, { align: 'center' });

  startY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text(companyGst, pageWidth / 2, startY, { align: 'center' });

  // Outer border & divider line
  startY += 3;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(margin, startY, pageWidth - margin, startY);

  // Subheader: GST INVOICE, Original for Buyer, CREDIT
  startY += 4;
  doc.setFontSize(9.5);
  doc.text('GST INVOICE', margin + 2, startY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Original for Buyer', pageWidth / 2, startY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('CREDIT', pageWidth - margin - 2, startY, { align: 'right' });

  startY += 2.5;
  doc.line(margin, startY, pageWidth - margin, startY);

  // Bill To (Party) Details & Invoice Meta Box
  startY += 4;
  const metaStartY = startY;

  // Left Column: Buyer Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`To, ${party.partyName.toUpperCase()}`, margin + 2, startY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  if (party.address || party.city) {
    startY += 3.5;
    const addrLine = [party.address, party.city].filter(Boolean).join(', ');
    doc.text(addrLine.slice(0, 55), margin + 2, startY);
  }

  startY += 3.5;
  doc.text(`State : ${party.stateCode || '24'} (Gujarat)`, margin + 2, startY);

  startY += 3.5;
  doc.text(`Ph.No.    : ${party.mobile || '-'}`, margin + 2, startY);

  startY += 3.5;
  doc.text(`D.L.NO.  : ${party.dlNumber || '-'}`, margin + 2, startY);

  startY += 3.5;
  doc.text(`IT Pan No: ${party.panNumber || 'CASH'}`, margin + 2, startY);

  if (party.gstNumber) {
    startY += 3.5;
    doc.text(`GSTIN    : ${party.gstNumber}`, margin + 2, startY);
  }

  // Right Column: Invoice Meta
  const rightColX = pageWidth - margin - 55;
  let rY = metaStartY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const invNo = order.orderNumber.replace('#', '') || 'A012893';
  doc.text(`Invoice No. : : ${invNo} :`, rightColX, rY);

  rY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const orderDateObj = order.orderDate ? new Date(order.orderDate) : new Date();
  const dateFormatted = `${String(orderDateObj.getDate()).padStart(2, '0')}-${String(orderDateObj.getMonth() + 1).padStart(2, '0')}-${orderDateObj.getFullYear()}`;
  doc.text(`Date : ${dateFormatted}`, rightColX, rY);

  rY += 3.5;
  doc.text(`Challan No. : -`, rightColX, rY);

  rY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Sales Man : ${(order.salesmanName || 'TUSHAR').toUpperCase()}`, rightColX, rY);

  const headerBottomY = Math.max(startY, rY) + 3;
  doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);

  // Table Preparation
  const tableHeaders = [
    'Sn.',
    'Item Name',
    'Pack',
    'Mfg',
    'M.R.P.',
    'Batch No.',
    'Exp.Dt.',
    'Qty',
    'Free',
    'Rate',
    'Disc%',
    'HSN',
    'Gst%',
    'Amount',
  ];

  let totalQty = 0;
  let totalFree = 0;
  let totalMrpValue = 0;
  let totalTaxable = 0;
  const gstBreakdown: Record<number, number> = {};

  const tableRows = order.items.map((item, idx) => {
    const qty = Number(item.quantity) || 0;
    const free = Number(item.freeQuantity) || 0;
    const ptr = Number(item.ptr) || 0;
    const mrp = Number(item.mrp) || ptr * 1.25;
    const disc = Number(item.discountPercent) || 0;
    const gst = Number(item.gstPercent) || 5;
    const lineAmt = item.lineTotal || Math.max(0, qty * ptr - (qty * ptr * disc) / 100);

    totalQty += qty;
    totalFree += free;
    totalMrpValue += mrp * (qty + free);
    totalTaxable += lineAmt;

    gstBreakdown[gst] = (gstBreakdown[gst] || 0) + lineAmt;

    const expStr = item.expiryDate
      ? `${new Date(item.expiryDate).getMonth() + 1}/${String(new Date(item.expiryDate).getFullYear()).slice(-2)}`
      : '12/28';

    return [
      String(idx + 1) + '.',
      (item.productName || 'MEDICINE').toUpperCase(),
      item.packing || '1*10',
      (item.mfg || 'SHRE').slice(0, 4).toUpperCase(),
      mrp.toFixed(2),
      (item.batchNo || 'B' + (1000 + idx)).toUpperCase(),
      expStr,
      String(qty),
      String(free),
      ptr.toFixed(2),
      disc > 0 ? disc.toFixed(1) + '%' : '0.00',
      item.hsn || '300490',
      gst + '%',
      lineAmt.toFixed(2),
    ];
  });

  // Calculate GST Amounts
  let totalSgst = 0;
  let totalCgst = 0;
  const gstSummaryParts: string[] = [];

  Object.entries(gstBreakdown).forEach(([rateStr, taxable]) => {
    const rate = Number(rateStr);
    const halfRate = rate / 2;
    const taxEach = (taxable * halfRate) / 100;
    totalSgst += taxEach;
    totalCgst += taxEach;
    gstSummaryParts.push(
      `GST ${taxable.toFixed(2)}*${halfRate.toFixed(1)}+${halfRate.toFixed(1)}%=${taxEach.toFixed(2)}SGST+${taxEach.toFixed(2)}CGST`
    );
  });

  const grandTotalRaw = totalTaxable + totalSgst + totalCgst;
  const grandTotalRounded = Math.round(grandTotalRaw);
  const roundOff = grandTotalRounded - grandTotalRaw;

  // Render AutoTable with Marg ERP 9 High-Density Matrix Styling
  (doc as any).autoTable({
    head: [tableHeaders],
    body: tableRows,
    startY: headerBottomY + 1,
    theme: 'plain',
    styles: {
      fontSize: 6.8,
      cellPadding: 0.8,
      font: 'helvetica',
      textColor: [0, 0, 0],
      lineWidth: 0.15,
      lineColor: [180, 180, 180],
    },
    headStyles: {
      fontStyle: 'bold',
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontSize: 7,
      lineWidth: 0.2,
      lineColor: [40, 40, 40],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' }, // Sn
      1: { cellWidth: 46 },                  // Item Name
      2: { cellWidth: 13 },                  // Pack
      3: { cellWidth: 10 },                  // Mfg
      4: { cellWidth: 12, halign: 'right' }, // MRP
      5: { cellWidth: 18 },                  // Batch
      6: { cellWidth: 11, halign: 'center' },// Exp
      7: { cellWidth: 9, halign: 'right' },  // Qty
      8: { cellWidth: 8, halign: 'right' },  // Free
      9: { cellWidth: 13, halign: 'right' }, // Rate
      10: { cellWidth: 10, halign: 'right' },// Disc%
      11: { cellWidth: 12, halign: 'center' },// HSN
      12: { cellWidth: 9, halign: 'center' },// Gst%
      13: { cellWidth: 16, halign: 'right', fontStyle: 'bold' }, // Amount
    },
    margin: { left: margin, right: margin, bottom: 42 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 1;

  // Draw Horizontal Divider
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(margin, finalY, pageWidth - margin, finalY);

  // Footer Section: Totals, Bank Details, and GST Tax Breakdown Formula
  let fY = finalY + 3.5;

  // Subtotal Summary Row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`MRP VALUE:- ${totalMrpValue.toFixed(2)}`, margin + 2, fY);
  doc.text(`TOTAL QTY: ${totalQty}`, margin + 55, fY);
  doc.text(`FREE: ${totalFree}`, margin + 85, fY);
  doc.text(`TAXABLE: ${totalTaxable.toFixed(2)}`, pageWidth - margin - 35, fY);

  fY += 2.5;
  doc.line(margin, fY, pageWidth - margin, fY);

  // Left Bank & Transport Block
  let leftFY = fY + 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Transport : DIRECT DELIVERY', margin + 2, leftFY);
  leftFY += 3;
  doc.text('L.R.No.   : -', margin + 2, leftFY);
  leftFY += 3;
  doc.text(`Receiver   : ${party.partyName.slice(0, 30)}`, margin + 2, leftFY);
  leftFY += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('BANK DETAIL:- BANK OF BARODA A/C:- 03450500002709', margin + 2, leftFY);
  leftFY += 3;
  doc.text('IFSC CODE:- BABRBODEHGAM', margin + 2, leftFY);

  leftFY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  const gstSummaryString = gstSummaryParts.join(', ') + ' , C E S S : 0 % = 0';
  doc.text(gstSummaryString.slice(0, 95), margin + 2, leftFY);

  leftFY += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`OUTSTANDING : ${(Number(party.outstanding) || 0).toFixed(2)}`, margin + 2, leftFY);

  // Right Block: GST Totals, Round Off & Grand Total
  let rightFY = fY + 3.5;
  const numX = pageWidth - margin - 2;
  const labelX = pageWidth - margin - 45;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Cash Discount Total', labelX, rightFY);
  doc.text('0.00', numX, rightFY, { align: 'right' });

  rightFY += 3;
  doc.text('Scheme Discount Total', labelX, rightFY);
  doc.text('0.00', numX, rightFY, { align: 'right' });

  rightFY += 3;
  doc.text('SGST Amount', labelX, rightFY);
  doc.text(totalSgst.toFixed(2), numX, rightFY, { align: 'right' });

  rightFY += 3;
  doc.text('CGST Amount', labelX, rightFY);
  doc.text(totalCgst.toFixed(2), numX, rightFY, { align: 'right' });

  rightFY += 3;
  doc.text('Round Off [+/-]', labelX, rightFY);
  doc.text(roundOff.toFixed(2), numX, rightFY, { align: 'right' });

  rightFY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('GRAND TOTAL', labelX, rightFY);
  doc.text(grandTotalRounded.toFixed(2), numX, rightFY, { align: 'right' });

  // Signatures & Legal Disclaimer
  const signY = Math.max(leftFY, rightFY) + 4;
  doc.line(margin, signY, pageWidth - margin, signY);

  const bottomY = signY + 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Terms & Conditions: Goods once sold will not be taken back or exchanged. Bills not paid due date will attract 24% interest.', margin + 2, bottomY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('For, SHREEJI HEALTHCARE', pageWidth - margin - 50, bottomY);
  doc.setFontSize(6.5);
  doc.text('Authorised signatory', pageWidth - margin - 40, bottomY + 4);

  // Marg Branding Line at Bottom
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text('Software By Marg : 9773233559 | Shreeji Healthcare Automated ERP', margin + 2, pageHeight - 3);

  // Generate Blob
  const pdfBlob = doc.output('blob');

  // Automatically save to local storage & initiate download
  if (typeof window !== 'undefined') {
    try {
      await saveInvoiceToLocalStorage({
        invoiceNo: invNo,
        orderNumber: order.orderNumber,
        partyName: party.partyName,
        grandTotal: grandTotalRounded,
        pdfBlob,
      });
    } catch (e) {
      console.warn('Notice: Local storage invoice save skipped:', e);
      doc.save(`ShreejiHealthcare_Invoice_${invNo}.pdf`);
    }
  }

  return pdfBlob;
}
