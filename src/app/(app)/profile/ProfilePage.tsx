"use client";

// Page-composition component: lays out the page header and the two
// cards. No data-fetching or mutation logic here — that's delegated
// to PersonalInfoForm / PasswordChangeForm and their hooks.

import { User } from "lucide-react";
import { PersonalInfoForm } from "./components/PersonalInfoForm";
import { PasswordChangeForm } from "./components/PasswordChangeForm";

export function ProfilePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center">
          <User size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#343494]">My Profile</h1>
          <p className="text-sm text-gray-500">
            Update your information and change password
          </p>
        </div>
      </div>

      <PersonalInfoForm />
      <PasswordChangeForm />
    </div>
  );
}
