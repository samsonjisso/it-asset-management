"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  PCRegistration,
  License,
  Device,
  Server,
  Reminder,
} from "@/lib/supabase";
import { MonthlyDataPoint } from "../types/dashboard.types";
import {
  LICENSE_EXPIRY_WINDOW_DAYS,
  REMINDER_UPCOMING_WINDOW_DAYS,
  MONTHLY_TREND_MONTHS,
} from "../constants/dashboardConstants";
import { daysUntil, countBy } from "../utils/dashboardHelpers";

export interface DashboardData {
  loading: boolean;
  pcCount: number;
  ipCount: number;
  licenseCount: number;
  deviceCount: number;
  serverCount: number;
  expiringLicenses: License[];
  upcomingReminders: Reminder[];
  recentPCs: PCRegistration[];
  deviceByType: Record<string, number>;
  serverByEnv: Record<string, number>;
  monthlyData: MonthlyDataPoint[];
}

function buildMonthlyData(
  records: { created_at: string }[],
): MonthlyDataPoint[] {
  const months: MonthlyDataPoint[] = [];
  for (let i = MONTHLY_TREND_MONTHS - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthName = d.toLocaleDateString("en", { month: "short" });
    const count = records.filter((r) => {
      const created = new Date(r.created_at);
      return (
        created.getMonth() === d.getMonth() &&
        created.getFullYear() === d.getFullYear()
      );
    }).length;
    months.push({ month: monthName, count });
  }
  return months;
}

/**
 * Fetches and derives all data needed by the dashboard page.
 * Keeps Supabase access and aggregation logic out of the view layer.
 */
export function useDashboardData(): DashboardData {
  const [loading, setLoading] = useState(true);
  const [pcCount, setPcCount] = useState(0);
  const [ipCount, setIpCount] = useState(0);
  const [licenseCount, setLicenseCount] = useState(0);
  const [deviceCount, setDeviceCount] = useState(0);
  const [serverCount, setServerCount] = useState(0);
  const [expiringLicenses, setExpiringLicenses] = useState<License[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [recentPCs, setRecentPCs] = useState<PCRegistration[]>([]);
  const [deviceByType, setDeviceByType] = useState<Record<string, number>>({});
  const [serverByEnv, setServerByEnv] = useState<Record<string, number>>({});
  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>([]);

  useEffect(() => {
    (async () => {
      const [pc, ast, ip, lic, dev, srv, rem] = await Promise.all([
        supabase.from("pc_registrations").select("*"),
        supabase.from("assets").select("*"),
        supabase.from("ip_addresses").select("*"),
        supabase.from("licenses").select("*"),
        supabase.from("devices").select("*"),
        supabase.from("servers").select("*"),
        supabase.from("reminders").select("*").eq("is_dismissed", false),
      ]);

      const pcs = (pc.data ?? []) as PCRegistration[];
      const assets = (ast.data ?? []) as { created_at: string }[];
      const ips = (ip.data ?? []) as unknown[];
      const licenses = (lic.data ?? []) as License[];
      const devices = (dev.data ?? []) as Device[];
      const servers = (srv.data ?? []) as Server[];
      const reminders = (rem.data ?? []) as Reminder[];

      setPcCount(pcs.length);
      setIpCount(ips.length);
      setLicenseCount(licenses.length);
      setDeviceCount(devices.length);
      setServerCount(servers.length);
      setRecentPCs(pcs.slice(0, 5));

      setExpiringLicenses(
        licenses.filter(
          (l) => l.expiry_date && daysUntil(l.expiry_date) <= LICENSE_EXPIRY_WINDOW_DAYS,
        ),
      );

      setUpcomingReminders(
        reminders.filter(
          (r) => daysUntil(r.remind_at) <= REMINDER_UPCOMING_WINDOW_DAYS,
        ),
      );

      setDeviceByType(countBy(devices, (d) => d.device_type));
      setServerByEnv(countBy(servers, (s) => s.environment));

      setMonthlyData(
        buildMonthlyData([...pcs, ...assets, ...licenses, ...devices, ...servers]),
      );

      setLoading(false);
    })();
  }, []);

  return {
    loading,
    pcCount,
    ipCount,
    licenseCount,
    deviceCount,
    serverCount,
    expiringLicenses,
    upcomingReminders,
    recentPCs,
    deviceByType,
    serverByEnv,
    monthlyData,
  };
}
