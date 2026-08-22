"use client";
import { DetailsModal, DetailSection } from "../../../../components/DetailsModal";
import { KeyRound } from "lucide-react";
import { License, LicenseType } from "../../../../lib/supabase";
import { ExpiryStatus } from "../types";

interface LicenseDetailsModalProps {
  viewing: License | null;
  onClose: () => void;
  licenseTypeOptions: LicenseType[];
  viewingStatus: ExpiryStatus | null;
  onEdit: (() => void) | undefined;
}

export function LicenseDetailsModal({
  viewing,
  onClose,
  licenseTypeOptions,
  viewingStatus,
  onEdit,
}: LicenseDetailsModalProps) {
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
    <DetailsModal
      open={!!viewing}
      onClose={onClose}
      title={
        viewing
          ? (licenseTypeOptions.find((t) => t.code === viewing.license_type)
              ?.label ?? viewing.license_type)
          : ""
      }
      subtitle={viewing?.license_subtype ?? viewing?.vendor ?? undefined}
      icon={<KeyRound size={22} />}
      sections={viewSections}
      onEdit={onEdit}
      editLabel="Edit License"
    />
  );
}
