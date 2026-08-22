import { ReportRow, ReportType } from "../types";

export const reportTitleMap: Record<ReportType, string> = {
  pc: "PC Registration Report",
  asset: "Asset Registration Report",
  ip: "IP Address Management Report",
  license: "License Registration Report",
  device: "Device Registration Report",
  server: "Server Registration Report",
  all: "Complete IT Asset Inventory Report",
};

export const getHeaders = (type: ReportType): string[] => {
  if (type === "all")
    return [
      "Type",
      "Hostname/Name",
      "IP Address",
      "Serial/Tag",
      "Department/Owner",
      "Registered Date",
    ];
  if (type === "pc")
    return [
      "Hostname",
      "Monitor Serial",
      "Asset Tag",
      "Service Tag",
      "MAC Address",
      "IP Address",
      "Department",
      "Floor",
      "Switch Port",
      "Access Switch",
      "Patch Level",
      "Registered Date",
    ];
  if (type === "asset")
    return [
      "Asset Name",
      "Asset Type",
      "Department",
      "Owner",
      "Location",
      "Model",
      "Hostname",
      "Serial Number",
      "Manufacturer",
      "Supplier",
      "Operating System",
      "IP Address",
      "Registered Date",
    ];
  if (type === "ip")
    return [
      "IP Address",
      "Hostname",
      "Department",
      "Owner (Employee)",
      "MAC Address",
      "Status",
      "Registered Date",
    ];
  if (type === "license")
    return [
      "License Type",
      "Subtype",
      "Vendor",
      "License Key",
      "Quantity",
      "Effective Date",
      "Expiry Date",
      "Registered Date",
    ];
  if (type === "device")
    return [
      "Device Type",
      "Owner",
      "Model",
      "Hostname",
      "IP Address",
      "Serial Number",
      "MAC Address",
      "Location",
      "Rack",
      "Registered Date",
    ];
  if (type === "server")
    return [
      "Server Type",
      "Hostname",
      "IP Address",
      "SSH Port",
      "Environment",
      "Owner",
      "RAM",
      "CPU",
      "Storage",
      "OS Release",
      "Host Location",
      "Registered Date",
    ];
  return [];
};

export const getRowValues = (row: ReportRow, type: ReportType): any[] => {
  const dateStr = new Date(row.created_at).toLocaleDateString();
  if (type === "all")
    return [
      row._type,
      row.hostname ?? row.asset_name ?? row.ip_address ?? row.title ?? "",
      row.ip_address ?? "",
      row.serial_number ?? row.service_tag ?? "",
      row.department?.name ??
        row.owner ??
        row.ip_owner ??
        row.server_owner ??
        row.device_owner ??
        "",
      dateStr,
    ];
  if (type === "pc")
    return [
      row.hostname,
      row.monitor_serial ?? "",
      row.asset_tag ?? "N/A",
      row.service_tag ?? "",
      row.mac_address ?? "",
      row.ip_address ?? "",
      row.department?.name ?? "",
      row.floor_number ?? "",
      row.switch_port_number ?? "",
      row.access_switch_ip ?? "",
      row.patch_level_number ?? "",
      dateStr,
    ];
  if (type === "asset")
    return [
      row.asset_name,
      row.asset_type,
      row.department?.name ?? "",
      row.owner ?? "",
      row.location ?? "",
      row.model ?? "",
      row.hostname ?? "",
      row.serial_number ?? "",
      row.manufacturer ?? "",
      row.supplier ?? "",
      row.operating_system ?? "",
      row.ip_address ?? "",
      dateStr,
    ];
  if (type === "ip")
    return [
      row.ip_address,
      row.hostname ?? "",
      row.department?.name ?? "",
      row.ip_owner ?? "",
      row.mac_address ?? "",
      row.status,
      dateStr,
    ];
  if (type === "license")
    return [
      row.license_type,
      row.license_subtype ?? "",
      row.vendor ?? "",
      row.license_key ?? "N/A",
      row.number_of_licenses ?? "",
      row.effective_date ?? "",
      row.expiry_date ?? "",
      dateStr,
    ];
  if (type === "device")
    return [
      row.device_type,
      row.device_owner,
      row.device_model ?? "",
      row.hostname,
      row.ip_address ?? "N/A",
      row.serial_number ?? "",
      row.mac_address ?? "",
      row.location ?? "",
      row.rack_number ?? "",
      dateStr,
    ];
  if (type === "server")
    return [
      row.server_type,
      row.hostname,
      row.ip_address ?? "",
      row.ssh_port,
      row.environment,
      row.server_owner,
      row.ram ?? "",
      row.cpu ?? "",
      row.storage ?? "",
      row.os_release ?? "",
      row.host_location ?? "",
      dateStr,
    ];
  return [];
};
