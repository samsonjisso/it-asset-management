import ExcelJS from "exceljs";
import { ReportStats } from "./reportStats";

const NAVY = "FF3835A3";
const NAVY_DARK = "FF191748";
const LIGHT = "FFF5F6FA";
const LIGHT_HEADER = "FFF7F8F9";
const BORDER = "FFE1E3EA";
const WHITE = "FFFFFFFF";

export interface ExcelReportOptions {
  reportType: string;
  reportTitle: string;
  headers: string[];
  rows: any[][];
  stats: ReportStats;
  periodLabel: string | null;
  generatedByName?: string;
}

export async function generateExcelReport(opts: ExcelReportOptions) {
  const {
    reportType,
    reportTitle,
    headers,
    rows,
    stats,
    periodLabel,
    generatedByName,
  } = opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Goh Betoch Bank - IT Asset Inventory Portal";
  wb.created = new Date();

  // ---- Summary sheet ----
  const summary = wb.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
  });
  summary.columns = [
    { width: 28 },
    { width: 20 },
    { width: 28 },
    { width: 20 },
  ];

  summary.mergeCells("A1:D1");
  const titleCell = summary.getCell("A1");
  titleCell.value = "Goh Betoch Bank — IT Asset Inventory Management Portal";
  titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: NAVY_DARK },
  };
  summary.getRow(1).height = 30;

  summary.mergeCells("A2:D2");
  const subtitleCell = summary.getCell("A2");
  subtitleCell.value = reportTitle;
  subtitleCell.font = { bold: true, size: 12, color: { argb: NAVY_DARK } };

  summary.mergeCells("A3:D3");
  const metaCell = summary.getCell("A3");
  metaCell.value = `Generated: ${new Date().toLocaleString()}${generatedByName ? `  |  By: ${generatedByName}` : ""}${periodLabel ? `  |  Period: ${periodLabel}` : ""}`;
  metaCell.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };

  let r = 5;
  const sectionHeader = (title: string) => {
    summary.mergeCells(`A${r}:D${r}`);
    const c = summary.getCell(`A${r}`);
    c.value = title;
    c.font = { bold: true, size: 11, color: { argb: WHITE } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    summary.getRow(r).height = 20;
    r += 1;
  };

  sectionHeader("Summary Statistics");
  const statPairs: [string, number][] = [
    ["Total Assets", stats.totalAssets],
    ["Total PCs", stats.totalPCs],
    ["Total Servers", stats.totalServers],
    ["Total Network Devices", stats.totalNetworkDevices],
    ["Total Licenses", stats.totalLicenses],
    ["Total IP Addresses", stats.totalIPs],
    ["Used IP Addresses", stats.usedIPs],
    ["Available IP Addresses", stats.availableIPs],
  ];
  for (let i = 0; i < statPairs.length; i += 2) {
    const currentPair = statPairs[i];
    if (!currentPair) continue;
    const row = summary.getRow(r);
    row.getCell(1).value = currentPair[0];
    row.getCell(1).font = { color: { argb: "FF5A6170" } };
    row.getCell(2).value = currentPair[1];
    row.getCell(2).font = { bold: true, color: { argb: NAVY_DARK } };
    const nextPair = statPairs[i + 1];
    if (nextPair) {
      row.getCell(3).value = nextPair[0];
      row.getCell(3).font = { color: { argb: "FF5A6170" } };
      row.getCell(4).value = nextPair[1];
      row.getCell(4).font = { bold: true, color: { argb: NAVY_DARK } };
    }
    if (i % 4 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: LIGHT },
      };
    }
    r += 1;
  }
  r += 1;

  const table = (title: string, items: { name: string; count: number }[]) => {
    sectionHeader(title);
    summary.getCell(`A${r}`).value = "Name";
    summary.getCell(`B${r}`).value = "Count";
    summary.getRow(r).font = { bold: true, color: { argb: NAVY_DARK } };
    r += 1;
    if (items.length === 0) {
      summary.getCell(`A${r}`).value = "No data available";
      summary.getCell(`A${r}`).font = {
        italic: true,
        color: { argb: "FF9CA3AF" },
      };
      r += 1;
    } else {
      items.forEach((item, idx) => {
        const row = summary.getRow(r);
        row.getCell(1).value = item.name;
        row.getCell(2).value = item.count;
        if (idx % 2 === 0)
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: LIGHT },
          };
        r += 1;
      });
    }
    r += 1;
  };

  table("Assets by Department", stats.assetsByDepartment);
  table("Assets by Branch", stats.assetsByBranch);
  table("Assets by Device Type", stats.assetsByType);

  sectionHeader("License Status");
  (["active", "expiringSoon", "expired"] as const).forEach((k) => {
    const labels = {
      active: "Active",
      expiringSoon: "Expiring Soon (≤30 days)",
      expired: "Expired",
    };
    summary.getRow(r).getCell(1).value = labels[k];
    summary.getRow(r).getCell(2).value = stats.licenseStatus[k];
    r += 1;
  });
  r += 1;

  sectionHeader("Server Status (by Environment)");
  (["production", "test", "standby"] as const).forEach((k) => {
    summary.getRow(r).getCell(1).value = k.charAt(0).toUpperCase() + k.slice(1);
    summary.getRow(r).getCell(2).value = stats.serverStatus[k];
    r += 1;
  });

  summary.pageSetup = {
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };

  // ---- Data sheet ----
  const dataSheet = wb.addWorksheet("Report Data", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 1 }],
  });

  // Size each column from the longest value actually in it (header or any
  // cell), not just the header text — otherwise wide data (asset names,
  // locations, models, etc.) gets clipped/overlapped instead of laid out
  // in its own column. Widths are still clamped to a sane print-friendly
  // range so a single long outlier can't blow the sheet out.
  const colWidths = headers.map((h, i) => {
    let longest = h.length;
    for (const rowVals of rows) {
      const v = rowVals[i];
      const len = v === null || v === undefined ? 0 : String(v).length;
      if (len > longest) longest = len;
    }
    return Math.max(12, Math.min(32, longest + 3));
  });
  dataSheet.columns = headers.map((h, i) => ({
    header: h,
    key: `col${i}`,
    width: colWidths[i],
  }));

  const headerRow = dataSheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    // Flat, muted header (light gray fill, dark navy text) rather than a
    // bold color block - reads as a professional printed report table.
    cell.font = { bold: true, color: { argb: NAVY_DARK }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: LIGHT_HEADER },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER } },
      bottom: { style: "medium", color: { argb: NAVY } },
      left: { style: "thin", color: { argb: BORDER } },
      right: { style: "thin", color: { argb: BORDER } },
    };
  });

  rows.forEach((rowVals, i) => {
    const row = dataSheet.addRow(
      rowVals.map((v) => (v === null || v === undefined || v === "" ? "" : v)),
    );
    row.height = 18;
    row.eachCell((cell) => {
      cell.font = { size: 9.5, color: { argb: "FF374151" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: false,
      };
      cell.border = {
        bottom: { style: "hair", color: { argb: BORDER } },
        left: { style: "hair", color: { argb: BORDER } },
        right: { style: "hair", color: { argb: BORDER } },
      };
      if (i % 2 === 1)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: LIGHT },
        };
    });
  });

  dataSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  const totalRow = dataSheet.addRow([`Total Records: ${rows.length}`]);
  totalRow.height = 20;
  dataSheet.mergeCells(totalRow.number, 1, totalRow.number, headers.length);
  totalRow.getCell(1).font = { bold: true, color: { argb: NAVY_DARK } };
  totalRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
  totalRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: LIGHT_HEADER },
  };
  totalRow.getCell(1).border = {
    top: { style: "thin", color: { argb: BORDER } },
    bottom: { style: "thin", color: { argb: BORDER } },
  };

  // Fit to one page wide when printed, and landscape by default so
  // reports with many columns (e.g. the Asset report's 13 columns)
  // don't get sliced across pages or squeezed unreadably.
  dataSheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `GBB_IT_Asset_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
