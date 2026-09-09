"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, PcFormFields, DeviceTypeField } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Button } from "../components/FormControls";
import { StdFieldsEditor } from "../components/StdFieldsEditor";
import { DeviceFieldEditor } from "../components/DeviceFieldEditor";
import { Monitor, Save } from "lucide-react";
import {
  PC_BASE_FIELD_META,
  ALL_PC_BASE_FIELDS,
  parsePcBaseFields,
  parsePcRequiredBaseFields,
  parsePcFieldLabels,
  parsePcExtraFields,
} from "../lib/pcFormFields";

// Register New PC Fields Customization (Customization > PC
// Registration Fields, admin only): configures every field on the
// "Register New PC" form — the standard fields (Hostname, MAC
// Address, License, etc.) can be shown/hidden, renamed, reordered,
// and marked mandatory/optional, and an admin can add fully custom
// fields (any of 19 field types, including dropdowns) on top, with no
// source-code change required. Uses the exact same field-customization
// framework as Device Type Customization (StdFieldsEditor here plays
// the role DeviceTypesPage's "Standard fields" chips play there, and
// DeviceFieldEditor is the identical component) — there's just one row
// of config instead of one per device type, since PCs don't have
// multiple "types".
export function PCFieldsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");
  const { toast } = useToast();
  const [config, setConfig] = useState<PcFormFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [baseFields, setBaseFields] = useState<string[]>(ALL_PC_BASE_FIELDS);
  const [requiredBaseFields, setRequiredBaseFields] = useState<string[]>([]);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [extraFields, setExtraFields] = useState<DeviceTypeField[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("pc_form_fields").select("*");
    const row = (data as PcFormFields[] | null)?.[0] ?? null;
    setConfig(row);
    setBaseFields(parsePcBaseFields(row));
    setRequiredBaseFields(parsePcRequiredBaseFields(row));
    setFieldLabels(parsePcFieldLabels(row));
    setExtraFields(parsePcExtraFields(row));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      base_fields: JSON.stringify(baseFields),
      required_base_fields: JSON.stringify(requiredBaseFields),
      field_labels: JSON.stringify(fieldLabels),
      fields: JSON.stringify(extraFields),
    };
    const { data, error } = config
      ? await supabase
          .from("pc_form_fields")
          .update(payload)
          .eq("id", config.id)
      : await supabase.from("pc_form_fields").insert({
          id: crypto.randomUUID(),
          ...payload,
        });
    setSaving(false);
    if (error) {
      toast(error.message, "error");
    } else {
      toast("PC registration fields updated", "success");
      if (data) setConfig(data as PcFormFields);
      await loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Monitor size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              PC Registration Fields
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Customize the "Register New PC" form — no code change required
            </p>
          </div>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
          >
            <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : !canManage ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 sm:p-6 space-y-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-brand-600 rounded-lg px-3 py-2">
            Read-only view — only administrators can change the Register New PC
            form.
          </p>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Standard fields (in form order)
            </p>
            <div className="divide-y divide-gray-100 rounded-lg border border-brand-600 overflow-hidden">
              {baseFields.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {fieldLabels[key] ?? PC_BASE_FIELD_META[key]?.label ?? key}
                  </span>
                  {requiredBaseFields.includes(key) && (
                    <span className="text-xs font-medium text-red-500">
                      Mandatory
                    </span>
                  )}
                </div>
              ))}
              {ALL_PC_BASE_FIELDS.filter((k) => !baseFields.includes(k)).map(
                (key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900"
                  >
                    <span className="text-gray-400 dark:text-gray-500 line-through">
                      {PC_BASE_FIELD_META[key]?.label ?? key}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Hidden
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Custom fields
            </p>
            {extraFields.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No custom fields configured
              </p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-lg border border-brand-600 overflow-hidden">
                {extraFields.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {f.label}{" "}
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ({f.type ?? "text"})
                      </span>
                    </span>
                    {f.required && (
                      <span className="text-xs font-medium text-red-500">
                        Mandatory
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 sm:p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Standard fields
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Hostname, MAC Address, License, and the rest of the built-in PC
              fields. Reorder with the arrows, rename, mark mandatory with the{" "}
              <span className="font-semibold text-red-500">*</span> badge, or
              remove a field from the form entirely — its data stays in the
              database, it just won't show up on the form. Each field keeps its
              dedicated input (e.g. the license picker or department dropdown).
            </p>
            <StdFieldsEditor
              allKeys={ALL_PC_BASE_FIELDS}
              meta={PC_BASE_FIELD_META}
              included={baseFields}
              required={requiredBaseFields}
              labels={fieldLabels}
              nonRequirable={["asset_tag"]}
              onChange={({ included, required, labels }) => {
                setBaseFields(included);
                setRequiredBaseFields(required);
                setFieldLabels(labels);
              }}
            />
          </div>
          <div className="pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Your own fields
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Add exactly what your PC inventory needs. Choose from 19 field
              types (including Dropdown, Multi-select, Image, File Upload, and
              Employee/Department/Branch selection), set which are mandatory,
              configure dropdown values, and reorder them with the arrows.
            </p>
            <DeviceFieldEditor fields={extraFields} onChange={setExtraFields} />
          </div>
        </div>
      )}
    </div>
  );
}
