'use client';

import { AssetModelsPage } from '@/view-pages/AssetModelsPage';
import { RouteGuard } from '@/components/RouteGuard';

export default function Page() {
  return <RouteGuard module="asset_models" adminOnly>
      <AssetModelsPage />
    </RouteGuard>;
}
