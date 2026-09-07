'use client';

import { ReportsPage } from '@/pages/ReportsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="reports">
      <ReportsPage />
    </RouteGuard>;
}
