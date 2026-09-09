"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoginPage } from "@/pages/LoginPage";

export default function Page() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session && profile) {
      router.replace("/dashboard");
    }
  }, [loading, session, profile, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gbb-mesh-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Loading Goh Betoch Bank Asset Inventory Management Portal...
          </p>
        </div>
      </div>
    );
  }

  return <LoginPage />;
}
