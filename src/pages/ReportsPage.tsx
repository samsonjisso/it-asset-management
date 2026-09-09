"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { GBBLogo } from "../components/GBBLogo";
import { ReportDashboard } from "../components/ReportDashboard";
import { Button, SelectInput, TextInput } from "../components/FormControls";
import {
  Printer,
  FileSpreadsheet,
  FileText,
  FileBarChart,
  LayoutDashboard,
  ArrowLeft,
  ChevronRight,
  Clock,
  Inbox,
  Monitor,
  Network,
  KeyRound,
  HardDrive,
  ServerIcon,
  Boxes,
} from "lucide-react";
import { fetchReportStats, ReportStats } from "../lib/reportStats";
import { generatePdfReport } from "../lib/pdfExport";
import { generateExcelReport } from "../lib/excelExport";

type ReportType = "pc" | "ip" | "license" | "device" | "server" | "all";

interface GeneratedReport {
  id: string;
  reportType: ReportType;
  title: string;
  data: any[];
  periodLabel: string | null;
  generatedAt: Date;
}

const REPORT_TITLES: Record<ReportType, string> = {
  pc: "PC Registration Report",
  ip: "IP Address Management Report",
  license: "License Registration Report",
  device: "Device Registration Report",
  server: "Server Registration Report",
  all: "Complete IT Asset Inventory Report",
};

// Per-type icon + gradient, reused on the report list cards so a
// generated report reads as a distinct, recognizable "document" at a
// glance rather than an entry in a plain table row.
const REPORT_STYLE: Record<
  ReportType,
  { icon: React.ReactNode; color: string }
> = {
  pc: {
    icon: <Monitor size={20} />,
    color: "bg-gradient-to-br from-brand-500 to-brand-600",
  },
  ip: {
    icon: <Network size={20} />,
    color: "bg-gradient-to-br from-indigo-500 to-indigo-600",
  },
  license: {
    icon: <KeyRound size={20} />,
    color: "bg-gradient-to-br from-amber-500 to-amber-600",
  },
  device: {
    icon: <HardDrive size={20} />,
    color: "bg-gradient-to-br from-teal-500 to-teal-600",
  },
  server: {
    icon: <ServerIcon size={20} />,
    color: "bg-gradient-to-br from-purple-500 to-purple-600",
  },
  all: {
    icon: <Boxes size={20} />,
    color: "bg-gradient-to-br from-navy-700 to-navy-600",
  },
};

function formatRelativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function ReportsPage() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("pc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  // Every generated report is kept here so it can be reopened instantly
  // from the list without re-querying. `activeReportId` is the only
  // thing that decides whether we show the list or a single open report.
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const RECENT_REPORTS_LIMIT = 4;
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const activeReport = reports.find((r) => r.id === activeReportId) ?? null;

  const [stats, setStats] = useState<ReportStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const topRef = useRef<HTMLDivElement>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const s = await fetchReportStats();
    setStats(s);
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // The page content lives inside a scrollable <main>, not the window,
  // so opening (or leaving) a report scrolls that container back to the
  // top instead of leaving the user wherever they happened to be.
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeReportId]);

  const generateReport = async () => {
    // Formal Start/End Date range validation: block submission outright
    // if both are set and the range is backwards, rather than silently
    // returning an empty/nonsensical result set.
    if (dateFrom && dateTo && dateTo < dateFrom) {
      toast("Please choose the date correctly.", "error");
      return;
    }
    setLoading(true);

    let result: any[] = [];

    if (reportType === "all") {
      const [pc, ip, lic, dev, srv] = await Promise.all([
        supabase
          .from("pc_registrations")
          .select("*, department:departments(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("ip_addresses")
          .select("*, department:departments(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("licenses")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("devices")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("servers")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      let combined = [
        ...(pc.data ?? []).map((r: any) => ({ ...r, _type: "PC" })),
        ...(ip.data ?? []).map((r: any) => ({ ...r, _type: "IP Address" })),
        ...(lic.data ?? []).map((r: any) => ({ ...r, _type: "License" })),
        ...(dev.data ?? []).map((r: any) => ({ ...r, _type: "Device" })),
        ...(srv.data ?? []).map((r: any) => ({ ...r, _type: "Server" })),
      ];
      if (dateFrom)
        combined = combined.filter(
          (r) => new Date(r.created_at) >= new Date(dateFrom),
        );
      if (dateTo)
        combined = combined.filter(
          (r) => new Date(r.created_at) <= new Date(dateTo + "T23:59:59"),
        );
      result = combined;
    } else {
      let query;
      switch (reportType) {
        case "pc":
          query = supabase
            .from("pc_registrations")
            .select("*, department:departments(name)")
            .order("created_at", { ascending: false });
          break;
        case "ip":
          query = supabase
            .from("ip_addresses")
            .select("*, department:departments(name)")
            .order("ip_address", { ascending: true });
          break;
        case "license":
          query = supabase
            .from("licenses")
            .select("*")
            .order("created_at", { ascending: false });
          break;
        case "device":
          query = supabase
            .from("devices")
            .select("*")
            .order("created_at", { ascending: false });
          break;
        case "server":
        default:
          query = supabase
            .from("servers")
            .select("*")
            .order("created_at", { ascending: false });
          break;
      }
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");
      const { data: res } = await query;
      result = res ?? [];
    }

    const periodLabel =
      dateFrom || dateTo
        ? `${dateFrom || "Start"} to ${dateTo || "Now"}`
        : null;
    const newReport: GeneratedReport = {
      id: `${reportType}-${Date.now()}`,
      reportType,
      title: REPORT_TITLES[reportType],
      data: result,
      periodLabel,
      generatedAt: new Date(),
    };

    // Newest report first, and open it straight away — no scrolling
    // down the page to find the table that was just built. This list is
    // just a temporary "recent reports" shelf, not a saved archive, so
    // it's capped at RECENT_REPORTS_LIMIT — generating a new one past
    // that just quietly drops the oldest.
    setReports((prev) => [newReport, ...prev].slice(0, RECENT_REPORTS_LIMIT));
    setActiveReportId(newReport.id);
    setLoading(false);
    toast(`Report generated: ${result.length} records`, "success");
  };

  const exportExcel = async (report: GeneratedReport) => {
    if (report.data.length === 0) {
      toast("No data to export", "error");
      return;
    }
    if (!stats) {
      toast("Stats still loading, try again shortly", "error");
      return;
    }
    setExporting("excel");
    try {
      await generateExcelReport({
        reportType: report.reportType,
        reportTitle: report.title,
        headers: getHeaders(report.reportType),
        rows: report.data.map((row) => getRowValues(row, report.reportType)),
        stats,
        periodLabel: report.periodLabel,
        generatedByName: profile?.full_name,
      });
      toast("Excel report exported", "success");
    } catch (e) {
      console.error(e);
      toast("Failed to export Excel report", "error");
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async (report: GeneratedReport) => {
    if (report.data.length === 0) {
      toast("No data to export", "error");
      return;
    }
    if (!stats) {
      toast("Stats still loading, try again shortly", "error");
      return;
    }
    setExporting("pdf");
    try {
      await generatePdfReport({
        reportType: report.reportType,
        reportTitle: report.title,
        headers: getHeaders(report.reportType),
        rows: report.data.map((row) => getRowValues(row, report.reportType)),
        stats,
        periodLabel: report.periodLabel,
        generatedByName: profile?.full_name,
      });
      toast("PDF report exported", "success");
    } catch (e) {
      console.error(e);
      toast("Failed to export PDF report", "error");
    } finally {
      setExporting(null);
    }
  };

  const getHeaders = (type: ReportType): string[] => {
    if (type === "all")
      return [
        "Type",
        "Hostname/Name",
        "IP Address",
        "Serial/Tag",
        "Department/Owner",
        "Registered Date",
      ];
    if (type === "pc")
      return [
        "Hostname",
        "Monitor Serial",
        "Asset Tag",
        "Service Tag",
        "MAC Address",
        "IP Address",
        "Department",
        "Floor",
        "Switch Port",
        "Access Switch",
        "Patch Level",
        "Registered Date",
      ];
    if (type === "ip")
      return [
        "IP Address",
        "Hostname",
        "Department",
        "Owner (Employee)",
        "MAC Address",
        "Status",
        "Registered Date",
      ];
    if (type === "license")
      return [
        "License Type",
        "Subtype",
        "Vendor",
        "License Key",
        "Quantity",
        "Effective Date",
        "Expiry Date",
        "Registered Date",
      ];
    if (type === "device")
      return [
        "Device Type",
        "Owner",
        "Model",
        "Hostname",
        "IP Address",
        "Serial Number",
        "MAC Address",
        "Location",
        "Rack",
        "Registered Date",
      ];
    if (type === "server")
      return [
        "Server Type",
        "Hostname",
        "IP Address",
        "SSH Port",
        "Environment",
        "Owner",
        "RAM",
        "CPU",
        "Storage",
        "OS Release",
        "Host Location",
        "Registered Date",
      ];
    return [];
  };

  const getRowValues = (row: any, type: ReportType): any[] => {
    const dateStr = new Date(row.created_at).toLocaleDateString();
    if (type === "all")
      return [
        row._type,
        row.hostname ?? row.ip_address ?? row.title ?? "",
        row.ip_address ?? "",
        row.serial_number ?? row.service_tag ?? "",
        row.department?.name ??
          row.owner ??
          row.ip_owner ??
          row.server_owner ??
          row.device_owner ??
          "",
        dateStr,
      ];
    if (type === "pc")
      return [
        row.hostname,
        row.monitor_serial ?? "",
        row.asset_tag ?? "N/A",
        row.service_tag ?? "",
        row.mac_address ?? "",
        row.ip_address ?? "",
        row.department?.name ?? "",
        row.floor_number ?? "",
        row.switch_port_number ?? "",
        row.access_switch_ip ?? "",
        row.patch_level_number ?? "",
        dateStr,
      ];
    if (type === "ip")
      return [
        row.ip_address,
        row.hostname ?? "",
        row.department?.name ?? "",
        row.ip_owner ?? "",
        row.mac_address ?? "",
        row.status,
        dateStr,
      ];
    if (type === "license")
      return [
        row.license_type,
        row.license_subtype ?? "",
        row.vendor ?? "",
        row.license_key ?? "N/A",
        row.number_of_licenses ?? "",
        row.effective_date ?? "",
        row.expiry_date ?? "",
        dateStr,
      ];
    if (type === "device")
      return [
        row.device_type,
        row.device_owner,
        row.device_model ?? "",
        row.hostname,
        row.ip_address ?? "N/A",
        row.serial_number ?? "",
        row.mac_address ?? "",
        row.location ?? "",
        row.rack_number ?? "",
        dateStr,
      ];
    if (type === "server")
      return [
        row.server_type,
        row.hostname,
        row.ip_address ?? "",
        row.ssh_port,
        row.environment,
        row.server_owner,
        row.ram ?? "",
        row.cpu ?? "",
        row.storage ?? "",
        row.os_release ?? "",
        row.host_location ?? "",
        dateStr,
      ];
    return [];
  };

  const printReport = () => {
    window.print();
  };

  // ─────────────────────────────────────────────────────────────
  // Detail view — a single opened report, full width, with its own
  // export/print toolbar. Reached by generating a new report or by
  // clicking a card in the "Recent Reports" list.
  // ─────────────────────────────────────────────────────────────
  if (activeReport) {
    const style = REPORT_STYLE[activeReport.reportType];
    return (
      <div className="space-y-4" ref={topRef}>
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setActiveReportId(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 transition-colors rounded-lg px-2 py-1.5 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={16} /> Back to Reports
          </button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="gold"
              onClick={() => exportPdf(activeReport)}
              disabled={exporting !== null}
            >
              <FileText size={16} />{" "}
              {exporting === "pdf" ? "Exporting..." : "Export PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={() => exportExcel(activeReport)}
              disabled={exporting !== null}
            >
              <FileSpreadsheet size={16} />{" "}
              {exporting === "excel" ? "Exporting..." : "Export Excel"}
            </Button>
            <Button variant="outline" onClick={printReport}>
              <Printer size={16} /> Print Report
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 overflow-hidden">
          {/* Print header */}
          <div className="print-area">
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-5 text-white">
              <div className="flex items-center gap-4">
                <GBBLogo size={60} />
                <div>
                  <h2 className="text-xl font-bold">Goh Betoch Bank</h2>
                  <p className="text-gold-400 text-sm font-medium">
                    IT Asset Inventory Management Portal
                  </p>
                </div>
                <div className="ml-auto text-right text-sm">
                  <p className="font-semibold">{activeReport.title}</p>
                  <p className="text-white/80">
                    Generated: {activeReport.generatedAt.toLocaleString()}
                  </p>
                  {profile?.full_name && (
                    <p className="text-white/80 text-xs">
                      By: {profile.full_name}
                    </p>
                  )}
                  {activeReport.periodLabel && (
                    <p className="text-white/80 text-xs mt-1">
                      Period: {activeReport.periodLabel}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Report summary */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-3">
              <div
                className={`no-print w-8 h-8 rounded-lg ${style.color} text-white flex items-center justify-center shrink-0`}
              >
                {style.icon}
              </div>
              <p>
                This report presents the {activeReport.title.toLowerCase()} for
                Goh Betoch Bank's IT asset inventory, covering{" "}
                <span className="font-semibold text-gray-800 dark:text-gray-100">
                  {activeReport.data.length.toLocaleString()}
                </span>{" "}
                record(s)
                {activeReport.periodLabel
                  ? ` for the period ${activeReport.periodLabel}`
                  : ""}
                .
              </p>
            </div>

            {/* Report table — a wide, multi-column header row with a single
                spanning "no records" cell reads as a broken, squeezed
                sliver of a table when there's no data, so an empty result
                gets its own centered state instead of the table at all. */}
            {activeReport.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-brand-600 text-gray-300 dark:text-gray-600 flex items-center justify-center mb-4">
                  <Inbox size={26} />
                </div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  No records found
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 max-w-sm leading-relaxed">
                  No {activeReport.title.toLowerCase()} match the selected
                  criteria
                  {activeReport.periodLabel
                    ? ` for the period ${activeReport.periodLabel}`
                    : ""}
                  . Try widening or clearing the date range and generating
                  again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="no-print mt-5"
                  onClick={() => setActiveReportId(null)}
                >
                  <ArrowLeft size={14} /> Back to Reports
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto p-6">
                <table
                  className="w-full border-collapse"
                  style={{ fontSize: "12px" }}
                >
                  <thead>
                    <tr>
                      {getHeaders(activeReport.reportType).map((h, i) => (
                        <th
                          key={i}
                          className="border border-brand-600 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 px-3 py-2 text-left font-semibold uppercase tracking-wide"
                          style={{ fontSize: "10.5px" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeReport.data.map((row, i) => (
                      <tr
                        key={row.id ?? i}
                        className={
                          i % 2 === 0
                            ? "bg-white dark:bg-gray-900"
                            : "bg-gray-50/60"
                        }
                      >
                        {getRowValues(row, activeReport.reportType).map(
                          (val, j) => (
                            <td
                              key={j}
                              className="border border-brand-600 px-3 py-1.5 text-gray-700 dark:text-gray-300"
                            >
                              {val ?? "-"}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={getHeaders(activeReport.reportType).length}
                        className="border border-brand-600 px-3 py-2 bg-gray-50 dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300"
                      >
                        Total Records: {activeReport.data.length}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // List view — dashboard overview, report configuration/generate
  // form, and a card grid of every report generated this session.
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4" ref={topRef}>
      <div className="no-print flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
          <FileBarChart size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-600">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate and export professional IT asset reports
          </p>
        </div>
      </div>

      {/* Report Dashboard — visual overview shown before generating/exporting */}
      <div className="no-print space-y-3">
        <div className="flex items-center gap-2 px-1">
          <LayoutDashboard size={16} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Report Dashboard
          </h2>
        </div>
        {statsLoading || !stats ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : (
          <ReportDashboard stats={stats} />
        )}
      </div>

      {/* Filter controls */}
      <div className="no-print bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Report Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Report Type
            </label>
            <SelectInput
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              <option value="pc">PC Registration</option>
              <option value="ip">IP Address Management</option>
              <option value="license">License Registration</option>
              <option value="device">Device Registration</option>
              <option value="server">Server Registration</option>
              <option value="all">All Assets (Combined)</option>
            </SelectInput>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              From Date
            </label>
            <TextInput
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              To Date
            </label>
            <TextInput
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="primary" onClick={generateReport} disabled={loading}>
            {loading ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* Recent reports — click a card to open that report */}
      <div className="no-print space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Clock size={16} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Recent Reports
          </h2>
          {reports.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({reports.length})
            </span>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-brand-400 p-10 text-center">
            <Inbox
              size={28}
              className="mx-auto mb-2 text-gray-300 dark:text-gray-600"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No reports generated yet.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Choose a report type above and click Generate Report to get
              started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reports.map((r) => {
              const style = REPORT_STYLE[r.reportType];
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveReportId(r.id)}
                  className="text-left bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 hover:shadow-lift hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-150 group"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl ${style.color} text-white flex items-center justify-center shadow-soft shrink-0`}
                    >
                      {style.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug">
                        {r.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {r.data.length.toLocaleString()} record
                        {r.data.length !== 1 ? "s" : ""}
                      </p>
                      {r.periodLabel && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                          Period: {r.periodLabel}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                        {formatRelativeTime(r.generatedAt)}
                      </p>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-gray-300 dark:text-gray-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
