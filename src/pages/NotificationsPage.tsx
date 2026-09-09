"use client";

import { useState, useEffect, useCallback, JSX } from "react";
import { supabase, AdminNotification } from "../lib/supabase";
import { markAllNotificationsRead } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { DataTable, Column } from "../components/DataTable";
import { Button } from "../components/FormControls";
import { BellRing, CheckCheck, Pencil, Trash2, PlusCircle } from "lucide-react";

// Friendly labels/colors for the two kinds of change this page logs.
const ACTION_STYLE: Record<
  AdminNotification["action"],
  { label: string; color: string; icon: JSX.Element }
> = {
  update: {
    label: "Updated",
    color:
      "text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 border border-brand-200",
    icon: <Pencil size={12} />,
  },
  delete: {
    label: "Deleted",
    color: "text-red-700 bg-red-50 border border-red-200",
    icon: <Trash2 size={12} />,
  },
};

export function NotificationsPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast(error.message, "error");
    else if (data) setRecords(data as AdminNotification[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markRead = async (rec: AdminNotification) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", rec.id);
    if (error) toast(error.message, "error");
    else
      setRecords((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, is_read: true } : r)),
      );
  };

  const markAllRead = async () => {
    const { error } = await markAllNotificationsRead();
    if (error) toast(error.message, "error");
    else {
      toast("All notifications marked as read", "success");
      setRecords((prev) => prev.map((r) => ({ ...r, is_read: true })));
    }
  };

  const handleDelete = async (rec: AdminNotification) => {
    if (!confirm("Clear this notification?")) return;
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", rec.id);
    if (error) toast(error.message, "error");
    else {
      toast("Notification cleared", "success");
      setRecords((prev) => prev.filter((r) => r.id !== rec.id));
    }
  };

  const unreadCount = records.filter((r) => !r.is_read).length;

  const columns: Column<AdminNotification>[] = [
    {
      key: "action",
      label: "Action",
      sortable: true,
      sortValue: (r) => r.action,
      render: (r) => {
        const style = ACTION_STYLE[r.action];
        return (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${style.color}`}
          >
            {style.icon}
            {style.label}
          </span>
        );
      },
    },
    {
      key: "record",
      label: "Record",
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {r.record_label || "—"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {r.record_type}
          </p>
        </div>
      ),
    },
    {
      key: "summary",
      label: "What Changed",
      render: (r) => (
        <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
          {r.summary}
        </span>
      ),
    },
    {
      key: "actor_name",
      label: "Performed By",
      sortable: true,
      sortValue: (r) => r.actor_name,
      render: (r) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {r.actor_name}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Date & Time",
      sortable: true,
      sortValue: (r) => r.created_at,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">
            {new Date(r.created_at).toLocaleDateString()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(r.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      key: "is_read",
      label: "Status",
      render: (r) =>
        r.is_read ? (
          <span className="text-xs text-gray-400 dark:text-gray-500">Read</span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
            New
          </span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {!r.is_read && (
            <button
              onClick={() => markRead(r)}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
              title="Mark as read"
            >
              <CheckCheck size={16} />
            </button>
          )}
          {hasRole("admin") && (
            <button
              onClick={() => handleDelete(r)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              title="Clear"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <BellRing size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {records.length} notification{records.length === 1 ? "" : "s"},{" "}
              {unreadCount} unread
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck size={16} /> Mark All as Read
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-brand-600 rounded-xl px-4 py-3 flex items-start gap-2">
        <PlusCircle size={15} className="mt-0.5 shrink-0 text-brand-600" />
        Every time an important record — an asset, IP address, device, server,
        license, PC registration, or user account — is updated or deleted, it
        shows up here with who made the change, what changed, which record was
        affected, and when.
      </p>

      <DataTable
        columns={columns}
        data={records}
        searchKeys={["record_label", "record_type", "summary", "actor_name"]}
        searchPlaceholder="Search notifications..."
        emptyMessage={loading ? "Loading..." : "No notifications yet"}
        onRowClick={(r) => {
          if (!r.is_read) markRead(r);
        }}
      />
    </div>
  );
}
