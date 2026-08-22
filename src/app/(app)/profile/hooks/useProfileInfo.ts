"use client";

// Data-mutation logic for the "Personal Information" form.
// Isolated from UI so ProfilePage/PersonalInfoForm stay presentational
// and this logic is independently testable/reusable.

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";

export function useProfileInfo() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile!.id);
    setSavingInfo(false);
    if (error) toast(error.message, "error");
    else {
      toast("Profile updated successfully", "success");
      refreshProfile();
    }
  };

  return {
    profile,
    fullName,
    setFullName,
    phone,
    setPhone,
    savingInfo,
    handleUpdateInfo,
  };
}
