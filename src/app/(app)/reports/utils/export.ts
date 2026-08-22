import { ReportRow, ReportType, ToastFn } from "../types";
import { getHeaders, getRowValues } from "./headers";

export const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const exportExcelReport = (
  data: ReportRow[],
  reportType: ReportType,
  toast: ToastFn,
) => {
  if (data.length === 0) {
    toast("No data to export", "error");
    return;
  }
  // Generate Excel-compatible XML (SpreadsheetML)
  const headers = getHeaders(reportType);
  const rows = data.map((row) => getRowValues(row, reportType));

  let xml =
    '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Worksheet ss:Name="Report">\n<Table>\n';

  // Header row
  xml += "<Row>";
  headers.forEach((h) => {
    xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
  });
  xml += "</Row>\n";

  // Data rows
  rows.forEach((row) => {
    xml += "<Row>";
    row.forEach((val) => {
      xml += `<Cell><Data ss:Type="String">${escapeXml(String(val ?? ""))}</Data></Cell>`;
    });
    xml += "</Row>\n";
  });

  xml += "</Table>\n</Worksheet>\n</Workbook>";

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `GBB_IT_Asset_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Excel file exported", "success");
};
