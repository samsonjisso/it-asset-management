'use client';

import { useSearchParams } from 'next/navigation';
import { IPManagementPage } from '@/pages/IPManagementPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  const searchParams = useSearchParams();
  const createParam = searchParams?.get('create');
  const autoOpenCreate = createParam ? Number(createParam) : undefined;
  return (
    <RouteGuard module="ip">
      <IPManagementPage autoOpenCreate={autoOpenCreate} />
    </RouteGuard>
  );
}
