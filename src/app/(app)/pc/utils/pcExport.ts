import type { PCRegistration } from "@/lib/supabase";

export function exportPCsToCSV(records: PCRegistration[]) {
  const headers = [
    "Asset ID",
    "Hostname",
    "Monitor Serial",
    "Asset Tag",
    "Service Tag",
    "MAC Address",
    "CPU",
    "Memory Detail",
    "Generation Detail",
    "IP Address",
    "Owner",
    "Department",
    "Floor",
    "Switch Port",
    "Access Switch",
    "Patch Level",
    "Created At",
  ];
  const rows = records.map((r) => [
    r.asset_id ?? "",
    r.hostname,
    r.monitor_serial ?? "",
    r.asset_tag ?? "",
    r.service_tag ?? "",
    r.mac_address ?? "",
    r.cpu ?? "",
    r.memory_detail ?? "",
    r.generation_detail ?? "",
    r.ip_address ?? "",
    r.owner_name ?? "",
    r.department?.name ?? "",
    r.floor_number ?? "",
    r.switch_port_number ?? "",
    r.access_switch_ip ?? "",
    r.patch_level_number ?? "",
    new Date(r.created_at).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pc_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  return `"${String(value).replace(/"/g, '""')}"`;
}
