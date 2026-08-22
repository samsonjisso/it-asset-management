"use client";
import { Modal } from "../../../../components/Modal";
import { Field, TextInput, TextArea, Button } from "../../../../components/FormControls";
import { License, LicenseType, LicenseSubtype } from "../../../../lib/supabase";
import { LicenseFormData } from "../types";
import { LicenseFormFields } from "./LicenseFormFields";

interface LicenseFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: License | null;
  form: LicenseFormData;
  setForm: React.Dispatch<React.SetStateAction<LicenseFormData>>;
  saving: boolean;
  skipKey: boolean;
  setSkipKey: (v: boolean) => void;
  licenseTypeOptions: LicenseType[];
  licenseSubtypes: LicenseSubtype[];
  onSubmit: (e: React.FormEvent) => void;
}

export function LicenseFormModal({
  open,
  onClose,
  editing,
  form,
  setForm,
  saving,
  skipKey,
  setSkipKey,
  licenseTypeOptions,
  licenseSubtypes,
  onSubmit,
}: LicenseFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit License" : "Register New License"}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {editing?.asset_id && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
            <span className="text-xs font-medium text-gray-500">Asset ID</span>
            <span className="font-mono text-sm font-semibold text-brand-700">
              {editing.asset_id}
            </span>
          </div>
        )}
        <LicenseFormFields
          form={form}
          setForm={setForm}
          licenseTypeOptions={licenseTypeOptions}
          licenseSubtypes={licenseSubtypes}
        />
        <Field label="License Key" skip onSkip={() => setSkipKey(!skipKey)}>
          <TextInput
            value={form.license_key}
            onChange={(e) => setForm((prev) => ({ ...prev, license_key: e.target.value }))}
            placeholder={
              skipKey
                ? "Skipped (no license key for this type)"
                : "License key or number"
            }
            disabled={skipKey}
          />
        </Field>
        <Field label="Notes">
          <TextArea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            placeholder="Additional notes..."
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update License" : "Register License"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
