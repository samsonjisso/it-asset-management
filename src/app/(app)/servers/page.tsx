'use client';

import { useSearchParams } from 'next/navigation';
import { ServerRegistrationPage } from '@/pages/ServerRegistrationPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  const searchParams = useSearchParams();
  const createParam = searchParams.get('create');
  const autoOpenCreate = createParam ? Number(createParam) : undefined;
  return (
    <RouteGuard module="servers">
      <ServerRegistrationPage autoOpenCreate={autoOpenCreate} />
    </RouteGuard>
  );
}
