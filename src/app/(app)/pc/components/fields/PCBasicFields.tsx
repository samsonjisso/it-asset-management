import { Field, TextInput } from "@/components/FormControls";
import type { PCFormData } from "../../types/pcRegistration.types";
import { MAC_PATTERN } from "@/lib/validation";

type Props = {
  form: PCFormData;
  skipAssetTag: boolean;
  onChange: <K extends keyof PCFormData>(
    field: K,
    value: PCFormData[K],
  ) => void;
  onToggleAssetTag: () => void;
};

export function PCBasicFields({
  form,
  skipAssetTag,
  onChange,
  onToggleAssetTag,
}: Props) {
  return (
    <>
      <Field label="PC Hostname" required>
        <TextInput
          value={form.hostname}
          onChange={(e) => onChange("hostname", e.target.value)}
          placeholder="e.g., PC-HQ-001"
          required
        />
      </Field>
      <Field label="Display Monitor / Serial Number">
        <TextInput
          value={form.monitor_serial}
          onChange={(e) => onChange("monitor_serial", e.target.value)}
          placeholder="Monitor serial number"
        />
      </Field>
      <Field label="Asset Tag" skip onSkip={onToggleAssetTag}>
        <TextInput
          value={form.asset_tag}
          onChange={(e) => onChange("asset_tag", e.target.value)}
          placeholder={skipAssetTag ? "Skipped" : "Asset tag number"}
          disabled={skipAssetTag}
        />
      </Field>
      <Field label="Service Tag / Serial Number">
        <TextInput
          value={form.service_tag}
          onChange={(e) => onChange("service_tag", e.target.value)}
          placeholder="Service tag"
        />
      </Field>
      <Field label="MAC Address">
        <TextInput
          value={form.mac_address}
          onChange={(e) => onChange("mac_address", e.target.value)}
          placeholder="00:1A:2B:3C:4D:5E"
          pattern={MAC_PATTERN}
          title="Enter a valid MAC address, e.g. 00:1A:2B:3C:4D:5E"
        />
      </Field>
      <Field label="Product Key / License">
        <TextInput
          value={form.product_key}
          onChange={(e) => onChange("product_key", e.target.value)}
          placeholder="Product key (link to license)"
        />
      </Field>
      <Field label="CPU">
        <TextInput
          value={form.cpu}
          onChange={(e) => onChange("cpu", e.target.value)}
          placeholder="e.g., Intel Core i5-1240P"
        />
      </Field>
      <Field label="Memory Detail">
        <TextInput
          value={form.memory_detail}
          onChange={(e) => onChange("memory_detail", e.target.value)}
          placeholder="e.g., 16GB DDR4"
        />
      </Field>
      <Field label="Generation Detail">
        <TextInput
          value={form.generation_detail}
          onChange={(e) => onChange("generation_detail", e.target.value)}
          placeholder="e.g., 12th Gen"
        />
      </Field>
    </>
  );
}
