'use client';

import { BackupPage } from '@/view-pages/BackupPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="backup">
      <BackupPage />
    </RouteGuard>;
}
