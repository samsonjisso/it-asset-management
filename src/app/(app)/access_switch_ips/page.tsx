'use client';

import { AccessSwitchIpsPage } from '@/view-pages/AccessSwitchIpsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="access_switch_ips" adminOnly>
      <AccessSwitchIpsPage />
    </RouteGuard>;
}
