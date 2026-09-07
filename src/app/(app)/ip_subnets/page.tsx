'use client';

import { IPSubnetsPage } from '@/pages/IPSubnetsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="ip_subnets" adminOnly>
      <IPSubnetsPage />
    </RouteGuard>;
}
