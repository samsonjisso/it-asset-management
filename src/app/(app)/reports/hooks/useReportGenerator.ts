"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { ReportRow, ReportType } from "../types";

export function useReportGenerator() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>("pc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    let query;
    switch (reportType) {
      case "pc":
        query = supabase
          .from("pc_registrations")
          .select("*, department:departments(name)")
          .order("created_at", { ascending: false });
        break;
      case "asset":
        query = supabase
          .from("assets")
          .select("*, department:departments(name)")
          .order("created_at", { ascending: false });
        break;
      case "ip":
        query = supabase
          .from("ip_addresses")
          .select("*, department:departments(name)")
          .order("ip_address", { ascending: true });
        break;
      case "license":
        query = supabase
          .from("licenses")
          .select("*")
          .order("created_at", { ascending: false });
        break;
      case "device":
        query = supabase
          .from("devices")
          .select("*")
          .order("created_at", { ascending: false });
        break;
      case "server":
        query = supabase
          .from("servers")
          .select("*")
          .order("created_at", { ascending: false });
        break;
      case "all":
        const [pc, ast, ip, lic, dev, srv] = await Promise.all([
          supabase
            .from("pc_registrations")
            .select("*, department:departments(name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("assets")
            .select("*, department:departments(name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("ip_addresses")
            .select("*, department:departments(name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("licenses")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("devices")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("servers")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);
        let combined = [
          ...(pc.data ?? []).map((r: any) => ({ ...r, _type: "PC" })),
          ...(ast.data ?? []).map((r: any) => ({ ...r, _type: "Asset" })),
          ...(ip.data ?? []).map((r: any) => ({ ...r, _type: "IP Address" })),
          ...(lic.data ?? []).map((r: any) => ({ ...r, _type: "License" })),
          ...(dev.data ?? []).map((r: any) => ({ ...r, _type: "Device" })),
          ...(srv.data ?? []).map((r: any) => ({ ...r, _type: "Server" })),
        ];
        if (dateFrom)
          combined = combined.filter(
            (r) => new Date(r.created_at) >= new Date(dateFrom),
          );
        if (dateTo)
          combined = combined.filter(
            (r) => new Date(r.created_at) <= new Date(dateTo + "T23:59:59"),
          );
        setData(combined);
        setLoading(false);
        setGenerated(true);
        toast(`Report generated: ${combined.length} records`, "success");
        return;
    }
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");
    const { data: result } = await query;
    setData(result ?? []);
    setLoading(false);
    setGenerated(true);
    toast(`Report generated: ${result?.length ?? 0} records`, "success");
  };

  return {
    reportType,
    setReportType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    data,
    loading,
    generated,
    setGenerated,
    generateReport,
    toast,
  };
}
