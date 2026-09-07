'use client';

import { PatchLevelsPage } from '@/pages/PatchLevelsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="patch_levels" adminOnly>
      <PatchLevelsPage />
    </RouteGuard>;
}
