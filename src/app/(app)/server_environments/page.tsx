'use client';

import { ServerEnvironmentsPage } from '@/pages/ServerEnvironmentsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="server_environments" adminOnly>
      <ServerEnvironmentsPage />
    </RouteGuard>;
}
