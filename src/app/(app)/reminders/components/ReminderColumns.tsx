import { Pencil, Trash2, CheckCircle, Mail, MailCheck } from "lucide-react";
import { Column } from "../../../../components/DataTable";
import { Reminder } from "../types";
import { getStatus } from "./reminderStatus";
import { UserRole } from "@/lib/supabase";

interface ColumnsOptions {
  canWrite: () => boolean;
  hasRole: (...role: UserRole[]) => boolean;
  onEdit: (rec: Reminder) => void;
  onDelete: (rec: Reminder) => void;
  onDismiss: (rec: Reminder) => void;
}

export function getReminderColumns({
  canWrite,
  hasRole,
  onEdit,
  onDelete,
  onDismiss,
}: ColumnsOptions): Column<Reminder>[] {
  return [
    {
      key: "title",
      label: "Title",
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      key: "reminder_type",
      label: "Type",
      sortable: true,
      sortValue: (r) => r.reminder_type,
      render: (r) => (
        <span className="text-xs px-2 py-1 rounded-full bg-brand-600/10 text-brand-600 font-medium">
          {r.reminder_type}
        </span>
      ),
    },
    {
      key: "detail",
      label: "Detail",
      render: (r) =>
        r.detail ? (
          <span className="text-sm text-gray-600 line-clamp-2">{r.detail}</span>
        ) : (
          "-"
        ),
    },
    {
      key: "remind_at",
      label: "Remind Date",
      sortable: true,
      sortValue: (r) => r.remind_at,
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm">
            {new Date(r.remind_at).toLocaleDateString()}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(r.remind_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const status = getStatus(r);
        return (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${status.color}`}
          >
            {status.icon}
            {status.label}
          </span>
        );
      },
    },
    {
      key: "alert_email",
      label: "Email Alert",
      render: (r) => {
        if (!r.alert_email)
          return <span className="text-gray-400 text-xs">Not set</span>;
        return r.email_sent ? (
          <span
            className="text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200"
            title={r.alert_email}
          >
            <MailCheck size={12} /> Sent
          </span>
        ) : (
          <span
            className="text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200"
            title={r.alert_email}
          >
            <Mail size={12} /> Pending
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
        canWrite() ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {!r.is_dismissed && (
              <button
                onClick={() => onDismiss(r)}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                title="Dismiss"
              >
                <CheckCircle size={16} />
              </button>
            )}
            <button
              onClick={() => onEdit(r)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Pencil size={16} />
            </button>
            {hasRole("admin") && (
              <button
                onClick={() => onDelete(r)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">Read only</span>
        ),
    },
  ];
}
