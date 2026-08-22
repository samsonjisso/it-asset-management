"use client";

// Pure presentational block: avatar initial + name/email/role summary.
// Receives the already-loaded `profile` object as a prop, no data logic.

import { Mail } from "lucide-react";
import { roleLabels } from "../types";

interface ProfileHeaderProps {
  profile: {
    full_name?: string;
    email?: string;
    role?: string;
  } | null;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#343494] to-[#4e4ec1] text-white flex items-center justify-center text-2xl font-bold">
        {profile?.full_name?.charAt(0).toUpperCase()}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {profile?.full_name}
        </h3>
        <p className="text-sm text-gray-500 flex items-center gap-1">
          <Mail size={14} />
          {profile?.email}
        </p>
        <span className="text-xs px-2 py-1 rounded-full bg-[#343494]/10 text-[#343494] font-medium mt-1 inline-block">
          {roleLabels[profile?.role ?? ""]}
        </span>
      </div>
    </div>
  );
}
