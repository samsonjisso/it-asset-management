'use client';

import { RemindersPage } from '@/view-pages/RemindersPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="reminders">
      <RemindersPage />
    </RouteGuard>;
}
