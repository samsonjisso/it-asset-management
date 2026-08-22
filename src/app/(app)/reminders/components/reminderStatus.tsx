import { ReactElement } from "react";
import { AlertCircle, Clock, Calendar, CheckCircle } from "lucide-react";
import { Reminder } from "../types";

export interface ReminderStatus {
  label: string;
  color: string;
  icon: ReactElement;
}

export function getStatus(rec: Reminder): ReminderStatus {
  if (rec.is_dismissed)
    return {
      label: "Dismissed",
      color: "text-gray-500 bg-gray-100",
      icon: <CheckCircle size={12} />,
    };
  const days = Math.ceil(
    (new Date(rec.remind_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0)
    return {
      label: "Overdue",
      color: "text-red-700 bg-red-50 border border-red-200",
      icon: <AlertCircle size={12} />,
    };
  if (days <= 7)
    return {
      label: `Due in ${days}d`,
      color: "text-amber-700 bg-amber-50 border border-amber-200",
      icon: <Clock size={12} />,
    };
  return {
    label: "Upcoming",
    color: "text-green-700 bg-green-50 border border-green-200",
    icon: <Calendar size={12} />,
  };
}
