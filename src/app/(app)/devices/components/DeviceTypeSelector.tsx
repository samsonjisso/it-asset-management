import type { DeviceType } from "@/lib/supabase";
import { Field } from "@/components/FormControls";
import { Settings2 } from "lucide-react";
import { getDeviceTypeIcon } from "@/lib/deviceTypeFields";

type Props = {
  types: DeviceType[];
  value: string;
  onChange: (code: string) => void;
  onNavigate?: (page: string) => void;
  canManage: boolean;
};
export function DeviceTypeSelector({
  types,
  value,
  onChange,
  onNavigate,
  canManage,
}: Props) {
  return (
    <Field
      label="Device Type"
      required
      hint={
        types.length === 0
          ? "No device types yet — add one under Customization > Device Types."
          : undefined
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
        {types.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.code)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${value === type.code ? "border-brand-600 bg-brand-600 text-white shadow-md" : "border-gray-200 bg-white text-gray-700 hover:border-brand-600/40 hover:bg-gray-50"}`}
          >
            {getDeviceTypeIcon(types, type.code)}
            <span className="truncate">{type.label}</span>
          </button>
        ))}
      </div>
      {onNavigate && canManage && (
        <button
          type="button"
          onClick={() => onNavigate("device_types")}
          className="mt-1 self-start inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-500 font-medium underline underline-offset-2"
          title="Add, edit, or remove device types and their fields"
        >
          <Settings2 size={13} />{" "}
          {types.length === 0
            ? "Add a device type"
            : "Don't see the right type? Manage device types"}
        </button>
      )}
    </Field>
  );
}
