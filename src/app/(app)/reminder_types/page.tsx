'use client';

import { ReminderTypesPage } from '@/view-pages/ReminderTypesPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="reminder_types">
      <ReminderTypesPage />
    </RouteGuard>;
}
