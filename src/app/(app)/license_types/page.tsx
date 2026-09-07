'use client';

import { LicenseTypesPage } from '@/pages/LicenseTypesPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="license_types" adminOnly>
      <LicenseTypesPage />
    </RouteGuard>;
}
