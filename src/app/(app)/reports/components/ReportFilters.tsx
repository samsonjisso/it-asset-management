"use client";

import { Printer, FileSpreadsheet } from "lucide-react";
import { Button, SelectInput, TextInput } from "@/components/FormControls";
import { ReportType } from "../types";

interface ReportFiltersProps {
  reportType: ReportType;
  onReportTypeChange: (type: ReportType) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  loading: boolean;
  generated: boolean;
  onGenerate: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
}

export function ReportFilters({
  reportType,
  onReportTypeChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  loading,
  generated,
  onGenerate,
  onExportExcel,
  onPrint,
}: ReportFiltersProps) {
  return (
    <div className="no-print bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Report Configuration</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Report Type
          </label>
          <SelectInput
            value={reportType}
            onChange={(e) => onReportTypeChange(e.target.value as ReportType)}
          >
            <option value="pc">PC Registration</option>
            <option value="asset">Asset Registration</option>
            <option value="ip">IP Address Management</option>
            <option value="license">License Registration</option>
            <option value="device">Device Registration</option>
            <option value="server">Server Registration</option>
            <option value="all">All Assets (Combined)</option>
          </SelectInput>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">From Date</label>
          <TextInput
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">To Date</label>
          <TextInput
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="primary" onClick={onGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Report"}
        </Button>
        {generated && (
          <>
            <Button variant="gold" onClick={onExportExcel}>
              <FileSpreadsheet size={16} /> Export Excel
            </Button>
            <Button variant="outline" onClick={onPrint}>
              <Printer size={16} /> Print Report
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
