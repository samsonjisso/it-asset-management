import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import type { DeviceType } from "@/lib/supabase";
import {
  fetchDeviceTypes,
  insertDeviceType,
  removeDeviceType,
  updateDeviceType as updateDeviceTypeRequest,
} from "../services/deviceTypeService";
import type { DeviceTypePayload } from "../types";

export function useDeviceTypes() {
  const { toast } = useToast();
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDeviceTypes(await fetchDeviceTypes());
    } catch (error) {
      toast(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const createDeviceType = async (payload: DeviceTypePayload) => {
    try {
      const created = await insertDeviceType(payload);
      setDeviceTypes((current) =>
        [...current, created].sort((a, b) => a.label.localeCompare(b.label)),
      );
      toast("Device type added", "success");
      return created;
    } catch (error) {
      toast(getErrorMessage(error), "error");
      return null;
    }
  };

  const updateDeviceType = async (id: string, payload: DeviceTypePayload) => {
    try {
      const updated = await updateDeviceTypeRequest(id, payload);
      setDeviceTypes((current) =>
        current
          .map((type) => (type.id === id ? updated : type))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
      toast("Device type updated", "success");
      return updated;
    } catch (error) {
      toast(getErrorMessage(error), "error");
      return null;
    }
  };

  const deleteDeviceType = async (id: string) => {
    const type = deviceTypes.find((item) => item.id === id);
    if (!type) return false;

    const confirmed = confirm(
      `Delete device type "${type.label}"? Devices already registered under it are unaffected, but this type and its fields will no longer be selectable.`,
    );
    if (!confirmed) return false;

    try {
      await removeDeviceType(id);
      setDeviceTypes((current) => current.filter((item) => item.id !== id));
      toast("Device type deleted", "success");
      return true;
    } catch (error) {
      toast(getErrorMessage(error), "error");
      return false;
    }
  };

  return {
    deviceTypes,
    loading,
    reload: load,
    createDeviceType,
    updateDeviceType,
    deleteDeviceType,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}
