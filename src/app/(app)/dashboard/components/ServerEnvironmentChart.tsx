import { ServerIcon } from "lucide-react";
import { ServerEnvCounts } from "../types/dashboard.types";
import { SERVER_ENV_ORDER, SERVER_ENV_COLORS } from "../constants/dashboardConstants";
import { safePercent } from "../utils/dashboardHelpers";

interface ServerEnvironmentChartProps {
  serverByEnv: ServerEnvCounts;
  serverCount: number;
}

export function ServerEnvironmentChart({
  serverByEnv,
  serverCount,
}: ServerEnvironmentChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ServerIcon size={20} className="text-[#343494]" />
        <h3 className="font-semibold text-gray-800">Servers by Environment</h3>
      </div>
      <div className="space-y-3">
        {SERVER_ENV_ORDER.map((env) => {
          const count = serverByEnv[env] ?? 0;
          const pct = safePercent(count, serverCount);
          return (
            <div key={env}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize font-medium text-gray-700">
                  {env}
                </span>
                <span className="text-gray-500">
                  {count} ({pct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${SERVER_ENV_COLORS[env]} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
