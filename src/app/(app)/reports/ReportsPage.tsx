"use client";

import { FileBarChart } from 'lucide-react';
import { useReportGenerator } from './hooks/useReportGenerator';
import { exportExcelReport } from './utils/export';
import { reportTitleMap } from './utils/headers';
import { ReportFilters } from './components/ReportFilters';
import { ReportTable } from './components/ReportTable';

export function ReportsPage() {
  const {
    reportType,
    setReportType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    data,
    loading,
    generated,
    setGenerated,
    generateReport,
    toast,
  } = useReportGenerator();

  const handleReportTypeChange = (type: typeof reportType) => {
    setReportType(type);
    setGenerated(false);
  };

  const exportExcel = () => exportExcelReport(data, reportType, toast);
  const printReport = () => window.print();

  const reportTitle = reportTitleMap[reportType];

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><FileBarChart size={22} /></div>
        <div>
          <h1 className="text-xl font-bold text-[#343494]">Reports</h1>
          <p className="text-sm text-gray-500">Generate and export IT asset reports</p>
        </div>
      </div>

      <ReportFilters
        reportType={reportType}
        onReportTypeChange={handleReportTypeChange}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        loading={loading}
        generated={generated}
        onGenerate={generateReport}
        onExportExcel={exportExcel}
        onPrint={printReport}
      />

      {generated && (
        <ReportTable
          data={data}
          reportType={reportType}
          reportTitle={reportTitle}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}
    </div>
  );
}
