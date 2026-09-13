"use client";

import { RouteGuard } from "@/components/RouteGuard";
import { AuditPage } from "@/view-pages/AuditPage";

export default function Page() {
  return (
    <RouteGuard module="audit">
      <AuditPage />
    </RouteGuard>
  );
}