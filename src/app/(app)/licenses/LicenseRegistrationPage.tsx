"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  supabase,
  License,
  LicenseType,
  LicenseSubtype,
} from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { DataTable, Column } from "../../../components/DataTable";
import { Modal } from "../../../components/Modal";
import { DetailsModal, DetailSection } from "../../../components/DetailsModal";
import {
  Field,
  TextInput,
  NumberInput,
  SelectInput,
  TextArea,
  Button,
} from "../../../components/FormControls";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  KeyRound,
  Download,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const emptyForm = {
  license_type: "",
  license_subtype: "",
  vendor: "",
  license_key: "",
  number_of_licenses: "",
  effective_date: "",
  expiry_date: "",
  notes: "",
};

export function LicenseRegistrationPage({
  autoOpenCreate,
}: { autoOpenCreate?: number } = {}) {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<License[]>([]);
  const [licenseTypeOptions, setLicenseTypeOptions] = useState<LicenseType[]>(
    [],
  );
  const [licenseSubtypes, setLicenseSubtypes] = useState<LicenseSubtype[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [viewing, setViewing] = useState<License | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [skipKey, setSkipKey] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [licRes, typesRes, subtypesRes] = await Promise.all([
      supabase
        .from("licenses")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("license_types").select("*").order("label"),
      supabase.from("license_subtypes").select("*").order("label"),
    ]);
    if (licRes.data) setRecords(licRes.data as License[]);
    if (typesRes.data) setLicenseTypeOptions(typesRes.data as LicenseType[]);
    if (subtypesRes.data)
      setLicenseSubtypes(subtypesRes.data as LicenseSubtype[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, license_type: licenseTypeOptions[0]?.code ?? "" });
    setSkipKey(false);
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      autoOpenCreate !== undefined &&
      autoOpenCreate !== lastAutoOpen.current
    ) {
      lastAutoOpen.current = autoOpenCreate;
      openAdd();
    }
  }, [autoOpenCreate]);

  const openView = (rec: License) => setViewing(rec);

  const openEdit = (rec: License) => {
    setEditing(rec);
    setForm({
      license_type: rec.license_type,
      license_subtype: rec.license_subtype ?? "",
      vendor: rec.vendor ?? "",
      license_key: rec.license_key ?? "",
      number_of_licenses: rec.number_of_licenses?.toString() ?? "",
      effective_date: rec.effective_date ?? "",
      expiry_date: rec.expiry_date ?? "",
      notes: rec.notes ?? "",
    });
    setSkipKey(!rec.license_key);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.license_type) {
      toast(
        "License Type is required. Ask an admin to add one under License Type Management.",
        "error",
      );
      return;
    }
    if (
      form.number_of_licenses.trim() &&
      !/^\d+$/.test(form.number_of_licenses.trim())
    ) {
      toast("Number of Licenses must be a whole number", "error");
      return;
    }
    if (
      form.effective_date &&
      form.expiry_date &&
      form.expiry_date < form.effective_date
    ) {
      toast("Expiry Date cannot be before the Effective Date", "error");
      return;
    }
    setSaving(true);
    const payload = {
      license_type: form.license_type,
      license_subtype: form.license_subtype || null,
      vendor: form.vendor || null,
      license_key: skipKey ? null : form.license_key || null,
      number_of_licenses: form.number_of_licenses
        ? parseInt(form.number_of_licenses)
        : null,
      effective_date: form.effective_date || null,
      expiry_date: form.expiry_date || null,
      notes: form.notes || null,
      registered_by: profile?.id,
    };
    const { error } = editing
      ? await supabase.from("licenses").update(payload).eq("id", editing.id)
      : await supabase.from("licenses").insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, "error");
    } else {
      toast(editing ? "License updated" : "License registered", "success");
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (rec: License) => {
    if (
      !confirm(`Delete license "${rec.license_subtype ?? rec.license_type}"?`)
    )
      return;
    const { error } = await supabase.from("licenses").delete().eq("id", rec.id);
    if (error) toast(error.message, "error");
    else {
      toast("License deleted", "success");
      loadData();
    }
  };

  const getExpiryStatus = (rec: License) => {
    if (!rec.expiry_date) return null;
    const days = Math.ceil(
      (new Date(rec.expiry_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    if (days < 0)
      return { label: "Expired", color: "text-red-600 bg-red-50", days };
    if (days <= 30)
      return {
        label: `Expires in ${days}d`,
        color: "text-amber-600 bg-amber-50",
        days,
      };
    if (days <= 60)
      return {
        label: `Expires in ${days}d`,
        color: "text-blue-600 bg-blue-50",
        days,
      };
    return { label: "Active", color: "text-green-600 bg-green-50", days };
  };

  const exportCSV = () => {
    const headers = [
      "Asset ID",
      "License Type",
      "Subtype",
      "Vendor",
      "License Key",
      "Number of Licenses",
      "Effective Date",
      "Expiry Date",
      "Status",
      "Created At",
    ];
    const rows = records.map((r) => {
      const status = getExpiryStatus(r);
      return [
        r.asset_id ?? "",
        r.license_type,
        r.license_subtype ?? "",
        r.vendor ?? "",
        r.license_key ?? "N/A",
        r.number_of_licenses ?? "",
        r.effective_date ?? "",
        r.expiry_date ?? "",
        status?.label ?? "No expiry",
        new Date(r.created_at).toLocaleDateString(),
      ];
    });
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `licenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentType = licenseTypeOptions.find(
    (t) => t.code === form.license_type,
  );
  const currentSubtypes = useMemo(
    () => licenseSubtypes.filter((s) => s.license_type_id === currentType?.id),
    [licenseSubtypes, currentType],
  );

  const columns: Column<License>[] = [
    {
      key: "asset_id",
      label: "Key",
      sortable: true,
      sortValue: (r) => r.asset_id ?? "",
      render: (r) =>
        r.asset_id ? (
          <span className="font-mono text-xs font-semibold text-brand-700">
            {r.asset_id}
          </span>
        ) : (
          <span className="text-gray-400 italic">-</span>
        ),
    },
    {
      key: "license_type",
      label: "Name",
      sortable: true,
      sortValue: (r) => r.license_type,
      render: (r) => (
        <span className="font-medium text-gray-900">
          {licenseTypeOptions.find((t) => t.code === r.license_type)?.label ??
            r.license_type}
          {r.license_subtype ? ` — ${r.license_subtype}` : ""}
        </span>
      ),
    },
    { key: "vendor", label: "Vendor", render: (r) => r.vendor ?? "-" },
    {
      key: "expiry_date",
      label: "Expiry",
      sortable: true,
      sortValue: (r) => r.expiry_date ?? "9999",
      render: (r) => {
        const status = getExpiryStatus(r);
        if (!r.expiry_date)
          return <span className="text-gray-400">No expiry</span>;
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs">
              {new Date(r.expiry_date).toLocaleDateString()}
            </span>
            {status && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 w-fit ${status.color}`}
              >
                {status.days <= 30 && status.days >= 0 ? (
                  <AlertTriangle size={10} />
                ) : status.days < 0 ? (
                  <AlertTriangle size={10} />
                ) : (
                  <CheckCircle size={10} />
                )}
                {status.label}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openView(r)}
            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {canWrite() && (
            <button
              onClick={() => openEdit(r)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
          )}
          {canWrite() && hasRole("admin") && (
            <button
              onClick={() => handleDelete(r)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const viewingStatus = viewing ? getExpiryStatus(viewing) : null;
  const viewSections: DetailSection[] = viewing
    ? [
        {
          title: "License Information",
          fields: [
            { label: "Asset ID", value: viewing.asset_id, mono: true },
            {
              label: "License Type",
              value:
                licenseTypeOptions.find((t) => t.code === viewing.license_type)
                  ?.label ?? viewing.license_type,
            },
            { label: "Subtype", value: viewing.license_subtype },
            { label: "Vendor", value: viewing.vendor },
            {
              label: "License Key",
              value: viewing.license_key,
              mono: true,
              full: true,
            },
            { label: "Number of Licenses", value: viewing.number_of_licenses },
          ],
        },
        {
          title: "Validity",
          fields: [
            {
              label: "Effective Date",
              value: viewing.effective_date
                ? new Date(viewing.effective_date).toLocaleDateString()
                : null,
            },
            {
              label: "Expiry Date",
              value: viewing.expiry_date
                ? new Date(viewing.expiry_date).toLocaleDateString()
                : "No expiry",
            },
            { label: "Status", value: viewingStatus?.label ?? "No expiry" },
          ],
        },
        {
          title: "Other",
          fields: [
            { label: "Notes", value: viewing.notes, full: true },
            {
              label: "Registered",
              value: new Date(viewing.created_at).toLocaleString(),
            },
            {
              label: "Last Updated",
              value: new Date(viewing.updated_at).toLocaleString(),
            },
          ],
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <KeyRound size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              License Registration
            </h1>
            <p className="text-sm text-gray-500">
              {records.length} registered licenses
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </Button>
          {canWrite() && (
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={16} /> Register License
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={["license_subtype", "vendor", "license_key"]}
          searchPlaceholder="Search by subtype, vendor, key..."
          dateFilterKey="created_at"
          emptyMessage="No licenses registered yet"
          onRowClick={openView}
        />
      )}

      <DetailsModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={
          viewing
            ? (licenseTypeOptions.find((t) => t.code === viewing.license_type)
                ?.label ?? viewing.license_type)
            : ""
        }
        subtitle={viewing?.license_subtype ?? viewing?.vendor ?? undefined}
        icon={<KeyRound size={22} />}
        sections={viewSections}
        onEdit={
          viewing && canWrite()
            ? () => {
                const rec = viewing;
                setViewing(null);
                openEdit(rec);
              }
            : undefined
        }
        editLabel="Edit License"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit License" : "Register New License"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {editing?.asset_id && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
              <span className="text-xs font-medium text-gray-500">
                Asset ID
              </span>
              <span className="font-mono text-sm font-semibold text-brand-700">
                {editing.asset_id}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="License Type" required>
              <SelectInput
                value={form.license_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    license_type: e.target.value,
                    license_subtype: "",
                  })
                }
                required
              >
                {licenseTypeOptions.length === 0 && (
                  <option value="">No license types configured</option>
                )}
                {licenseTypeOptions.map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="License Subtype">
              <SelectInput
                value={form.license_subtype}
                onChange={(e) =>
                  setForm({ ...form, license_subtype: e.target.value })
                }
              >
                <option value="">Select subtype</option>
                {currentSubtypes.map((s) => (
                  <option key={s.id} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Vendor (Company)">
              <TextInput
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="e.g., Microsoft, Redhat, VMware"
              />
            </Field>
            <Field label="Number of Licenses">
              <NumberInput
                min={0}
                value={form.number_of_licenses}
                onChange={(e) =>
                  setForm({ ...form, number_of_licenses: e.target.value })
                }
                placeholder="Total purchased licenses"
              />
            </Field>
            <Field label="Effective Date (optional)">
              <TextInput
                type="date"
                value={form.effective_date}
                onChange={(e) =>
                  setForm({ ...form, effective_date: e.target.value })
                }
              />
            </Field>
            <Field label="Expiry Date">
              <TextInput
                type="date"
                value={form.expiry_date}
                onChange={(e) =>
                  setForm({ ...form, expiry_date: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="License Key" skip onSkip={() => setSkipKey(!skipKey)}>
            <TextInput
              value={form.license_key}
              onChange={(e) =>
                setForm({ ...form, license_key: e.target.value })
              }
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
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes..."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving
                ? "Saving..."
                : editing
                  ? "Update License"
                  : "Register License"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
