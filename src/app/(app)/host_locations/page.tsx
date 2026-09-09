'use client';

import { HostLocationsPage } from '@/view-pages/HostLocationsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="host_locations" adminOnly>
      <HostLocationsPage />
    </RouteGuard>;
}
