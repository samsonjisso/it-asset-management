import { TrendingUp } from "lucide-react";
import { MonthlyDataPoint } from "../types/dashboard.types";

interface RegistrationTrendChartProps {
  monthlyData: MonthlyDataPoint[];
}

export function RegistrationTrendChart({
  monthlyData,
}: RegistrationTrendChartProps) {
  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-[#343494]" />
        <h3 className="font-semibold text-gray-800">
          Registration Trend (6 months)
        </h3>
      </div>
      <div className="flex items-end justify-between gap-2 h-40 pt-4">
        {monthlyData.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full flex items-end justify-center"
              style={{ height: "100%" }}
            >
              <div
                className="w-full max-w-[40px] bg-gradient-to-t from-[#343494] to-[#4e4ec1] rounded-t-lg transition-all hover:from-[#4e4ec1] hover:to-[#ffc800] relative group"
                style={{
                  height: `${(m.count / maxMonthly) * 100}%`,
                  minHeight: m.count > 0 ? "8px" : "2px",
                }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  {m.count}
                </span>
              </div>
            </div>
            <span className="text-xs text-gray-500 font-medium">{m.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
