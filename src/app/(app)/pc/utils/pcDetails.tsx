import type { AssetModel, PCRegistration } from "@/lib/supabase";
import type { DetailSection } from "@/components/DetailsModal";
import { ZoomImage } from "@/components/ZoomImage";

export function buildPCDetails(
  pc: PCRegistration,
  models: AssetModel[],
): DetailSection[] {
  const model = models.find((m) => m.id === pc.model_id);
  return [
    {
      title: "PC Information",
      fields: [
        { label: "Asset ID", value: pc.asset_id, mono: true },
        { label: "Hostname", value: pc.hostname },
        { label: "Display Monitor / Serial Number", value: pc.monitor_serial },
        { label: "Asset Tag", value: pc.asset_tag },
        { label: "Service Tag / Serial Number", value: pc.service_tag },
        { label: "Product Key / License", value: pc.product_key, mono: true },
        { label: "CPU", value: pc.cpu },
        { label: "Memory Detail", value: pc.memory_detail },
        { label: "Generation Detail", value: pc.generation_detail },
        { label: "Model", value: model?.name },
        {
          label: "Photo",
          value: pc.image ? <ZoomImage src={pc.image} size={144} /> : null,
          full: true,
        },
      ],
    },
    {
      title: "Network",
      fields: [
        { label: "IP Address", value: pc.ip_address, mono: true },
        { label: "MAC Address", value: pc.mac_address, mono: true },
        { label: "Switch Port Number", value: pc.switch_port_number },
        { label: "Access Switch Name", value: pc.access_switch_name },
        {
          label: "Access Switch IP Address",
          value: pc.access_switch_ip,
          mono: true,
        },
        { label: "Patch / Level Number", value: pc.patch_level_number },
      ],
    },
    {
      title: "Ownership & Location",
      fields: [
        { label: "Owner / Logged-in User", value: pc.owner_name },
        { label: "Department / Branch", value: pc.department?.name },
        { label: "Floor Number / Location", value: pc.floor_number },
      ],
    },
    {
      title: "Other",
      fields: [
        { label: "Notes", value: pc.notes, full: true },
        {
          label: "Registered",
          value: new Date(pc.created_at).toLocaleString(),
        },
        {
          label: "Last Updated",
          value: new Date(pc.updated_at).toLocaleString(),
        },
      ],
    },
  ];
}
