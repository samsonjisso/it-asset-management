"use client";

import { GBBLogo } from "@/components/GBBLogo";
import { ReportRow, ReportType } from "../types";
import { getHeaders, getRowValues } from "../utils/headers";

interface ReportTableProps {
  data: ReportRow[];
  reportType: ReportType;
  reportTitle: string;
  dateFrom: string;
  dateTo: string;
}

export function ReportTable({
  data,
  reportType,
  reportTitle,
  dateFrom,
  dateTo,
}: ReportTableProps) {
  const headers = getHeaders(reportType);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Print header */}
      <div className="print-area">
        <div className="bg-gradient-to-r from-[#343494] to-[#4e4ec1] px-6 py-5 text-white">
          <div className="flex items-center gap-4">
            <GBBLogo size={48} />
            <div>
              <h2 className="text-xl font-bold">Goh Betoch Bank</h2>
              <p className="text-[#ffc800] text-sm font-medium">
                IT Asset Inventory Management System
              </p>
            </div>
            <div className="ml-auto text-right text-sm">
              <p className="font-semibold">{reportTitle}</p>
              <p className="text-white/80">
                Generated: {new Date().toLocaleDateString()}
              </p>
              {(dateFrom || dateTo) && (
                <p className="text-white/80 text-xs mt-1">
                  Period: {dateFrom || "Start"} to {dateTo || "Now"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Report table */}
        <div className="overflow-x-auto p-6">
          <table
            className="w-full border-collapse"
            style={{ fontSize: "12px" }}
          >
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="border border-gray-300 bg-[#343494] text-white px-3 py-2 text-left font-semibold"
                    style={{ fontSize: "11px" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="text-center py-8 text-gray-500 border border-gray-300"
                  >
                    No records found for the selected criteria
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={row.id ?? i}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    {getRowValues(row, reportType).map((val, j) => (
                      <td
                        key={j}
                        className="border border-gray-300 px-3 py-1.5 text-gray-700"
                      >
                        {val ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr>
                  <td
                    colSpan={headers.length}
                    className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-gray-700"
                  >
                    Total Records: {data.length}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-xs text-gray-600">
            Developed In-house by Infrastructure Management Department / Server
            and Datacenter Team / Samuel T.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Goh Betoch Bank - IT Asset Inventory Management System
          </p>
        </div>
      </div>
    </div>
  );
}
