import { useCallback, useEffect, useState } from "react";
import { supabase, AssetModel, DeviceType } from "@/lib/supabase";

// Owns fetching + refreshing the two read-only collections the page
// needs: the asset models themselves, and the device types used to
// scope a model to a specific device kind.
export function useAssetModelsData() {
  const [models, setModels] = useState<AssetModel[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [modelsRes, typesRes] = await Promise.all([
      supabase.from("asset_models").select("*").order("name"),
      supabase.from("device_types").select("*").order("label"),
    ]);
    if (modelsRes.data) setModels(modelsRes.data as AssetModel[]);
    if (typesRes.data) setDeviceTypes(typesRes.data as DeviceType[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { models, deviceTypes, loading, reload: loadData };
}
