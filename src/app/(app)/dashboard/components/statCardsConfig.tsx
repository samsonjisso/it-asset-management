import { HardDrive, KeyRound, Monitor, Network, ServerIcon } from "lucide-react";
import { StatCardData } from "../types/dashboard.types";

interface StatCounts {
  pcCount: number;
  ipCount: number;
  licenseCount: number;
  deviceCount: number;
  serverCount: number;
}

/**
 * Maps raw counts into the display config consumed by <StatsGrid />.
 * Kept separate from the grid component so icon/color/link config
 * can be edited without touching layout markup.
 */
export function buildStatCards(counts: StatCounts): StatCardData[] {
  return [
    {
      label: "PCs",
      value: counts.pcCount,
      icon: <Monitor size={24} />,
      color: "from-blue-500 to-blue-600",
      bg: "bg-blue-50",
      href: "/pc",
    },
    {
      label: "IP Addresses",
      value: counts.ipCount,
      icon: <Network size={24} />,
      color: "from-indigo-500 to-indigo-600",
      bg: "bg-indigo-50",
      href: "/ip",
    },
    {
      label: "Licenses",
      value: counts.licenseCount,
      icon: <KeyRound size={24} />,
      color: "from-amber-500 to-amber-600",
      bg: "bg-amber-50",
      href: "/licenses",
    },
    {
      label: "Devices",
      value: counts.deviceCount,
      icon: <HardDrive size={24} />,
      color: "from-green-500 to-green-600",
      bg: "bg-green-50",
      href: "/devices",
    },
    {
      label: "Servers",
      value: counts.serverCount,
      icon: <ServerIcon size={24} />,
      color: "from-purple-500 to-purple-600",
      bg: "bg-purple-50",
      href: "/servers",
    },
  ];
}
