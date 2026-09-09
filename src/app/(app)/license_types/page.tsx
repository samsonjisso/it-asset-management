'use client';

import { LicenseTypesPage } from '@/view-pages/LicenseTypesPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="license_types" adminOnly>
      <LicenseTypesPage />
    </RouteGuard>;
}
