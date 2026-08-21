import { AlertTriangle } from "lucide-react";
import { License } from "@/lib/supabase";
import { daysUntil } from "../utils/dashboardHelpers";
import { LICENSE_EXPIRY_WINDOW_DAYS } from "../constants/dashboardConstants";

interface ExpiringLicensesCardProps {
  licenses: License[];
}

export function ExpiringLicensesCard({ licenses }: ExpiringLicensesCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} className="text-amber-600" />
        <h3 className="font-semibold text-gray-800">
          Expiring Licenses ({LICENSE_EXPIRY_WINDOW_DAYS} days)
        </h3>
        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
          {licenses.length}
        </span>
      </div>

      {licenses.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No licenses expiring soon
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {licenses.map((l) => {
            const days = daysUntil(l.expiry_date!);
            return (
              <div
                key={l.id}
                className="flex items-center justify-between bg-amber-50/50 rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {l.license_subtype ?? l.license_type}
                  </p>
                  <p className="text-xs text-gray-500">
                    Expires: {new Date(l.expiry_date!).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    days < 0
                      ? "text-red-600 bg-red-50"
                      : "text-amber-700 bg-amber-100"
                  }`}
                >
                  {days < 0 ? "Expired" : `${days}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
