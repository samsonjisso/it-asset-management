'use client';

import { DeviceOwnersPage } from '@/pages/DeviceOwnersPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="device_owners" adminOnly>
      <DeviceOwnersPage />
    </RouteGuard>;
}
