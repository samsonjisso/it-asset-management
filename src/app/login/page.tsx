"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from '../../views/LoginPage';

export default function Login() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session && profile) {
      router.replace('/dashboard');
    }
  }, [loading, session, profile, router]);

  if (loading) {
    return (
      <div className="gbb-login-shell min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" />
          <p className="text-sm text-white/80">Loading Goh Betoch Bank IT Asset Inventory...</p>
        </div>
      </div>
    );
  }

  if (session && profile) {
    return null;
  }

  return <LoginPage />;
}
