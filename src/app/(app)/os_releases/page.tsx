'use client';

import { OSReleasesPage } from '@/view-pages/OSReleasesPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="os_releases" adminOnly>
      <OSReleasesPage />
    </RouteGuard>;
}
