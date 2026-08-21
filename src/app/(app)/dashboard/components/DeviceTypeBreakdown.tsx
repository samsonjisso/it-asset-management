import { DeviceTypeCounts } from "../types/dashboard.types";
import { DEVICE_TYPE_LABELS } from "../constants/dashboardConstants";

interface DeviceTypeBreakdownProps {
  deviceByType: DeviceTypeCounts;
}

export function DeviceTypeBreakdown({ deviceByType }: DeviceTypeBreakdownProps) {
  const entries = Object.entries(deviceByType).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Devices by Type</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No devices registered
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {entries.map(([type, count]) => (
            <div
              key={type}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5"
            >
              <span className="text-sm text-gray-700">
                {DEVICE_TYPE_LABELS[type] ?? type}
              </span>
              <span className="text-sm font-bold text-[#343494]">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
