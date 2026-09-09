"use client";

import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Guards a page's content behind Per-User Module Access and, optionally,
 * an admin/audit-only restriction — the same two checks the original
 * App.tsx applied via its inline requireModule()/requireAdmin() helpers
 * before rendering a page's component. The API also enforces both
 * server-side, so this is a UX guard (avoids flashing forbidden
 * content), not the security boundary.
 */
export function RouteGuard({
  module,
  adminOnly,
  children,
}: {
  module?: string;
  adminOnly?: boolean;
  children: ReactNode;
}) {
  const { profile, hasModuleAccess } = useAuth();

  if (adminOnly && (!profile || !["admin", "audit"].includes(profile.role))) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-brand-600 p-8 text-center max-w-md mx-auto mt-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1.5">
          Administrators only
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This section is restricted to administrator and audit accounts.
          Contact your administrator if you need access.
        </p>
      </div>
    );
  }

  if (module && !hasModuleAccess(module)) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-brand-600 p-8 text-center max-w-md mx-auto mt-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1.5">
          Access restricted
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your account doesn't have access to this module. Contact your
          administrator if you need access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
