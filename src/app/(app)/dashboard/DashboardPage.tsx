"use client";

import { useAuth } from "@/context/AuthContext";
import { useDashboardData } from "./hooks/useDashboardData";
import { buildStatCards } from "./components/statCardsConfig";
import { WelcomeBanner } from "./components/WelcomeBanner";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { StatsGrid } from "./components/StatsGrid";
import { ExpiringLicensesCard } from "./components/ExpiringLicensesCard";
import { UpcomingRemindersCard } from "./components/UpcomingRemindersCard";
import { RegistrationTrendChart } from "./components/RegistrationTrendChart";
import { ServerEnvironmentChart } from "./components/ServerEnvironmentChart";
import { DeviceTypeBreakdown } from "./components/DeviceTypeBreakdown";
import { RecentPCRegistrations } from "./components/RecentPCRegistrations";

export function DashboardPage() {
  const { profile } = useAuth();
  const data = useDashboardData();

  if (data.loading) {
    return <LoadingSpinner />;
  }

  const stats = buildStatCards({
    pcCount: data.pcCount,
    ipCount: data.ipCount,
    licenseCount: data.licenseCount,
    deviceCount: data.deviceCount,
    serverCount: data.serverCount,
  });

  return (
    <div className="space-y-6">
      <WelcomeBanner firstName={profile?.full_name?.split(" ")[0]} />

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpiringLicensesCard licenses={data.expiringLicenses} />
        <UpcomingRemindersCard reminders={data.upcomingReminders} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RegistrationTrendChart monthlyData={data.monthlyData} />
        <ServerEnvironmentChart
          serverByEnv={data.serverByEnv}
          serverCount={data.serverCount}
        />
      </div>

      <DeviceTypeBreakdown deviceByType={data.deviceByType} />

      <RecentPCRegistrations pcs={data.recentPCs} />
    </div>
  );
}
