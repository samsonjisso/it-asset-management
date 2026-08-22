"use client";

// "Personal Information" form. All state/mutation logic lives in
// useProfileInfo; this component only renders fields and wires events.

import { User, Phone, Save } from "lucide-react";
import { Field, TextInput, Button } from "@/components/FormControls";
import { useProfileInfo } from "../hooks/useProfileInfo";
import { ProfileHeader } from "./ProfileHeader";
import { roleLabels } from "../types";

export function PersonalInfoForm() {
  const {
    profile,
    fullName,
    setFullName,
    phone,
    setPhone,
    savingInfo,
    handleUpdateInfo,
  } = useProfileInfo();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <ProfileHeader profile={profile} />

      <form onSubmit={handleUpdateInfo} className="space-y-4">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
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
          <Field label="Email (read only)">
            <TextInput
              value={profile?.email ?? ""}
              disabled
              className="bg-gray-50"
            />
          </Field>
          <Field label="Phone Number">
            <div className="relative">
              <Phone
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <TextInput
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="pl-10"
              />
            </div>
          </Field>
          <Field label="Role (read only)">
            <TextInput
              value={roleLabels[profile?.role ?? ""]}
              disabled
              className="bg-gray-50"
            />
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
  );
}
