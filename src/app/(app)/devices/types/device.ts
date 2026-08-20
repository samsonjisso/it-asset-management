import type {
  AssetModel,
  Device,
  DeviceOwner,
  DeviceType,
} from "@/lib/supabase";

export type DeviceForm = {
  device_type: string;
  device_owner: string;
  device_model: string;
  hostname: string;
  ip_address: string;
  serial_number: string;
  mac_address: string;
  location: string;
  rack_number: string;
  model_id: string;
  image: string | null;
  notes: string;
  extra_data: Record<string, string>;
};

export type DeviceRegistrationProps = {
  autoOpenCreate?: number;
  onNavigate?: (page: string) => void;
};

export type DeviceReferenceData = {
  records: Device[];
  deviceTypes: DeviceType[];
  deviceOwners: DeviceOwner[];
  deviceModels: AssetModel[];
};

export const EMPTY_DEVICE_FORM: DeviceForm = {
  device_type: "",
  device_owner: "",
  device_model: "",
  hostname: "",
  ip_address: "",
  serial_number: "",
  mac_address: "",
  location: "",
  rack_number: "",
  model_id: "",
  image: null,
  notes: "",
  extra_data: {},
};
