"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { IPAddress } from "../../../../lib/supabase";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../components/Toast";
import { useIPAddresses } from "../hooks/useIPAddresses";
import { useIPForm } from "../hooks/useIPForm";
import { useIPAvailability } from "../hooks/useIPAvailability";
import { IPPageHeader } from "./IPPageHeader";
import { IPStatusSummary } from "./IPStatusSummary";
import { IPDepartmentFilter } from "./IPDepartmentFilter";
import { IPTable } from "./IPTable";
import { IPFormModal } from "./IPFormModal";
import { IPAvailabilityModal } from "./IPAvailabilityModal";
import { IPDetailsModal } from "./IPDetailsModal";
import {
  buildDepartmentCounts,
  filterIPRecords,
  type DepartmentFilterId,
} from "../utils/ipFilters";

import { downloadIpCsv } from "../utils/ipExport";
import { isValidIPv4 } from "../utils/ipValidation";
import type { IPManagementProps } from "../types/ipManagement.types";

export function IPManagementPage({ autoOpenCreate }: IPManagementProps = {}) {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const data = useIPAddresses(profile?.id);
  const form = useIPForm();
  const inlinePing = useIPAvailability();
  const modalPing = useIPAvailability();
  const [viewing, setViewing] = useState<IPAddress | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState<DepartmentFilterId>(null);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const lastAutoOpen = useRef<number | undefined>();

  useEffect(() => {
    if (
      autoOpenCreate !== undefined &&
      autoOpenCreate !== lastAutoOpen.current
    ) {
      lastAutoOpen.current = autoOpenCreate;
      form.openCreate();
    }
  }, [autoOpenCreate, form.openCreate]);

  const departmentCounts = useMemo(
    () => buildDepartmentCounts(data.records, data.departments),
    [data.records, data.departments],
  );

  const filteredRecords = useMemo(
    () => filterIPRecords(data.records, selectedDepartmentId),
    [data.records, selectedDepartmentId],
  );

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.form.ip_address.trim())
      return toast("IP address is required", "error");
    if (!isValidIPv4(form.form.ip_address))
      return toast("Enter a valid IPv4 address", "error");

    form.setSaving(true);
    try {
      if (await data.save(form.form, form.editing)) form.close();
    } finally {
      form.setSaving(false);
    }
  };

  const checkInline = async () => {
    const result = await inlinePing.check(form.form.ip_address);
    form.setCheckState(
      result ? (result.reachable ? "assigned" : "available") : "error",
    );
  };

  return (
    <div className="space-y-4">
      <IPPageHeader
        count={data.records.length}
        canWrite={canWrite()}
        onCheck={() => setAvailabilityOpen(true)}
        onExport={() => downloadIpCsv(data.records)}
        onCreate={form.openCreate}
      />
      <IPStatusSummary records={data.records} />
      <IPDepartmentFilter
        departments={departmentCounts}
        selectedDepartmentId={selectedDepartmentId}
        onSelect={setSelectedDepartmentId}
      />

      {data.loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <IPTable
          records={filteredRecords}
          canWrite={canWrite()}
          canDelete={canWrite() && hasRole("admin")}
          onView={setViewing}
          onEdit={form.openEdit}
          onDelete={data.remove}
        />
      )}

      <IPDetailsModal
        record={viewing}
        canEdit={canWrite()}
        onClose={() => setViewing(null)}
        onEdit={form.openEdit}
      />

      <IPFormModal
        open={form.modalOpen}
        editing={form.editing}
        form={form.form}
        departments={data.departments}
        saving={form.saving}
        checkState={form.checkState}
        onClose={form.close}
        onSave={handleSave}
        onFieldChange={form.updateField}
        onCheck={checkInline}
      />

      <IPAvailabilityModal
        open={availabilityOpen}
        checking={modalPing.checking}
        result={modalPing.result}
        onClose={() => setAvailabilityOpen(false)}
        onCheck={modalPing.check}
        onReset={modalPing.reset}
      />
    </div>
  );
}
