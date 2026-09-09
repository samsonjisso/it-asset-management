'use client';

import { NotificationsPage } from '@/view-pages/NotificationsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="notifications">
      <NotificationsPage />
    </RouteGuard>;
}
