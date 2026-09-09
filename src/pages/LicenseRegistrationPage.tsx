"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  supabase,
  License,
  LicenseType,
  LicenseSubtype,
  Vendor,
  Reminder,
  DirectoryUser,
} from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { DataTable, Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { DetailsModal, DetailSection } from "../components/DetailsModal";
import {
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Button,
} from "../components/FormControls";
import { SearchableSelect } from "../components/SearchableSelect";
import { FileAttachmentInput } from "../components/FileAttachmentInput";
import { fetchProfileDirectory } from "../lib/api";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  KeyRound,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
  Paperclip,
  BellRing,
} from "lucide-react";
import { ImportModal, ImportColumn } from "../components/ImportModal";

// reminder_type value used for reminders auto-generated from a
// license's expiry date (see "Remind me before expiry" below). The
// reminders.reminder_type column is free-text (not tied to an entry in
// Admin > Reminder Type Management), so this works regardless of
// whether an admin has added a matching type there.
const AUTO_REMINDER_TYPE = "License Expiry";
const DEFAULT_REMINDER_DAYS = "30";

const emptyForm = {
  license_name: "",
  license_type: "",
  license_subtype: "",
  vendor: "",
  license_key: "",
  number_of_licenses: "",
  effective_date: "",
  expiry_date: "",
  never_expires: false,
  notes: "",
  attachment: null as string | null,
  attachment_name: null as string | null,
  // Auto-reminder: when enabled, saving the license creates/updates a
  // reminder in Reminders & Notifications for N days before expiry.
  auto_reminder: true,
  auto_reminder_days: DEFAULT_REMINDER_DAYS,
  auto_reminder_email: "",
};

