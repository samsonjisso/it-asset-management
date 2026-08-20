import type { Device, DeviceOwner, DeviceType } from "@/lib/supabase";
import { parseExtraData } from "./deviceForm";
import { parseExtraFields } from "@/lib/deviceTypeFields";

const HEADERS = [
  "Asset ID",
  "Device Type",
  "Owner",
  "Model",
  "Hostname",
  "IP Address",
  "Serial Number",
  "MAC Address",
  "Location",
  "Rack Number",
  "Extra Details",
  "Created At",
];

export function exportDevicesCSV(
  records: Device[],
  types: DeviceType[],
  owners: DeviceOwner[],
) {
  const rows = records.map((record) => {
    const type = types.find((item) => item.code === record.device_type);
    const extra = parseExtraData(record);
    const extraText = parseExtraFields(type)
      .filter((field) => extra[field.key])
      .map((field) => `${field.label}: ${extra[field.key]}`)
      .join("; ");
    return [
      record.asset_id ?? "",
      type?.label ?? record.device_type,
      owners.find((owner) => owner.code === record.device_owner)?.label ??
        record.device_owner ??
        "",
      record.device_model ?? "",
      record.hostname ?? "",
      record.ip_address ?? "",
      record.serial_number ?? "",
      record.mac_address ?? "",
      record.location ?? "",
      record.rack_number ?? "",
      extraText,
      new Date(record.created_at).toLocaleDateString(),
    ];
  });

  const csv = [HEADERS, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  downloadCSV(csv, `devices_${new Date().toISOString().slice(0, 10)}.csv`);
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
