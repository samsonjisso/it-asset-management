"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import {
  Field,
  TextInput,
  SelectInput,
  Button,
} from "../components/FormControls";
import { isValidPhone, isValidEmail } from "../lib/validation";
import { User, Lock, Mail, Phone, Save, KeyRound } from "lucide-react";

const roleOptions: { value: string; label: string }[] = [
  { value: "admin", label: "Administrator" },
  { value: "editor", label: "Editor" },
  { value: "reader", label: "Reader (Read Only)" },
  { value: "audit", label: "Audit (Read Only)" },
];

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  const [, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateInfo = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast("Full Name is required", "error");
      return;
    }
    if (phone.trim() && !isValidPhone(phone)) {
      toast("Please enter a valid phone number", "error");
      return;
    }
    if (isAdmin && !isValidEmail(email)) {
      toast("Please enter a valid email address", "error");
      return;
    }
    setSavingInfo(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        // Only admins are permitted to change their own email address
        // (see server/routes/profiles.js) — for anyone else this key
        // is simply ignored server-side, so it's left out here.
        ...(isAdmin ? { email: email.trim() } : {}),
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

  const handleChangePassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPassword) {
      toast("New password is required", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("New passwords do not match", "error");
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

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    editor: "Editor",
    reader: "Reader (Read Only)",
    audit: "Audit (Read Only)",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
          <User size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-600">My Profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update your information and change password
          </p>
        </div>
      </div>

      {/* Profile info card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-6">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center text-2xl font-bold">
            {profile?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {profile?.full_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Mail size={14} />
              {profile?.email}
            </p>
            <span className="text-xs px-2 py-1 rounded-full bg-brand-600/10 text-brand-600 font-medium mt-1 inline-block">
              {roleLabels[profile?.role ?? ""]}
            </span>
          </div>
        </div>

        <form noValidate onSubmit={handleUpdateInfo} className="space-y-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <User size={18} /> Personal Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <TextInput
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </Field>
            <Field
              label="Email"
              required={isAdmin}
              hint={
                isAdmin
                  ? undefined
                  : "Contact an administrator to change your email address."
              }
            >
              {isAdmin ? (
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              ) : (
                <TextInput
                  value={profile?.email ?? ""}
                  disabled
                  className="bg-gray-50 dark:bg-gray-900"
                />
              )}
            </Field>
            <Field label="Phone Number">
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                />
                <TextInput
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="pl-10"
                />
              </div>
            </Field>
            <Field
              label="Role"
              hint={
                isAdmin
                  ? "Admins can't change their own role — ask another admin if this needs updating."
                  : "Set by an administrator."
              }
            >
              {isAdmin ? (
                <SelectInput value={profile?.role ?? "admin"} disabled>
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </SelectInput>
              ) : (
                <TextInput
                  value={roleLabels[profile?.role ?? ""]}
                  disabled
                  className="bg-gray-50 dark:bg-gray-900"
                />
              )}
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={savingInfo}>
              {savingInfo ? (
                "Saving..."
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Password change card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-6">
        <form noValidate onSubmit={handleChangePassword} className="space-y-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <KeyRound size={18} /> Change Password
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            At least 8 characters, with upper/lowercase letters, a number, and a
            symbol. It can't be the same as your current password.
          </p>
          <Field label="New Password" required>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <TextInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="pl-10"
                required
                minLength={8}
              />
            </div>
          </Field>
          <Field label="Confirm New Password" required>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pl-10"
                required
                minLength={8}
              />
            </div>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={savingPassword}>
              {savingPassword ? (
                "Changing..."
              ) : (
                <>
                  <KeyRound size={16} /> Change Password
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
