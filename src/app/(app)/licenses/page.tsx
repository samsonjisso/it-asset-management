'use client';

import { useSearchParams } from 'next/navigation';
import { LicenseRegistrationPage } from '@/pages/LicenseRegistrationPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  const searchParams = useSearchParams();
  const createParam = searchParams.get('create');
  const autoOpenCreate = createParam ? Number(createParam) : undefined;
  return (
    <RouteGuard module="licenses">
      <LicenseRegistrationPage autoOpenCreate={autoOpenCreate} />
    </RouteGuard>
  );
}
