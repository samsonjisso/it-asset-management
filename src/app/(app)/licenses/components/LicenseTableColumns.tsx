"use client";
import { Column } from "@/components/DataTable";
import { AlertTriangle, CheckCircle, Eye, Pencil, Trash2 } from "lucide-react";
import { License, UserRole } from "@/lib/supabase";
import { ExpiryStatus } from "../types";

interface LicenseTableColumnsProps {
  licenseTypeOptions: { code: string; label: string }[];
  getExpiryStatus: (rec: License) => ExpiryStatus | null;
  onView: (rec: License) => void;
  onEdit: (rec: License) => void;
  onDelete: (rec: License) => void;
  canWrite: () => boolean;
  hasRole: (...role: UserRole[]) => boolean;
}

export function getLicenseColumns({
  licenseTypeOptions,
  getExpiryStatus,
  onView,
  onEdit,
  onDelete,
  canWrite,
  hasRole,
}: LicenseTableColumnsProps): Column<License>[] {
  return [
    {
      key: "asset_id",
      label: "Key",
      sortable: true,
      sortValue: (r) => r.asset_id ?? "",
      render: (r) =>
        r.asset_id ? (
          <span className="font-mono text-xs font-semibold text-brand-700">{r.asset_id}</span>
        ) : (
          <span className="text-gray-400 italic">-</span>
        ),
    },
    {
      key: "license_type",
      label: "Name",
      sortable: true,
      sortValue: (r) => r.license_type,
      render: (r) => (
        <span className="font-medium text-gray-900">
          {licenseTypeOptions.find((t) => t.code === r.license_type)?.label ?? r.license_type}
          {r.license_subtype ? ` — ${r.license_subtype}` : ""}
        </span>
      ),
    },
    { key: "vendor", label: "Vendor", render: (r) => r.vendor ?? "-" },
    {
      key: "expiry_date",
      label: "Expiry",
      sortable: true,
      sortValue: (r) => r.expiry_date ?? "9999",
      render: (r) => {
        const status = getExpiryStatus(r);
        if (!r.expiry_date) return <span className="text-gray-400">No expiry</span>;
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs">{new Date(r.expiry_date).toLocaleDateString()}</span>
            {status && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 w-fit ${status.color}`}
              >
                {status.days <= 30 && status.days >= 0 ? (
                  <AlertTriangle size={10} />
                ) : status.days < 0 ? (
                  <AlertTriangle size={10} />
                ) : (
                  <CheckCircle size={10} />
                )}
                {status.label}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onView(r)}
            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {canWrite() && (
            <button
              onClick={() => onEdit(r)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
          )}
          {canWrite() && hasRole("admin") && (
            <button
              onClick={() => onDelete(r)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];
}
