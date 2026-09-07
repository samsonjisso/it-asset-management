'use client';

import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="departments" adminOnly>
      <DepartmentsPage />
    </RouteGuard>;
}
