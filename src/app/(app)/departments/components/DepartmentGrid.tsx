import { Building2, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/FormControls";
import type { Department } from "@/lib/supabase";

type Props = {
  departments: Department[];
  canWrite: boolean;
  canDelete: boolean;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
};

export function DepartmentGrid({
  departments,
  canWrite,
  canDelete,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {departments.map((dept) => (
        <div
          key={dept.id}
          className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  dept.is_branch
                    ? "bg-amber-50 text-amber-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {dept.is_branch ? <MapPin size={20} /> : <Building2 size={20} />}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{dept.name}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    dept.is_branch
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {dept.is_branch ? "Branch" : "Department"}
                </span>
              </div>
            </div>
          </div>

          {dept.description && (
            <p className="text-sm text-gray-600 mt-3">{dept.description}</p>
          )}

          {canWrite && (
            <div className="mt-3 flex gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(dept)}
                className="flex-1"
              >
                <Pencil size={14} /> Edit
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(dept)}
                  className="flex-1 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Delete
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
