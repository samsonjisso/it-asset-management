import { Field, TextInput } from "@/components/FormControls";
import type { PCFormData } from "../../types/pcRegistration.types";
import { IPV4_PATTERN } from "@/lib/validation";

type Props = {
  form: PCFormData;
  onChange: <K extends keyof PCFormData>(
    field: K,
    value: PCFormData[K],
  ) => void;
};

export function PCNetworkFields({ form, onChange }: Props) {
  return (
    <>
      <Field label="IP Address">
        <TextInput
          value={form.ip_address}
          onChange={(e) => onChange("ip_address", e.target.value)}
          placeholder="10.6.x.x"
          pattern={IPV4_PATTERN}
          title="Enter a valid IPv4 address, e.g. 10.6.13.45"
        />
      </Field>
      <Field label="Owner / Logged-in User">
        <TextInput
          value={form.owner_name}
          onChange={(e) => onChange("owner_name", e.target.value)}
          placeholder="Employee who uses this PC"
        />
      </Field>
      <Field label="Switch Port Number">
        <TextInput
          value={form.switch_port_number}
          onChange={(e) => onChange("switch_port_number", e.target.value)}
          placeholder="e.g., Port 24"
        />
      </Field>
      <Field label="Access Switch Name">
        <TextInput
          value={form.access_switch_name}
          onChange={(e) => onChange("access_switch_name", e.target.value)}
          placeholder="e.g., Access Switch 01"
        />
      </Field>
      <Field label="Access Switch IP Address">
        <TextInput
          value={form.access_switch_ip}
          onChange={(e) => onChange("access_switch_ip", e.target.value)}
          placeholder="e.g., 10.6.1.103"
          pattern={IPV4_PATTERN}
          title="Enter a valid IPv4 address, e.g. 10.6.1.103"
        />
      </Field>
      <Field label="Patch / Level Number">
        <TextInput
          value={form.patch_level_number}
          onChange={(e) => onChange("patch_level_number", e.target.value)}
          placeholder="Patch level number"
        />
      </Field>
    </>
  );
}
