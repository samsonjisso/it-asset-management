// Shared aggregation used by both the on-screen Report Dashboard and the
// PDF/Excel exports, so every surface agrees on the same definitions
// (e.g. what counts as a "used" IP, or an "expiring" license).
import { supabase } from "./supabase";

export interface NameCount {
  name: string;
  count: number;
}

export interface ReportStats {
  generatedAt: string;

  totalAssets: number;
  totalPCs: number;
  totalServers: number;
  totalNetworkDevices: number;
  totalLicenses: number;

  totalIPs: number;
  usedIPs: number;
  availableIPs: number;

  assetsByDepartment: NameCount[];
  assetsByBranch: NameCount[];
  assetsByType: NameCount[];

  licenseStatus: { active: number; expiringSoon: number; expired: number };
  serverStatus: { production: number; test: number; standby: number };
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  network: "Network",
  physical_server: "Physical Server",
  storage_server: "Storage Server",
  wifi_access_point: "WiFi AP",
  core_switch: "Core Switch",
  access_switch: "Access Switch",
  edge_router: "Edge Router",
  ups: "UPS",
  ac: "AC",
  rack: "Rack",
  cctv_camera: "CCTV",
  printer_photocopy: "Printer",
  fire_extinguisher: "Fire Ext.",
  monitoring_tv: "Monitor TV",
};

export function deviceTypeLabel(type: string): string {
  return DEVICE_TYPE_LABELS[type] ?? type;
}

export async function fetchReportStats(): Promise<ReportStats> {
  const [pc, ip, lic, dev, srv, dept] = await Promise.all([
    supabase.from("pc_registrations").select("*, department:departments(name)"),
    supabase.from("ip_addresses").select("*"),
    supabase.from("licenses").select("*"),
    supabase.from("devices").select("*"),
    supabase.from("servers").select("*"),
    supabase.from("departments").select("*"),
  ]);

  const pcs = (pc.data ?? []) as any[];
  const ips = (ip.data ?? []) as any[];
  const licenses = (lic.data ?? []) as any[];
  const devices = (dev.data ?? []) as any[];
  const servers = (srv.data ?? []) as any[];
  const departments = (dept.data ?? []) as any[];

  const totalPCs = pcs.length;
  const totalServers = servers.length;
  const totalNetworkDevices = devices.length;
  const totalAssets = totalPCs + totalServers + totalNetworkDevices;
  const totalLicenses = licenses.length;

  const totalIPs = ips.length;
  // A registered IP with status other than "available" is treated as in
  // use everywhere else in the app (see IPManagementPage's board logic) —
  // mirror that rule here so the dashboard stays consistent.
  const usedIPs = ips.filter((r) => r.status !== "available").length;
  const availableIPs = totalIPs - usedIPs;

  // Assets by department: every PC record that has a department,
  // combined into one count per department name.
  const deptCounts = new Map<string, number>();
  [...pcs].forEach((r) => {
    const name = r.department?.name;
    if (!name) return;
    deptCounts.set(name, (deptCounts.get(name) ?? 0) + 1);
  });
  const assetsByDepartment: NameCount[] = [...deptCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Assets by branch: same data, restricted to departments flagged as branches.
  const branchNames = new Set(
    departments.filter((d) => d.is_branch).map((d) => d.name),
  );
  const assetsByBranch = assetsByDepartment.filter((d) =>
    branchNames.has(d.name),
  );

  // Assets by type: high-level composition across every registration kind.
  const assetsByType: NameCount[] = [
    { name: "PCs", count: totalPCs },
    { name: "Servers", count: totalServers },
    { name: "Network Devices", count: totalNetworkDevices },
  ].filter((t) => t.count > 0);

  // License status: Active (>30 days or no expiry) / Expiring Soon (<=30
  // days) / Expired — mirrors LicenseRegistrationPage's getExpiryStatus.
  let active = 0,
    expiringSoon = 0,
    expired = 0;
  licenses.forEach((l) => {
    if (!l.expiry_date) {
      active++;
      return;
    }
    const days = Math.ceil(
      (new Date(l.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) expired++;
    else if (days <= 30) expiringSoon++;
    else active++;
  });

  const serverStatus = {
    production: servers.filter((s) => s.environment === "production").length,
    test: servers.filter((s) => s.environment === "test").length,
    standby: servers.filter((s) => s.environment === "standby").length,
  };

  return {
    generatedAt: new Date().toISOString(),
    totalAssets,
    totalPCs,
    totalServers,
    totalNetworkDevices,
    totalLicenses,
    totalIPs,
    usedIPs,
    availableIPs,
    assetsByDepartment,
    assetsByBranch,
    assetsByType,
    licenseStatus: { active, expiringSoon, expired },
    serverStatus,
  };
}
