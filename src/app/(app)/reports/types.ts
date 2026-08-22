export type ReportType =
  | "pc"
  | "asset"
  | "ip"
  | "license"
  | "device"
  | "server"
  | "all";

// Row shape is intentionally loose (mirrors original component) since each
// report type pulls from a different Supabase table with different columns.
export type ReportRow = any;

export type ToastFn = (message: string, variant: "success" | "error") => void;
