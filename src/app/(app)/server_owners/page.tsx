'use client';

import { ServerOwnersPage } from '@/pages/ServerOwnersPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="server_owners" adminOnly>
      <ServerOwnersPage />
    </RouteGuard>;
}
