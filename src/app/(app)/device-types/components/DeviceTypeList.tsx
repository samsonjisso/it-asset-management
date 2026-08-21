import { HardDrive, Plus, Pencil, Trash2 } from "lucide-react";
import type { DeviceType } from "@/lib/supabase";
import {
  getDeviceTypeIcon,
  parseBaseFields,
  parseCoreFields,
  parseExtraFields,
} from "@/lib/deviceTypeFields";
import { Button } from "@/components/FormControls";
import { DeviceTypeCard } from "./DeviceTypeCard";

interface Props {
  deviceTypes: DeviceType[];
  loading: boolean;
  canWrite: boolean;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (type: DeviceType) => void;
  onDelete: (id: string) => void;
}

export function DeviceTypeList({
  deviceTypes,
  loading,
  canWrite,
  canManage,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  return (
    <>
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <HardDrive size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Device Type Management
            </h1>
            <p className="text-sm text-gray-500">
              {deviceTypes.length} device type
              {deviceTypes.length === 1 ? "" : "s"} available on the Device
              Registration form
            </p>
          </div>
        </div>

        {canWrite && (
          <Button variant="primary" size="sm" onClick={onAdd}>
            <Plus size={16} /> Add Device Type
          </Button>
        )}
      </header>

      {loading ? (
        <LoadingState />
      ) : deviceTypes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deviceTypes.map((type) => (
            <DeviceTypeCard
              key={type.id}
              type={type}
              canManage={canManage}
              fieldCount={
                parseCoreFields(type).length +
                parseBaseFields(type).length +
                parseExtraFields(type).length
              }
              icon={getDeviceTypeIcon(deviceTypes, type.code)}
              onEdit={() => onEdit(type)}
              onDelete={() => onDelete(type.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
      No device types yet. Add one to make it available on the Device
      Registration form.
    </div>
  );
}
