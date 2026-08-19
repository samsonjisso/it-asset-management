"use client";

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Layout } from '../../components/Layout';
import { ForcePasswordChangePage } from '../../views/ForcePasswordChangePage';

export default function AppShellLayout({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!session || !profile)) {
      router.replace('/login');
    }
  }, [loading, session, profile, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5fc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Loading Goh Betoch Bank IT Asset Inventory...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return null;
  }

  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5fc] p-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Account Disabled</h2>
          <p className="text-gray-600">Your account has been disabled. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (profile.must_change_password) return <ForcePasswordChangePage />;

  return <Layout>{children}</Layout>;
}
