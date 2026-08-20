import { useCallback, useEffect, useState } from "react";
import {
  supabase,
  type AssetModel,
  type Device,
  type DeviceOwner,
  type DeviceType,
} from "@/lib/supabase";

export function useDeviceData() {
  const [records, setRecords] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [deviceOwners, setDeviceOwners] = useState<DeviceOwner[]>([]);
  const [deviceModels, setDeviceModels] = useState<AssetModel[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [devices, types, owners, models] = await Promise.all([
      supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("device_types").select("*").order("label"),
      supabase.from("device_owners").select("*").order("label"),
      supabase.from("asset_models").select("*").order("name"),
    ]);
    if (devices.data) setRecords(devices.data as Device[]);
    if (types.data) setDeviceTypes(types.data as DeviceType[]);
    if (owners.data) setDeviceOwners(owners.data as DeviceOwner[]);
    if (models.data)
      setDeviceModels(
        (models.data as AssetModel[]).filter(
          (model) => model.target === "device",
        ),
      );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);
  return {
    records,
    setRecords,
    deviceTypes,
    setDeviceTypes,
    deviceOwners,
    setDeviceOwners,
    deviceModels,
    loading,
    loadData,
  };
}
