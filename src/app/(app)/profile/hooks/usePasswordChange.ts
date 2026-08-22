"use client";

// Data-mutation logic for the "Change Password" form.
// Same validation rules and Supabase call as the original component,
// just moved out of the UI layer.

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";

export function usePasswordChange() {
  const { toast } = useToast();

  const [, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast(error.message, "error");
    else {
      toast("Password changed successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return {
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    savingPassword,
    handleChangePassword,
  };
}
