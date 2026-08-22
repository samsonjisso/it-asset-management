import { AlertCircle } from "lucide-react";
import { Reminder } from "../types";

interface UpcomingBannerProps {
  upcoming: Reminder[];
}

export function UpcomingBanner({ upcoming }: UpcomingBannerProps) {
  if (upcoming.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 rounded-xl p-4 gbb-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle size={18} className="text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-800">
          Upcoming Reminders (within 1 week)
        </h3>
      </div>
      <div className="space-y-2">
        {upcoming.slice(0, 3).map((r) => {
          const days = Math.ceil(
            (new Date(r.remind_at).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          );
          return (
            <div
              key={r.id}
              className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {r.title}
                </p>
                <p className="text-xs text-gray-600">
                  {r.reminder_type} -{" "}
                  {new Date(r.remind_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 0 ? "text-red-600 bg-red-50" : "text-amber-700 bg-amber-50"}`}
              >
                {days <= 0 ? "Due now!" : `${days}d`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
