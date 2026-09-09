'use client';

import { FloorsPage } from '@/view-pages/FloorsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="floors" adminOnly>
      <FloorsPage />
    </RouteGuard>;
}
