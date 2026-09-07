'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DeviceRegistrationPage } from '@/pages/DeviceRegistrationPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createParam = searchParams.get('create');
  const autoOpenCreate = createParam ? Number(createParam) : undefined;
  return (
    <RouteGuard module="devices">
      <DeviceRegistrationPage autoOpenCreate={autoOpenCreate} onNavigate={(page: string) => router.push(`/${page}`)} />
    </RouteGuard>
  );
}
