'use client';

import { VendorsPage } from '@/pages/VendorsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="vendors" adminOnly>
      <VendorsPage />
    </RouteGuard>;
}
