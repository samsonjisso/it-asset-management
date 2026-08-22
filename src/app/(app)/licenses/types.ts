"use client";
import { License, LicenseType, LicenseSubtype } from "@/lib/supabase";

export interface LicenseRegistrationPageProps {
  autoOpenCreate?: number;
}

export interface ExpiryStatus {
  label: string;
  color: string;
  days: number;
}

export interface LicenseFormData {
  license_type: string;
  license_subtype: string;
  vendor: string;
  license_key: string;
  number_of_licenses: string;
  effective_date: string;
  expiry_date: string;
  notes: string;
}
