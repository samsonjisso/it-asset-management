import { Modal } from "@/components/Modal";
import {
  Field,
  TextInput,
  NumberInput,
  SelectInput,
  TextArea,
  Button,
} from "@/components/FormControls";
import { ImageInput } from "@/components/ImageInput";
import { IPV4_PATTERN } from "@/lib/validation";
import type {
  Server,
  ServerOwner,
  ServerType,
  ServerEnvironment,
  IPSubnet,
} from "@/lib/supabase";
import type { ServerFormState } from "../types";

interface ServerFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: Server | null;
  form: ServerFormState;
  setForm: (form: ServerFormState) => void;
  saving: boolean;
  onSave: (e: React.SubmitEvent<HTMLFormElement>) => void;
  serverTypes: ServerType[];
  environments: ServerEnvironment[];
  serverOwners: ServerOwner[];
  detectedSubnet: IPSubnet | null;
}

export function ServerFormModal({
  open,
  onClose,
  editing,
  form,
  setForm,
  saving,
  onSave,
  serverTypes,
  environments,
  serverOwners,
  detectedSubnet,
}: ServerFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Server" : "Register New Server"}
      size="lg"
    >
      <form onSubmit={onSave} className="space-y-4">
        {editing?.asset_id && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
            <span className="text-xs font-medium text-gray-500">Asset ID</span>
            <span className="font-mono text-sm font-semibold text-brand-700">
              {editing.asset_id}
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Server Type"
            required
            hint={
              serverTypes.length === 0
                ? "No server types configured yet — add one under Customization > Server Types."
                : undefined
            }
          >
            <SelectInput
              value={form.server_type}
              onChange={(e) =>
                setForm({ ...form, server_type: e.target.value })
              }
              required
            >
              {serverTypes.length === 0 && (
                <option value="">No server types configured</option>
              )}
              {serverTypes.map((t) => (
                <option key={t.id} value={t.code}>
                  {t.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Server Name / Hostname" required>
            <TextInput
              value={form.hostname}
              onChange={(e) => setForm({ ...form, hostname: e.target.value })}
              placeholder="e.g., PROD-APP-01"
              required
            />
          </Field>
          <Field
            label="Server IP Address"
            hint={
              form.ip_address
                ? detectedSubnet
                  ? `Detected subnet: ${detectedSubnet.label}`
                  : "No matching subnet — add one under Customization > IP Subnets"
                : "e.g., 10.6.13.45"
            }
          >
            <TextInput
              value={form.ip_address}
              onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
              placeholder="10.6.x.x"
              pattern={IPV4_PATTERN}
              title="Enter a valid IPv4 address, e.g. 10.6.13.45"
            />
          </Field>
          <Field label="SSH Port Number">
            <NumberInput
              value={form.ssh_port}
              onChange={(e) => setForm({ ...form, ssh_port: e.target.value })}
              placeholder="22"
              min={1}
              max={65535}
            />
          </Field>
          <Field
            label="Server Environment"
            required
            hint={
              environments.length === 0
                ? "No environments configured yet — add one under Customization > Server Environments."
                : undefined
            }
          >
            <SelectInput
              value={form.environment}
              onChange={(e) =>
                setForm({ ...form, environment: e.target.value })
              }
              required
            >
              {environments.length === 0 && (
                <option value="">No environments configured</option>
              )}
              {environments.map((env) => (
                <option key={env.id} value={env.code}>
                  {env.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field
            label="Server Owner"
            required
            hint={
              serverOwners.length === 0
                ? "No owners configured yet — an admin can add one under Server Owner Management."
                : undefined
            }
          >
            <SelectInput
              value={form.server_owner}
              onChange={(e) =>
                setForm({ ...form, server_owner: e.target.value })
              }
              required
            >
              {serverOwners.length === 0 && (
                <option value="">No server owners configured</option>
              )}
              {serverOwners.map((o) => (
                <option key={o.id} value={o.code}>
                  {o.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Resource RAM">
            <TextInput
              value={form.ram}
              onChange={(e) => setForm({ ...form, ram: e.target.value })}
              placeholder="e.g., 32GB"
            />
          </Field>
          <Field label="Resource CPU">
            <TextInput
              value={form.cpu}
              onChange={(e) => setForm({ ...form, cpu: e.target.value })}
              placeholder="e.g., 8 cores"
            />
          </Field>
          <Field label="Resource Storage">
            <TextInput
              value={form.storage}
              onChange={(e) => setForm({ ...form, storage: e.target.value })}
              placeholder="e.g., 1TB"
            />
          </Field>
          <Field label="OS Release">
            <TextInput
              value={form.os_release}
              onChange={(e) => setForm({ ...form, os_release: e.target.value })}
              placeholder="e.g., Redhat 8, Ubuntu 22.04"
            />
          </Field>
          <Field label="Host Location">
            <TextInput
              value={form.host_location}
              onChange={(e) =>
                setForm({ ...form, host_location: e.target.value })
              }
              placeholder="e.g., ESXi 1, ESXi 2"
            />
          </Field>
        </div>
        <ImageInput
          value={form.image}
          onChange={(dataUrl) => setForm({ ...form, image: dataUrl })}
          label="Server Photo"
          hint="Optional — helps identify this server visually"
        />
        <Field label="Notes">
          <TextArea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="Additional notes..."
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving
              ? "Saving..."
              : editing
                ? "Update Server"
                : "Register Server"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
