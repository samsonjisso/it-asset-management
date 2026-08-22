"use client";
import { useMemo } from "react";
import { DataTable } from "../../../../components/DataTable";
import { License, UserRole } from "../../../../lib/supabase";
import { ExpiryStatus } from "../types";
import { getLicenseColumns } from "./LicenseTableColumns";

interface LicenseTableProps {
  records: License[];
  licenseTypeOptions: { code: string; label: string }[];
  getExpiryStatus: (rec: License) => ExpiryStatus | null;
  onView: (rec: License) => void;
  onEdit: (rec: License) => void;
  onDelete: (rec: License) => void;
  canWrite: () => boolean;
  hasRole: (...role: UserRole[]) => boolean;
}

export function LicenseTable(props: LicenseTableProps) {
  const columns = useMemo(() => getLicenseColumns(props), [props]);
  return (
    <DataTable
      columns={columns}
      data={props.records}
      searchKeys={["license_subtype", "vendor", "license_key"]}
      searchPlaceholder="Search by subtype, vendor, key..."
      dateFilterKey="created_at"
      emptyMessage="No licenses registered yet"
      onRowClick={props.onView}
    />
  );
}
