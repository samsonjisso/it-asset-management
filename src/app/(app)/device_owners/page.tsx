'use client';

import { DeviceOwnersPage } from '@/view-pages/DeviceOwnersPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="device_owners" adminOnly>
      <DeviceOwnersPage />
    </RouteGuard>;
}
