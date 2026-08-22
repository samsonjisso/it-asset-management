"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, License, LicenseType, LicenseSubtype } from "../../../../lib/supabase";
import { useToast } from "../../../../components/Toast";
import { ExpiryStatus } from "../types";

export function useLicenseData() {
  const { toast } = useToast();
  const [records, setRecords] = useState<License[]>([]);
  const [licenseTypeOptions, setLicenseTypeOptions] = useState<LicenseType[]>([]);
  const [licenseSubtypes, setLicenseSubtypes] = useState<LicenseSubtype[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [licRes, typesRes, subtypesRes] = await Promise.all([
      supabase.from("licenses").select("*").order("created_at", { ascending: false }),
      supabase.from("license_types").select("*").order("label"),
      supabase.from("license_subtypes").select("*").order("label"),
    ]);
    if (licRes.data) setRecords(licRes.data as License[]);
    if (typesRes.data) setLicenseTypeOptions(typesRes.data as LicenseType[]);
    if (subtypesRes.data) setLicenseSubtypes(subtypesRes.data as LicenseSubtype[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(async (rec: License) => {
    if (!confirm(`Delete license "${rec.license_subtype ?? rec.license_type}"?`)) return;
    const { error } = await supabase.from("licenses").delete().eq("id", rec.id);
    if (error) toast(error.message, "error");
    else {
      toast("License deleted", "success");
      loadData();
    }
  }, [toast, loadData]);

  const getExpiryStatus = useCallback((rec: License): ExpiryStatus | null => {
    if (!rec.expiry_date) return null;
    const days = Math.ceil(
      (new Date(rec.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0)
      return { label: "Expired", color: "text-red-600 bg-red-50", days };
    if (days <= 30)
      return { label: `Expires in ${days}d`, color: "text-amber-600 bg-amber-50", days };
    if (days <= 60)
      return { label: `Expires in ${days}d`, color: "text-blue-600 bg-blue-50", days };
    return { label: "Active", color: "text-green-600 bg-green-50", days };
  }, []);

  const exportCSV = useCallback(() => {
    const headers = [
      "Asset ID", "License Type", "Subtype", "Vendor", "License Key",
      "Number of Licenses", "Effective Date", "Expiry Date", "Status", "Created At",
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
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `licenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [records, getExpiryStatus]);

  return {
    records,
    licenseTypeOptions,
    licenseSubtypes,
    loading,
    loadData,
    handleDelete,
    getExpiryStatus,
    exportCSV,
  };
}