export function LicenseRegistrationPage({
  autoOpenCreate,
}: { autoOpenCreate?: number } = {}) {
  const { canWrite, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<License[]>([]);
  const [licenseTypeOptions, setLicenseTypeOptions] = useState<LicenseType[]>(
    [],
  );
  const [licenseSubtypes, setLicenseSubtypes] = useState<LicenseSubtype[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [employees, setEmployees] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [viewing, setViewing] = useState<License | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [skipKey, setSkipKey] = useState(false);
  // id of the reminder (if any) already auto-generated from this
  // license's expiry date — null for a new license, or an existing one
  // that has no auto-reminder yet. Used so saving updates that same
  // reminder instead of creating a duplicate each time.
  const [linkedReminderId, setLinkedReminderId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [licRes, typesRes, subtypesRes, vendorsRes, employeesRes] =
      await Promise.all([
        supabase
          .from("licenses")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("license_types").select("*").order("label"),
        supabase.from("license_subtypes").select("*").order("label"),
        supabase.from("vendors").select("*").order("label"),
        // Resolves registered_by to a name for "Registered By" in the
        // detail view — see GET /profiles/directory.
        fetchProfileDirectory(),
      ]);
    if (licRes.data) setRecords(licRes.data as License[]);
    if (typesRes.data) setLicenseTypeOptions(typesRes.data as LicenseType[]);
    if (subtypesRes.data)
      setLicenseSubtypes(subtypesRes.data as LicenseSubtype[]);
    if (vendorsRes.data) setVendors(vendorsRes.data as Vendor[]);
    if (employeesRes.data) setEmployees(employeesRes.data as DirectoryUser[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      license_type: licenseTypeOptions[0]?.code ?? "",
      auto_reminder_email: profile?.email ?? "",
    });
    setSkipKey(false);
    setLinkedReminderId(null);
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      autoOpenCreate !== undefined &&
      autoOpenCreate !== lastAutoOpen.current
    ) {
      lastAutoOpen.current = autoOpenCreate;
      if (canWrite()) openAdd();
    }
  }, [autoOpenCreate]);

  const openView = (rec: License) => setViewing(rec);

  const openEdit = async (rec: License) => {
    setEditing(rec);
    setForm({
      license_name: rec.license_name ?? "",
      license_type: rec.license_type,
      license_subtype: rec.license_subtype ?? "",
      vendor: rec.vendor ?? "",
      license_key: rec.license_key ?? "",
      number_of_licenses: rec.number_of_licenses?.toString() ?? "",
      effective_date: rec.effective_date ?? "",
      expiry_date: rec.expiry_date ?? "",
      never_expires: !rec.expiry_date,
      notes: rec.notes ?? "",
      attachment: rec.attachment ?? null,
      attachment_name: rec.attachment_name ?? null,
      // Placeholder until the auto-reminder lookup below resolves —
      // avoids showing the toggle on for a beat before we know whether
      // one already exists.
      auto_reminder: false,
      auto_reminder_days: DEFAULT_REMINDER_DAYS,
      auto_reminder_email: profile?.email ?? "",
    });
    setSkipKey(!rec.license_key);
    setLinkedReminderId(null);
    setModalOpen(true);

    // Look up whether this license already has an auto-generated
    // reminder, so the toggle/fields reflect what's actually there
    // instead of always resetting to the defaults.
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("license_id", rec.id);
    const existing = ((data as Reminder[] | null) ?? [])[0] ?? null;
    if (existing) {
      const days = rec.expiry_date
        ? Math.round(
            (new Date(`${rec.expiry_date}T00:00:00`).getTime() -
              new Date(existing.remind_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : Number(DEFAULT_REMINDER_DAYS);
      setLinkedReminderId(existing.id);
      setForm((f) => ({
        ...f,
        auto_reminder: true,
        auto_reminder_days: days > 0 ? String(days) : DEFAULT_REMINDER_DAYS,
        auto_reminder_email: existing.alert_email ?? profile?.email ?? "",
      }));
    }
  };

  const currentType = licenseTypeOptions.find(
    (t) => t.code === form.license_type,
  );
  const currentSubtypes = useMemo(
    () => licenseSubtypes.filter((s) => s.license_type_id === currentType?.id),
    [licenseSubtypes, currentType],
  );

  // Windows License special-case: per the system's license model, a
  // Windows license (License Subtype "Windows", under the Operating
  // System License type) is treated as non-expiring and doesn't track
  // a license count the way other license types do - Number of
  // Licenses becomes optional and Effective/Expiry Date are hidden
  // (silently forced to never-expiring) rather than collected.
  // License Key is shown (with its existing skip option) for every
  // license type, Windows included - it isn't affected by this flag.
  const isWindowsLicense =
    form.license_subtype.trim().toLowerCase() === "windows";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.license_name.trim()) {
      toast("License Name is required", "error");
      return;
    }
    if (!form.license_type) {
      toast(
        "License Type is required. Ask an admin to add one under License Type Management.",
        "error",
      );
      return;
    }
    if (!form.license_subtype.trim()) {
      toast("License Subtype is required", "error");
      return;
    }
    if (!isWindowsLicense) {
      if (!form.number_of_licenses.trim()) {
        toast("Number of Licenses is required", "error");
        return;
      }
      if (!/^\d+$/.test(form.number_of_licenses.trim())) {
        toast("Number of Licenses must be a whole number", "error");
        return;
      }
    } else if (
      form.number_of_licenses.trim() &&
      !/^\d+$/.test(form.number_of_licenses.trim())
    ) {
      toast("Number of Licenses must be a whole number", "error");
      return;
    }
    if (!isWindowsLicense && !form.never_expires) {
      if (!form.expiry_date) {
        toast(
          "Expiry Date is required unless Never Expire is selected",
          "error",
        );
        return;
      }
      if (form.effective_date && form.expiry_date < form.effective_date) {
        toast("Expiry Date cannot be before the Effective Date", "error");
        return;
      }
    }
    const wantsAutoReminder =
      !isWindowsLicense && !form.never_expires && form.auto_reminder;
    if (wantsAutoReminder) {
      const daysNum = parseInt(form.auto_reminder_days, 10);
      if (
        !form.auto_reminder_days.trim() ||
        !Number.isFinite(daysNum) ||
        daysNum < 1
      ) {
        toast(
          "Days Before Expiry must be a whole number of 1 or more",
          "error",
        );
        return;
      }
    }
    setSaving(true);
    const payload = {
      license_name: form.license_name.trim(),
      license_type: form.license_type,
      license_subtype: form.license_subtype || null,
      vendor: form.vendor || null,
      license_key: skipKey ? null : form.license_key || null,
      number_of_licenses: form.number_of_licenses
        ? parseInt(form.number_of_licenses)
        : null,
      effective_date: isWindowsLicense ? null : form.effective_date || null,
      expiry_date:
        isWindowsLicense || form.never_expires ? null : form.expiry_date,
      never_expires: isWindowsLicense ? true : form.never_expires,
      notes: form.notes || null,
      attachment: form.attachment,
      attachment_name: form.attachment_name,
      registered_by: profile?.id,
    };
    const { data, error } = editing
      ? await supabase.from("licenses").update(payload).eq("id", editing.id)
      : await supabase.from("licenses").insert(payload);
    if (error) {
      setSaving(false);
      toast(error.message, "error");
      return;
    }
    const licenseId = editing ? editing.id : (data as License | null)?.id;
    if (licenseId) {
      await syncAutoReminder(licenseId, payload.expiry_date, wantsAutoReminder);
    }
    setSaving(false);
    toast(editing ? "License updated" : "License registered", "success");
    setModalOpen(false);
    loadData();
  };

  // Creates, updates, or removes the reminder auto-generated from this
  // license's expiry date, so saving the license keeps its Reminders &
  // Notifications entry (if any) in sync rather than piling up
  // duplicates. Best-effort: a failure here doesn't block or undo the
  // license save that already succeeded, it's just surfaced as a
  // secondary toast.
  const syncAutoReminder = async (
    licenseId: string,
    expiryDate: string | null,
    wantsReminder: boolean,
  ) => {
    try {
      if (!wantsReminder || !expiryDate) {
        if (linkedReminderId)
          await supabase.from("reminders").delete().eq("id", linkedReminderId);
        return;
      }
      const daysBefore = parseInt(form.auto_reminder_days, 10);
      const remindAt = new Date(`${expiryDate}T00:00:00`);
      remindAt.setDate(remindAt.getDate() - daysBefore);
      remindAt.setHours(9, 0, 0, 0);
      const reminderPayload: Record<string, unknown> = {
        title: `${form.license_name.trim()} — license expiring`,
        reminder_type: AUTO_REMINDER_TYPE,
        detail: `Auto-reminder: ${form.license_name.trim()}${form.vendor ? ` (${form.vendor})` : ""} expires on ${new Date(`${expiryDate}T00:00:00`).toLocaleDateString()}.`,
        remind_at: remindAt.toISOString(),
        alert_email: form.auto_reminder_email.trim() || null,
        license_id: licenseId,
        created_by: profile?.id,
      };
      if (linkedReminderId) {
        reminderPayload.is_notified = false;
        await supabase
          .from("reminders")
          .update(reminderPayload)
          .eq("id", linkedReminderId);
      } else {
        await supabase.from("reminders").insert(reminderPayload);
      }
    } catch {
      toast(
        "License saved, but the auto-reminder could not be synced",
        "error",
      );
    }
  };

  const handleDelete = async (rec: License) => {
    if (
      !confirm(
        `Delete license "${rec.license_name || rec.license_subtype || rec.license_type}"?`,
      )
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
        color: "text-brand-600 bg-brand-50 dark:bg-brand-900/40",
        days,
      };
    return { label: "Active", color: "text-green-600 bg-green-50", days };
  };

  const exportCSV = () => {
    const headers = [
      "Asset ID",
      "License Name",
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
        r.license_name ?? "",
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

  // Bulk import from Excel/CSV — see ImportModal. Auto-reminder setup
  // and file attachments aren't part of the import — those can be added
  // afterwards by editing the imported record.
  const [importOpen, setImportOpen] = useState(false);
  const findByLabel = <T,>(
    list: T[],
    getLabel: (t: T) => string,
    needle: string,
  ) =>
    list.find(
      (x) => getLabel(x).trim().toLowerCase() === needle.trim().toLowerCase(),
    );

  const parseDateCell = (
    raw: string,
  ): { value: string | null; error?: string } => {
    if (!raw.trim()) return { value: null };
    // Accept an already-ISO value as-is; otherwise try to parse whatever
    // Excel/CSV handed us (e.g. "5/1/2024") and reformat to YYYY-MM-DD.
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return { value: raw.trim() };
    const d = new Date(raw.trim());
    if (isNaN(d.getTime()))
      return { value: null, error: `"${raw}" isn't a recognizable date` };
    return { value: d.toISOString().slice(0, 10) };
  };

  const importColumns: ImportColumn[] = [
    {
      key: "license_name",
      label: "License Name",
      required: true,
      example: "Adobe Acrobat Pro",
    },
    {
      key: "license_type",
      label: "License Type",
      required: true,
      example: licenseTypeOptions[0]?.label,
    },
    {
      key: "license_subtype",
      label: "Subtype",
      required: true,
      example: "Standard",
    },
    { key: "vendor", label: "Vendor" },
    { key: "license_key", label: "License Key" },
    { key: "number_of_licenses", label: "Number of Licenses", example: "10" },
    { key: "effective_date", label: "Effective Date", example: "2024-01-01" },
    { key: "expiry_date", label: "Expiry Date", example: "2025-01-01" },
    { key: "never_expires", label: "Never Expire (Yes/No)" },
    { key: "notes", label: "Notes" },
  ];

  const validateImportRow = (raw: Record<string, string>) => {
    const preview = { ...raw };
    const errors: string[] = [];

    if (!raw.license_name?.trim()) errors.push("License Name is required");

    let typeCode: string | null = null;
    let typeId: string | null = null;
    if (!raw.license_type) errors.push("License Type is required");
    else {
      const t = findByLabel(
        licenseTypeOptions,
        (x) => x.label,
        raw.license_type,
      );
      if (!t) errors.push(`License Type "${raw.license_type}" not found`);
      else {
        typeCode = t.code;
        typeId = t.id;
      }
    }
    let subtypeLabel: string | null = null;
    let isWindows = false;
    if (!raw.license_subtype) errors.push("Subtype is required");
    else if (typeId) {
      const sub = licenseSubtypes.find(
        (s) =>
          s.license_type_id === typeId &&
          s.label.trim().toLowerCase() ===
            raw.license_subtype?.trim().toLowerCase(),
      );
      if (!sub)
        errors.push(
          `Subtype "${raw.license_subtype}" isn't configured for License Type "${raw.license_type}"`,
        );
      else {
        subtypeLabel = sub.label;
        isWindows = sub.label.trim().toLowerCase() === "windows";
      }
    }
    let vendorLabel: string | null = null;
    if (raw.vendor) {
      const v = findByLabel(vendors, (x) => x.label, raw.vendor);
      if (!v) errors.push(`Vendor "${raw.vendor}" not found`);
      else vendorLabel = v.label;
    }
    const numRaw = raw.number_of_licenses?.trim();
    if (numRaw && !/^\d+$/.test(numRaw))
      errors.push("Number of Licenses must be a whole number");
    else if (!isWindows && !numRaw)
      errors.push("Number of Licenses is required");

    const neverExpiresRaw = raw.never_expires?.trim().toLowerCase() ?? "no";
    const neverExpires =
      isWindows || ["yes", "y", "true", "1"].includes(neverExpiresRaw);

    const effective = parseDateCell(raw.effective_date?.trim() ?? "");
    if (effective.error) errors.push(`Effective Date: ${effective.error}`);
    const expiry = parseDateCell(raw.expiry_date?.trim() ?? "");
    if (expiry.error) errors.push(`Expiry Date: ${expiry.error}`);
    if (!isWindows && !neverExpires) {
      if (!expiry.value)
        errors.push(
          "Expiry Date is required unless Never Expire is set to Yes",
        );
      else if (effective.value && expiry.value < effective.value)
        errors.push("Expiry Date cannot be before the Effective Date");
    }

    if (errors.length) return { preview, error: errors.join("; ") };

    const values = {
      license_name: raw.license_name?.trim(),
      license_type: typeCode,
      license_subtype: subtypeLabel,
      vendor: vendorLabel,
      license_key: raw.license_key?.trim() || null,
      number_of_licenses: numRaw ? parseInt(numRaw) : null,
      effective_date: isWindows ? null : effective.value,
      expiry_date: isWindows || neverExpires ? null : expiry.value,
      never_expires: isWindows ? true : neverExpires,
      notes: raw.notes || null,
      attachment: null,
      attachment_name: null,
      registered_by: profile?.id,
    };
    return { preview, values };
  };

  const importLicenseRow = async (values: Record<string, unknown>) => {
    const { error } = await supabase.from("licenses").insert(values);
    return error?.message ?? null;
  };

  // Comprehensive search text: raw fields plus the resolved license
  // type label and the hostname of whichever PC (if any) this license
  // is currently assigned to.
  const licenseSearchValue = (r: License) => {
    const typeLabel = licenseTypeOptions.find(
      (t) => t.code === r.license_type,
    )?.label;
    return [
      r.asset_id,
      typeLabel,
      r.license_type,
      r.license_subtype,
      r.vendor,
      r.license_key,
      r.number_of_licenses,
      r.assigned_pc?.hostname,
      r.notes,
      r.license_name,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const columns: Column<License>[] = [
    {
      key: "asset_id",
      label: "Key",
      sortable: true,
      sortValue: (r) => r.asset_id ?? "",
      render: (r) =>
        r.asset_id ? (
          <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">
            {r.asset_id}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 italic">-</span>
        ),
    },
    {
      key: "license_name",
      label: "Name",
      sortable: true,
      sortValue: (r) => r.license_name ?? "",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {r.license_name ||
              licenseTypeOptions.find((t) => t.code === r.license_type)
                ?.label ||
              r.license_type}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {licenseTypeOptions.find((t) => t.code === r.license_type)?.label ??
              r.license_type}
            {r.license_subtype ? ` — ${r.license_subtype}` : ""}
          </span>
        </div>
      ),
    },
    { key: "vendor", label: "Vendor", render: (r) => r.vendor ?? "-" },
    {
      key: "assigned_pc",
      label: "Assigned",
      render: (r) =>
        r.assigned_pc ? (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
            {r.assigned_pc.hostname}
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Unassigned
          </span>
        ),
    },
    {
      key: "expiry_date",
      label: "Expiry",
      sortable: true,
      sortValue: (r) => r.expiry_date ?? "9999",
      render: (r) => {
        const status = getExpiryStatus(r);
        if (!r.expiry_date)
          return (
            <span className="text-gray-400 dark:text-gray-500">No expiry</span>
          );
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
            className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {canWrite() && (
            <button
              onClick={() => openEdit(r)}
              className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
          )}
          {canWrite() && (
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
            { label: "License Name", value: viewing.license_name },
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
            {
              label: "Assigned PC",
              value: viewing.assigned_pc
                ? `${viewing.assigned_pc.hostname}${viewing.assigned_pc.asset_id ? ` (${viewing.assigned_pc.asset_id})` : ""}`
                : "Not assigned",
            },
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
              label: "Attachment",
              full: true,
              value: viewing.attachment ? (
                <a
                  href={viewing.attachment}
                  download={viewing.attachment_name || "attachment"}
                  className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-500 font-medium"
                >
                  {viewing.attachment.startsWith("data:image/") ? (
                    <FileText size={14} />
                  ) : (
                    <Paperclip size={14} />
                  )}
                  {viewing.attachment_name || "View / Download"}
                </a>
              ) : null,
            },
            {
              label: "Registered",
              value: new Date(viewing.created_at).toLocaleString(),
            },
            {
              label: "Registered By",
              value: viewing.registered_by
                ? (employees.find((u) => u.id === viewing!.registered_by)
                    ?.full_name ?? "Unknown user")
                : null,
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
            <h1 className="text-xl font-bold text-brand-600">Licenses</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {records.length} registered licenses
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </Button>
          {canWrite() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Upload size={16} /> Import
            </Button>
          )}
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
          searchValue={licenseSearchValue}
          searchPlaceholder="Search by asset ID, type, vendor, license key, assigned PC..."
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
            ? viewing.license_name ||
              licenseTypeOptions.find((t) => t.code === viewing.license_type)
                ?.label ||
              viewing.license_type
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
        onDelete={
          viewing && canWrite()
            ? () => {
                const rec = viewing;
                setViewing(null);
                handleDelete(rec);
              }
            : undefined
        }
        deleteLabel="Delete License"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit License" : "Register New License"}
        size="lg"
      >
        <form noValidate onSubmit={handleSave} className="space-y-4">
          {editing?.asset_id && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-brand-600 rounded-xl px-4 py-2.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Asset ID
              </span>
              <span className="font-mono text-sm font-semibold text-brand-700 dark:text-brand-300">
                {editing.asset_id}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="License Name" required>
              <TextInput
                value={form.license_name}
                onChange={(e) =>
                  setForm({ ...form, license_name: e.target.value })
                }
                placeholder="e.g., Adobe Acrobat Pro"
                required
              />
            </Field>
            <Field label="License Type" required>
              <SearchableSelect
                options={licenseTypeOptions.map((t) => ({
                  value: t.code,
                  label: t.label,
                }))}
                value={form.license_type}
                onChange={(val) =>
                  setForm({ ...form, license_type: val, license_subtype: "" })
                }
                placeholder="Select license type"
                searchPlaceholder="Search license types…"
                emptyMessage={
                  licenseTypeOptions.length === 0
                    ? "No license types configured."
                    : "No matching types."
                }
                required
              />
            </Field>
            <Field
              label="License Subtype"
              required
              hint={
                currentSubtypes.length === 0
                  ? "No subtypes configured for this license type — ask an admin to add one"
                  : undefined
              }
            >
              <SearchableSelect
                options={currentSubtypes.map((s) => ({
                  value: s.label,
                  label: s.label,
                }))}
                value={form.license_subtype}
                onChange={(val) => setForm({ ...form, license_subtype: val })}
                placeholder="Select subtype"
                searchPlaceholder="Search subtypes…"
                emptyMessage={
                  currentSubtypes.length === 0
                    ? "No subtypes configured."
                    : "No matching subtypes."
                }
                required
              />
            </Field>
            <Field
              label="Vendor (Company)"
              hint={
                vendors.length === 0
                  ? "No vendors configured yet — add one under Customization > Vendors."
                  : undefined
              }
            >
              <SearchableSelect
                options={vendors.map((v) => ({
                  value: v.label,
                  label: v.label,
                }))}
                value={form.vendor}
                onChange={(val) => setForm({ ...form, vendor: val })}
                placeholder="No vendor"
                searchPlaceholder="Search vendors…"
                emptyMessage={
                  vendors.length === 0
                    ? "No vendors configured."
                    : "No matching vendors."
                }
              />
            </Field>
            <Field
              label="Number of Licenses"
              required={!isWindowsLicense}
              hint={
                isWindowsLicense
                  ? "Not required for a Windows license"
                  : "Numbers only"
              }
            >
              <NumberInput
                min={0}
                value={form.number_of_licenses}
                onChange={(e) =>
                  setForm({ ...form, number_of_licenses: e.target.value })
                }
                placeholder="Total purchased licenses"
                required={!isWindowsLicense}
              />
            </Field>
            {!isWindowsLicense && (
              <Field label="Effective Date">
                <TextInput
                  type="date"
                  value={form.effective_date}
                  onChange={(e) =>
                    setForm({ ...form, effective_date: e.target.value })
                  }
                />
              </Field>
            )}
            {!isWindowsLicense && (
              <Field
                label="Expiry Date"
                required={!form.never_expires}
                hint={
                  form.never_expires
                    ? "This license does not expire"
                    : undefined
                }
              >
                <div className="space-y-1.5">
                  <TextInput
                    type="date"
                    value={form.expiry_date}
                    min={form.effective_date || undefined}
                    onChange={(e) =>
                      setForm({ ...form, expiry_date: e.target.value })
                    }
                    disabled={form.never_expires}
                    required={!form.never_expires}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 select-none">
                    <input
                      type="checkbox"
                      checked={form.never_expires}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          never_expires: e.target.checked,
                          expiry_date: e.target.checked ? "" : form.expiry_date,
                        })
                      }
                      className="rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
                    />
                    Never Expire
                  </label>
                </div>
              </Field>
            )}
          </div>
          {!isWindowsLicense && !form.never_expires && (
            <div className="rounded-xl border border-brand-600 bg-gray-50 dark:bg-gray-900 p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={form.auto_reminder}
                  onChange={(e) =>
                    setForm({ ...form, auto_reminder: e.target.checked })
                  }
                  className="rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
                />
                <BellRing size={15} className="text-brand-600" />
                Remind me before expiry
              </label>
              {form.auto_reminder && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
                  <Field
                    label="Days Before Expiry"
                    required
                    hint="A reminder will appear in Reminders & Notifications on this date"
                  >
                    <NumberInput
                      min={1}
                      value={form.auto_reminder_days}
                      onChange={(e) =>
                        setForm({ ...form, auto_reminder_days: e.target.value })
                      }
                      placeholder="30"
                      required
                    />
                  </Field>
                  <Field
                    label="Alert Email"
                    hint="Optional — sends an email alert too, not just the in-app reminder"
                  >
                    <TextInput
                      type="email"
                      value={form.auto_reminder_email}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          auto_reminder_email: e.target.value,
                        })
                      }
                      placeholder="you@company.com"
                    />
                  </Field>
                </div>
              )}
            </div>
          )}
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
          <FileAttachmentInput
            label="License Certificate / Proof of Purchase"
            value={form.attachment}
            valueName={form.attachment_name}
            onChange={(dataUrl, fileName) =>
              setForm({
                ...form,
                attachment: dataUrl,
                attachment_name: fileName,
              })
            }
            hint="Optional — attach the license certificate, invoice, or proof of purchase"
          />
          <Field label="Notes">
            <TextArea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes..."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
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

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Licenses from Excel / CSV"
        subtitle="Bring in licenses that are already purchased but not yet registered"
        columns={importColumns}
        templateFilename="license_import_template"
        validateRow={validateImportRow}
        importRow={importLicenseRow}
        onImported={loadData}
      />
    </div>
  );
}
