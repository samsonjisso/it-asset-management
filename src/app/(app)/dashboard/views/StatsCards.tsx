import Link from "next/link";
import {
  Monitor,
  KeyRound,
  HardDrive,
  Server as ServerIcon,
  Network,
} from "lucide-react";

function StatsCards({
  pcCount,
  ipCount,
  licenseCount,
  deviceCount,
  serverCount,
}: {
  pcCount: number;
  ipCount: number;
  licenseCount: number;
  deviceCount: number;
  serverCount: number;
}) {
  const stats = [
    {
      label: "PCs",
      value: pcCount,
      icon: <Monitor size={24} />,
      color: "from-blue-500 to-blue-600",
      bg: "bg-blue-50",
      href: "/pc",
    },
    {
      label: "IP Addresses",
      value: ipCount,
      icon: <Network size={24} />,
      color: "from-indigo-500 to-indigo-600",
      bg: "bg-indigo-50",
      href: "/ip",
    },
    {
      label: "Licenses",
      value: licenseCount,
      icon: <KeyRound size={24} />,
      color: "from-amber-500 to-amber-600",
      bg: "bg-amber-50",
      href: "/licenses",
    },
    {
      label: "Devices",
      value: deviceCount,
      icon: <HardDrive size={24} />,
      color: "from-green-500 to-green-600",
      bg: "bg-green-50",
      href: "/devices",
    },
    {
      label: "Servers",
      value: serverCount,
      icon: <ServerIcon size={24} />,
      color: "from-purple-500 to-purple-600",
      bg: "bg-purple-50",
      href: "/servers",
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md gbb-card-hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {stat.value}
              </p>
            </div>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md transition-transform duration-200 group-hover:scale-105`}
            >
              {stat.icon}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default StatsCards;
