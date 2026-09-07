import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportStats } from './reportStats';

const NAVY: [number, number, number] = [56, 53, 163];
const NAVY_DARK: [number, number, number] = [25, 23, 72];
const GOLD: [number, number, number] = [255, 171, 0];
const GRAY_TEXT: [number, number, number] = [90, 97, 112];
const LIGHT_BG: [number, number, number] = [245, 246, 250];
const RED: [number, number, number] = [239, 68, 68];
const GREEN: [number, number, number] = [16, 185, 129];
const AMBER: [number, number, number] = [245, 158, 11];
const BLUE: [number, number, number] = [12, 102, 228];
const GRAY: [number, number, number] = [156, 163, 175];

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 40;

let cachedLogo: string | null = null;
async function loadLogoDataUrl(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const res = await fetch('/assets/image.png');
    const blob = await res.blob();
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return cachedLogo;
  } catch {
    return null;
  }
}

interface PdfContext {
  doc: jsPDF;
  logo: string | null;
  reportTitle: string;
  generatedAt: Date;
  periodLabel: string | null;
}

function drawHeader(ctx: PdfContext) {
  const { doc, logo, reportTitle, generatedAt, periodLabel } = ctx;
  doc.setFillColor(...NAVY_DARK);
  doc.rect(0, 0, PAGE_W, 62, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 58, 'F');

  if (logo) {
    try { doc.addImage(logo, 'PNG', MARGIN, 12, 34, 34); } catch { /* ignore bad image */ }
  }
  const textX = logo ? MARGIN + 44 : MARGIN;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Goh Betoch Bank', textX, 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text('IT Asset Inventory Management Portal', textX, 39);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(reportTitle, PAGE_W - MARGIN, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 224, 235);
  doc.text(`Generated: ${generatedAt.toLocaleString()}`, PAGE_W - MARGIN, 34, { align: 'right' });
  if (periodLabel) doc.text(periodLabel, PAGE_W - MARGIN, 45, { align: 'right' });
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setDrawColor(...LIGHT_BG);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, PAGE_H - 38, PAGE_W - MARGIN, PAGE_H - 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  doc.text('Goh Betoch Bank - Asset Inventory Management Portal - Developed by Information Systems Department', MARGIN, PAGE_H - 24);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 24, { align: 'right' });
}

function sectionTitle(doc: jsPDF, title: string, x: number, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...NAVY_DARK);
  doc.text(title, x, y);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(x, y + 4, x + 28, y + 4);
  return y + 20;
}

// Small horizontal bar chart: one row per item, label + value + proportional bar.
function drawBarList(doc: jsPDF, x: number, y: number, w: number, items: { name: string; count: number }[], color: [number, number, number]): number {
  if (items.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('No data available', x, y + 8);
    return y + 20;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  const labelW = 90;
  const barW = w - labelW - 34;
  let cy = y;
  items.slice(0, 8).forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_TEXT);
    const label = item.name.length > 18 ? item.name.slice(0, 17) + '…' : item.name;
    doc.text(label, x, cy + 7);
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(x + labelW, cy, barW, 9, 1.5, 1.5, 'F');
    const filled = Math.max((item.count / max) * barW, 2);
    doc.setFillColor(...color);
    doc.roundedRect(x + labelW, cy, filled, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY_DARK);
    doc.text(String(item.count), x + labelW + barW + 6, cy + 7.5);
    cy += 16;
  });
  return cy + 6;
}

// Proportional stacked bar with a legend — used for status breakdowns
// (used/available, license status, server status). The legend wraps
// onto additional lines when the segment labels don't fit in `w`, so
// a long legend (e.g. 3 license-status labels) never runs past the
// column and into whatever is drawn next to it.
function drawStackedBar(doc: jsPDF, x: number, y: number, w: number, segments: { label: string; value: number; color: [number, number, number] }[]): number {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const barH = 16;
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(x, y, w, barH, 3, 3, 'F');
  if (total > 0) {
    let cx = x;
    segments.forEach((seg) => {
      if (seg.value <= 0) return;
      const segW = (seg.value / total) * w;
      doc.setFillColor(...seg.color);
      doc.rect(cx, y, segW, barH, 'F');
      cx += segW;
    });
  }
  let ly = y + barH + 14;
  let lx = x;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  segments.forEach((seg) => {
    const text = `${seg.label}: ${seg.value}`;
    const itemW = 7 + 3 + doc.getTextWidth(text) + 20;
    if (lx + itemW > x + w && lx > x) {
      lx = x;
      ly += 16;
    }
    doc.setFillColor(...seg.color);
    doc.rect(lx, ly - 6, 7, 7, 'F');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(text, lx + 10, ly);
    lx += itemW;
  });
  return ly + 12;
}

function statBox(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: number) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...LIGHT_BG);
  doc.roundedRect(x, y, w, h, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY_DARK);
  doc.text(String(value), x + 10, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(label, x + 10, y + 36, { maxWidth: w - 16 });
}

export interface PdfReportOptions {
  reportType: string;
  reportTitle: string;
  headers: string[];
  rows: any[][];
  stats: ReportStats;
  periodLabel: string | null;
  generatedByName?: string;
}

