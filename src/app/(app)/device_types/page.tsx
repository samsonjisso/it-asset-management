'use client';

import { DeviceTypesPage } from '@/pages/DeviceTypesPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="device_types" adminOnly>
      <DeviceTypesPage />
    </RouteGuard>;
}
