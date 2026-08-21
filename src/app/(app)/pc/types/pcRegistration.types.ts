import type { AssetModel, PCRegistration } from "@/lib/supabase";

export type PCFormData = {
  hostname: string;
  monitor_serial: string;
  asset_tag: string;
  service_tag: string;
  mac_address: string;
  product_key: string;
  cpu: string;
  memory_detail: string;
  generation_detail: string;
  ip_address: string;
  owner_name: string;
  department_id: string;
  floor_number: string;
  switch_port_number: string;
  access_switch_ip: string;
  access_switch_name: string;
  patch_level_number: string;
  model_id: string;
  image: string | null;
  notes: string;
};

export type PCWritePayload = Omit<
  PCFormData,
  "asset_tag" | "floor_number" | "department_id" | "model_id"
> & {
  asset_tag: string | null;
  floor_number: string | null;
  department_id: string | null;
  model_id: string | null;
  registered_by?: string;
};

export type PCFormOptions = {
  skipAssetTag: boolean;
  skipFloor: boolean;
};

export type PCFormController = {
  form: PCFormData;
  skipAssetTag: boolean;
  skipFloor: boolean;
  setSkipAssetTag: (value: boolean) => void;
  setSkipFloor: (value: boolean) => void;
  reset: () => void;
  edit: (record: PCRegistration) => void;
  update: <K extends keyof PCFormData>(field: K, value: PCFormData[K]) => void;
  selectModel: (modelId: string, models: AssetModel[]) => void;
};

export const emptyPCForm: PCFormData = {
  hostname: "",
  monitor_serial: "",
  asset_tag: "",
  service_tag: "",
  mac_address: "",
  product_key: "",
  cpu: "",
  memory_detail: "",
  generation_detail: "",
  ip_address: "",
  owner_name: "",
  department_id: "",
  floor_number: "",
  switch_port_number: "",
  access_switch_ip: "",
  access_switch_name: "",
  patch_level_number: "",
  model_id: "",
  image: null,
  notes: "",
};
