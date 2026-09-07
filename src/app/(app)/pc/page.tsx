'use client';

import { useSearchParams } from 'next/navigation';
import { PCRegistrationPage } from '@/pages/PCRegistrationPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  const searchParams = useSearchParams();
  const createParam = searchParams.get('create');
  const autoOpenCreate = createParam ? Number(createParam) : undefined;
  return (
    <RouteGuard module="pc">
      <PCRegistrationPage autoOpenCreate={autoOpenCreate} />
    </RouteGuard>
  );
}
