import { Eye, Pencil, Trash2 } from "lucide-react";
import type { PCRegistration } from "@/lib/supabase";
import type { Column } from "@/components/DataTable";

type Actions = {
  canEdit: boolean;
  canDelete: boolean;
  onView: (record: PCRegistration) => void;
  onEdit: (record: PCRegistration) => void;
  onDelete: (record: PCRegistration) => void;
};

export function createPCColumns({
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
}: Actions): Column<PCRegistration>[] {
  return [
    {
      key: "asset_id",
      label: "Key",
      sortable: true,
      sortValue: (r) => r.asset_id ?? "",
      render: (r) =>
        r.asset_id ? (
          <span className="font-mono text-xs font-semibold text-brand-700">
            {r.asset_id}
          </span>
        ) : (
          <span className="text-gray-400 italic">-</span>
        ),
    },
    {
      key: "hostname",
      label: "Name",
      sortable: true,
      sortValue: (r) => r.hostname,
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.image && (
            <img
              src={r.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-6 h-6 rounded object-cover shrink-0"
            />
          )}
          <span className="font-medium text-gray-900">{r.hostname}</span>
        </div>
      ),
    },
    { key: "owner_name", label: "Owner", render: (r) => r.owner_name ?? "-" },
    {
      key: "department",
      label: "Department",
      render: (r) => r.department?.name ?? "-",
    },
    {
      key: "created_at",
      label: "Registered",
      sortable: true,
      sortValue: (r) => r.created_at,
      render: (r) => new Date(r.created_at).toLocaleDateString(),
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
          {canEdit && (
            <button
              onClick={() => onEdit(r)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
          )}
          {canDelete && (
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
