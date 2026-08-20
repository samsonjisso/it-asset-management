import { useMemo, useState } from "react";
import type { AssetModel, Device, DeviceType } from "@/lib/supabase";
import { EMPTY_DEVICE_FORM, type DeviceForm } from "../types/device";
import { formFromDevice } from "../utils/deviceForm";

export function useDeviceForm(deviceTypes: DeviceType[], models: AssetModel[]) {
  const [form, setForm] = useState<DeviceForm>({ ...EMPTY_DEVICE_FORM });
  const [editing, setEditing] = useState<Device | null>(null);
  const [skipIP, setSkipIP] = useState(false);

  const selectedType = useMemo(
    () => deviceTypes.find((type) => type.code === form.device_type) ?? null,
    [deviceTypes, form.device_type],
  );
  const modelsForType = useMemo(
    () =>
      models.filter(
        (model) => !model.device_type || model.device_type === form.device_type,
      ),
    [models, form.device_type],
  );

  const openAdd = (ownerCode = "") => {
    setEditing(null);
    setForm({
      ...EMPTY_DEVICE_FORM,
      device_type: deviceTypes[0]?.code ?? "",
      device_owner: ownerCode || "",
    });
    setSkipIP(false);
  };
  const openEdit = (device: Device) => {
    setEditing(device);
    setForm(formFromDevice(device));
    setSkipIP(!device.ip_address);
  };
  const selectDeviceType = (code: string) => {
    setForm((current) => ({
      ...current,
      device_type: code,
      extra_data: {},
      model_id: "",
    }));
    setSkipIP(false);
  };
  const setExtraField = (key: string, value: string) =>
    setForm((current) => ({
      ...current,
      extra_data: { ...current.extra_data, [key]: value },
    }));
  const selectModel = (modelId: string) => {
    const model = models.find((item) => item.id === modelId);
    setForm((current) => ({
      ...current,
      model_id: modelId,
      device_model: model ? model.name : current.device_model,
      image: current.image ?? model?.image ?? null,
    }));
  };

  return {
    form,
    setForm,
    editing,
    setEditing,
    skipIP,
    setSkipIP,
    selectedType,
    modelsForType,
    openAdd,
    openEdit,
    selectDeviceType,
    setExtraField,
    selectModel,
  };
}
