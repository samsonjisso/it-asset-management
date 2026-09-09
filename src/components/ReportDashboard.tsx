"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Boxes,
  Monitor,
  ServerIcon,
  Network,
  KeyRound,
  Building2,
} from "lucide-react";
import { ReportStats } from "../lib/reportStats";

// Bank-branded palette (navy / gold / brand-blue) reused across every
// chart so the dashboard reads as one coherent, professional surface
// rather than default recharts colors.
const NAVY = "#3835A3";
const GOLD = "#FFAB00";
const BRAND = "#0C66E4";
const GREEN = "#10B981";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const GRAY = "#9CA3AF";

const PIE_COLORS = [
  NAVY,
  GOLD,
  BRAND,
  GREEN,
  "#8B5CF6",
  "#EC4899",
  AMBER,
  GRAY,
];

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5 tracking-tight">
            {value.toLocaleString()}
          </p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center shadow-soft shrink-0`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-5">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-sm">
        {title}
      </h3>
      {empty ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-10 text-center">
          No data yet
        </p>
      ) : (
        <div style={{ width: "100%", height: 220 }}>{children}</div>
      )}
    </div>
  );
}

export function ReportDashboard({ stats }: { stats: ReportStats }) {
  const ipData = [
    { name: "Used", value: stats.usedIPs },
    { name: "Available", value: stats.availableIPs },
  ].filter((d) => d.value > 0);

  const licenseData = [
    { name: "Active", value: stats.licenseStatus.active, color: GREEN },
    {
      name: "Expiring Soon",
      value: stats.licenseStatus.expiringSoon,
      color: AMBER,
    },
    { name: "Expired", value: stats.licenseStatus.expired, color: RED },
  ].filter((d) => d.value > 0);

  const serverData = [
    { name: "Production", value: stats.serverStatus.production, color: RED },
    { name: "Test", value: stats.serverStatus.test, color: BRAND },
    { name: "Standby", value: stats.serverStatus.standby, color: GRAY },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Assets"
          value={stats.totalAssets}
          icon={<Boxes size={18} />}
          color="bg-gradient-to-br from-navy-700 to-navy-600"
        />
        <StatCard
          label="Total PCs"
          value={stats.totalPCs}
          icon={<Monitor size={18} />}
          color="bg-gradient-to-br from-brand-500 to-brand-600"
        />
        <StatCard
          label="Total Servers"
          value={stats.totalServers}
          icon={<ServerIcon size={18} />}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          label="Network Devices"
          value={stats.totalNetworkDevices}
          icon={<Network size={18} />}
          color="bg-gradient-to-br from-teal-500 to-teal-600"
        />
        <StatCard
          label="Total Licenses"
          value={stats.totalLicenses}
          icon={<KeyRound size={18} />}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <StatCard
          label="Total IP Addresses"
          value={stats.totalIPs}
          icon={<Network size={18} />}
          color="bg-gradient-to-br from-indigo-500 to-indigo-600"
        />
        <StatCard
          label="Used IPs"
          value={stats.usedIPs}
          icon={<Network size={18} />}
          color="bg-gradient-to-br from-red-500 to-red-600"
        />
        <StatCard
          label="Available IPs"
          value={stats.availableIPs}
          icon={<Network size={18} />}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Assets by Department"
          empty={stats.assetsByDepartment.length === 0}
        >
          <ResponsiveContainer>
            <BarChart
              data={stats.assetsByDepartment}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#F0F1F5"
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="count" fill={NAVY} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Assets by Branch"
          empty={stats.assetsByBranch.length === 0}
        >
          <ResponsiveContainer>
            <BarChart
              data={stats.assetsByBranch}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#F0F1F5"
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="count" fill={GOLD} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Assets by Device Type"
          empty={stats.assetsByType.length === 0}
        >
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={stats.assetsByType}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(e) => `${e.name}: ${e.value}`}
                labelLine={false}
                fontSize={11}
              >
                {stats.assetsByType.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="IP Address Utilization" empty={ipData.length === 0}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={ipData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                label={(e) => `${e.name}: ${e.value}`}
                labelLine={false}
                fontSize={11}
              >
                {ipData.map((d, i) => (
                  <Cell key={i} fill={d.name === "Used" ? RED : GREEN} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="License Status" empty={licenseData.length === 0}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={licenseData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(e) => `${e.name}: ${e.value}`}
                labelLine={false}
                fontSize={11}
              >
                {licenseData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Server Status" empty={serverData.length === 0}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={serverData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(e) => `${e.name}: ${e.value}`}
                labelLine={false}
                fontSize={11}
              >
                {serverData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {stats.assetsByDepartment.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 px-1">
          <Building2 size={14} /> Assign departments to PCs and assets to see
          department/branch breakdowns here.
        </div>
      )}
    </div>
  );
}
