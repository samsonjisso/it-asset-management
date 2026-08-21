import { useCallback, useState } from "react";
import type { AssetModel, PCRegistration } from "@/lib/supabase";
import { emptyPCForm, type PCFormData } from "../types/pcRegistration.types";

export function usePCForm() {
  const [form, setForm] = useState<PCFormData>({ ...emptyPCForm });
  const [skipAssetTag, setSkipAssetTag] = useState(false);
  const [skipFloor, setSkipFloor] = useState(false);

  const reset = useCallback(() => {
    setForm({ ...emptyPCForm });
    setSkipAssetTag(false);
    setSkipFloor(false);
  }, []);

  const edit = useCallback((record: PCRegistration) => {
    setForm({
      hostname: record.hostname,
      monitor_serial: record.monitor_serial ?? "",
      asset_tag: record.asset_tag ?? "",
      service_tag: record.service_tag ?? "",
      mac_address: record.mac_address ?? "",
      product_key: record.product_key ?? "",
      cpu: record.cpu ?? "",
      memory_detail: record.memory_detail ?? "",
      generation_detail: record.generation_detail ?? "",
      ip_address: record.ip_address ?? "",
      owner_name: record.owner_name ?? "",
      department_id: record.department_id ?? "",
      floor_number: record.floor_number ?? "",
      switch_port_number: record.switch_port_number ?? "",
      access_switch_ip: record.access_switch_ip ?? "",
      access_switch_name: record.access_switch_name ?? "",
      patch_level_number: record.patch_level_number ?? "",
      model_id: record.model_id ?? "",
      image: record.image ?? null,
      notes: record.notes ?? "",
    });
    setSkipAssetTag(!record.asset_tag);
    setSkipFloor(!record.floor_number);
  }, []);

  const update = useCallback(
    <K extends keyof PCFormData>(field: K, value: PCFormData[K]) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const selectModel = useCallback((modelId: string, models: AssetModel[]) => {
    const model = models.find((item) => item.id === modelId);
    setForm((current) => ({
      ...current,
      model_id: modelId,
      image: current.image ?? model?.image ?? null,
    }));
  }, []);

  return {
    form,
    skipAssetTag,
    skipFloor,
    setSkipAssetTag,
    setSkipFloor,
    reset,
    edit,
    update,
    selectModel,
  };
}
