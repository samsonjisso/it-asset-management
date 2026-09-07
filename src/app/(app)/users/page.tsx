'use client';

import { UserManagementPage } from '@/pages/UserManagementPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="users">
      <UserManagementPage />
    </RouteGuard>;
}
