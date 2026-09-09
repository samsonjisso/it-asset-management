'use client';

import { VendorsPage } from '@/view-pages/VendorsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="vendors" adminOnly>
      <VendorsPage />
    </RouteGuard>;
}
