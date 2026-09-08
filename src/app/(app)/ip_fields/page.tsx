import { IPFieldsPage } from '@/pages/IPFieldsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return (
    <RouteGuard module="ip_fields" adminOnly>
      <IPFieldsPage />
    </RouteGuard>
  );
}
