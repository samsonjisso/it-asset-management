'use client';

import { ServerTypesPage } from '@/pages/ServerTypesPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="server_types" adminOnly>
      <ServerTypesPage />
    </RouteGuard>;
}
