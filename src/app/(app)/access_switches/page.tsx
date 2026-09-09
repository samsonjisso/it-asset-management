'use client';

import { AccessSwitchesPage } from '@/view-pages/AccessSwitchesPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="access_switches" adminOnly>
      <AccessSwitchesPage />
    </RouteGuard>;
}
