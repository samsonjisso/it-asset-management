'use client';

import { useCallback, useEffect, useState } from 'react';
import { Network, Save } from 'lucide-react';
import { supabase, DeviceTypeField, IpFormFields } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Button } from '../components/FormControls';
import { StdFieldsEditor } from '../components/StdFieldsEditor';
import { DeviceFieldEditor } from '../components/DeviceFieldEditor';
import {
  ALL_IP_BASE_FIELDS,
  IP_BASE_FIELD_META,
  parseIpBaseFields,
  parseIpExtraFields,
  parseIpFieldLabels,
  parseIpRequiredBaseFields,
} from '../lib/ipFormFields';

export function IPFieldsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin');
  const { toast } = useToast();
  const [config, setConfig] = useState<IpFormFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseFields, setBaseFields] = useState<string[]>(ALL_IP_BASE_FIELDS);
  const [requiredBaseFields, setRequiredBaseFields] = useState<string[]>([]);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [extraFields, setExtraFields] = useState<DeviceTypeField[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ip_form_fields').select('*');
    if (error) toast(error.message, 'error');
    const row = (data as IpFormFields[] | null)?.[0] ?? null;
    setConfig(row);
    setBaseFields(parseIpBaseFields(row));
    setRequiredBaseFields(parseIpRequiredBaseFields(row));
    setFieldLabels(parseIpFieldLabels(row));
    setExtraFields(parseIpExtraFields(row));
    setLoading(false);
  }, [toast]);

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
      ? await supabase.from('ip_form_fields').update(payload).eq('id', config.id)
      : await supabase.from('ip_form_fields').insert({ id: crypto.randomUUID(), ...payload });
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    if (data) setConfig(data as IpFormFields);
    toast('IP registration fields updated', 'success');
    await loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Network size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">IP Registration Fields</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Customize the Register IP Address form</p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
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
            Read-only view — only administrators can change the Register IP Address form.
          </p>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Configurable fields</p>
            <div className="divide-y divide-gray-100 rounded-lg border border-brand-600 overflow-hidden">
              {baseFields.map((key) => (
                <div key={key} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{fieldLabels[key] ?? IP_BASE_FIELD_META[key]?.label ?? key}</span>
                  {requiredBaseFields.includes(key) && <span className="text-xs font-medium text-red-500">Mandatory</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Custom fields</p>
            {extraFields.length === 0 ? <p className="text-sm text-gray-400 dark:text-gray-500">No custom fields configured</p> : (
              <div className="divide-y divide-gray-100 rounded-lg border border-brand-600 overflow-hidden">
                {extraFields.map((field) => (
                  <div key={field.key} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{field.label} <span className="text-xs text-gray-400">({field.type ?? 'text'})</span></span>
                    {field.required && <span className="text-xs font-medium text-red-500">Mandatory</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 sm:p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Configurable fields</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Reorder, rename, hide, or require the ordinary IP registration fields. Subnet, IP Address, and Status stay visible because they power the availability board and duplicate checks.
            </p>
            <StdFieldsEditor
              allKeys={ALL_IP_BASE_FIELDS}
              meta={IP_BASE_FIELD_META}
              included={baseFields}
              required={requiredBaseFields}
              labels={fieldLabels}
              onChange={({ included, required, labels }) => {
                setBaseFields(included);
                setRequiredBaseFields(required);
                setFieldLabels(labels);
              }}
            />
          </div>
          <div className="pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Your own fields</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Add custom IP inventory fields with validation, choices, employee or department selection, and required flags.</p>
            <DeviceFieldEditor fields={extraFields} onChange={setExtraFields} />
          </div>
        </div>
      )}
    </div>
  );
}
