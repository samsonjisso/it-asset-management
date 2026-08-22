import { useRef } from "react";
import type { Device } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

export function useDeviceLifecycle(loadData: () => Promise<void>) {
  const { toast } = useToast();

  const lastAutoOpen = useRef<number | undefined>(undefined);

  const autoOpen = (
    value: number | undefined,
    openAdd: () => void
  ) => {
    if (value !== undefined && value !== lastAutoOpen.current) {
      lastAutoOpen.current = value;
      openAdd();
    }
  };

  const deleteDevice = async (device: Device) => {
    if (!confirm(`Delete device "${device.hostname}"?`)) return;

    const { error } = await supabase
      .from("devices")
      .delete()
      .eq("id", device.id);

    if (error) {
      toast(error.message, "error");
    } else {
      toast("Device deleted", "success");
      await loadData();
    }
  };

  return { autoOpen, deleteDevice };
}