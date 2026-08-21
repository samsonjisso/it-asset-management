import { Bell } from "lucide-react";
import { Reminder } from "@/lib/supabase";
import { daysUntil } from "../utils/dashboardHelpers";

interface UpcomingRemindersCardProps {
  reminders: Reminder[];
}

export function UpcomingRemindersCard({ reminders }: UpcomingRemindersCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell size={20} className="text-[#343494]" />
        <h3 className="font-semibold text-gray-800">Upcoming Reminders</h3>
        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-[#343494]/10 text-[#343494] font-medium">
          {reminders.length}
        </span>
      </div>

      {reminders.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No upcoming reminders
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {reminders.map((r) => {
            const days = daysUntil(r.remind_at);
            return (
              <div
                key={r.id}
                className="flex items-center justify-between bg-blue-50/50 rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.title}</p>
                  <p className="text-xs text-gray-500">
                    {r.reminder_type} - {new Date(r.remind_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    days <= 0
                      ? "text-red-600 bg-red-50"
                      : "text-blue-700 bg-blue-100"
                  }`}
                >
                  {days <= 0 ? "Due!" : `${days}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