export async function generatePdfReport(opts: PdfReportOptions) {
  const { reportTitle, headers, rows, stats, periodLabel, generatedByName } = opts;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const logo = await loadLogoDataUrl();
  const generatedAt = new Date();
  const ctx: PdfContext = { doc, logo, reportTitle, generatedAt, periodLabel };

  // ---- Page 1: Report Dashboard / Executive Summary ----
  drawHeader(ctx);
  let y = 84;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY_DARK);
  doc.text(reportTitle, MARGIN, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY_TEXT);
  const summaryText = `This report presents the ${reportTitle.toLowerCase()} for Goh Betoch Bank's IT asset inventory, covering ${rows.length.toLocaleString()} record(s)${periodLabel ? ` (${periodLabel})` : ''}. Generated on ${generatedAt.toLocaleDateString()}${generatedByName ? ` by ${generatedByName}` : ''}.`;
  const summaryLines = doc.splitTextToSize(summaryText, PAGE_W - MARGIN * 2);
  doc.text(summaryLines, MARGIN, y);
  y += summaryLines.length * 12 + 14;

  y = sectionTitle(doc, 'Summary Statistics', MARGIN, y);
  const boxW = (PAGE_W - MARGIN * 2 - 3 * 8) / 4;
  const boxH = 44;
  const statItems: [string, number][] = [
    ['Total Assets', stats.totalAssets], ['Total PCs', stats.totalPCs],
    ['Total Servers', stats.totalServers], ['Network Devices', stats.totalNetworkDevices],
    ['Total Licenses', stats.totalLicenses], ['Total IP Addresses', stats.totalIPs],
    ['Used IP Addresses', stats.usedIPs], ['Available IP Addresses', stats.availableIPs],
  ];
  statItems.forEach((item, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    statBox(doc, MARGIN + col * (boxW + 8), y + row * (boxH + 8), boxW, boxH, item[0], item[1]);
  });
  y += 2 * (boxH + 8) + 12;

  const colW = (PAGE_W - MARGIN * 2 - 20) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 20;
  const chartsTop = sectionTitle(doc, 'Assets by Department', leftX, y);
  const rightTop = sectionTitle(doc, 'Assets by Branch', rightX, y);
  const leftBottom = drawBarList(doc, leftX, chartsTop, colW, stats.assetsByDepartment, NAVY);
  const rightBottom = drawBarList(doc, rightX, rightTop, colW, stats.assetsByBranch, GOLD);
  y = Math.max(leftBottom, rightBottom) + 6;

  const y2 = sectionTitle(doc, 'IP Address Utilization', leftX, y);
  const y2b = drawStackedBar(doc, MARGIN, y2, colW, [
    { label: 'Used', value: stats.usedIPs, color: RED },
    { label: 'Available', value: stats.availableIPs, color: GREEN },
  ]);
  const y3 = sectionTitle(doc, 'License Status', rightX, y);
  const y3b = drawStackedBar(doc, rightX, y3, colW, [
    { label: 'Active', value: stats.licenseStatus.active, color: GREEN },
    { label: 'Expiring Soon', value: stats.licenseStatus.expiringSoon, color: AMBER },
    { label: 'Expired', value: stats.licenseStatus.expired, color: RED },
  ]);
  y = Math.max(y2b, y3b) + 6;

  const y4 = sectionTitle(doc, 'Server Status', leftX, y);
  drawStackedBar(doc, MARGIN, y4, colW, [
    { label: 'Production', value: stats.serverStatus.production, color: RED },
    { label: 'Test', value: stats.serverStatus.test, color: BLUE },
    { label: 'Standby', value: stats.serverStatus.standby, color: GRAY },
  ]);

  // ---- Page 2+: Detailed data table ----
  doc.addPage();
  drawHeader(ctx);

  autoTable(doc, {
    startY: 78,
    margin: { top: 78, left: MARGIN, right: MARGIN, bottom: 50 },
    head: [headers],
    body: rows.map((r) => r.map((v) => (v === null || v === undefined || v === '' ? '-' : String(v)))),
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 4, textColor: [55, 62, 77], lineColor: [232, 234, 240], lineWidth: 0.5 },
    // Flat, muted header (light gray fill, dark navy text) rather than a
    // bold color block - reads as a professional printed report table
    // instead of a UI-style colored header.
    headStyles: { fillColor: [247, 248, 249], textColor: NAVY_DARK, fontStyle: 'bold', fontSize: 7.8, lineColor: [225, 227, 234], lineWidth: 0.5 },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    tableLineColor: [225, 227, 234],
    tableLineWidth: 0.5,
    // The table starts on a page we already headered manually (global
    // page 2); autoTable's own pageNumber counter starts at 1 for that
    // same page, so only pages after the first need the header redrawn.
    willDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader(ctx);
    },
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY_DARK);
  const finalY = (doc as any).lastAutoTable?.finalY ?? 78;
  if (finalY < PAGE_H - 60) {
    doc.text(`Total Records: ${rows.length}`, MARGIN, finalY + 18);
  }

  // Footers on every page, now that total page count is known.
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  const filename = `GBB_IT_Asset_Report_${opts.reportType}_${generatedAt.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
