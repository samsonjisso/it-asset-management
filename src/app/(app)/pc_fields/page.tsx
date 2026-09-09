'use client';

import { PCFieldsPage } from '@/view-pages/PCFieldsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="pc_fields" adminOnly>
      <PCFieldsPage />
    </RouteGuard>;
}
