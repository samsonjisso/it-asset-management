import { ServerEnvironment } from "../types/dashboard.types";

export const DEVICE_TYPE_LABELS: Record<string, string> = {
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

export const SERVER_ENV_ORDER: ServerEnvironment[] = [
  "production",
  "test",
  "standby",
];

export const SERVER_ENV_COLORS: Record<ServerEnvironment, string> = {
  production: "bg-red-500",
  test: "bg-blue-500",
  standby: "bg-gray-400",
};

export const LICENSE_EXPIRY_WINDOW_DAYS = 60;
export const REMINDER_UPCOMING_WINDOW_DAYS = 7;
export const MONTHLY_TREND_MONTHS = 6;
