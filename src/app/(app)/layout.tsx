'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/Layout';
import { ForcePasswordChangePage } from '@/pages/ForcePasswordChangePage';

export default function AppShellLayout({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const activePage = (pathname || '/dashboard').replace(/^\//, '') || 'dashboard';

  useEffect(() => {
    if (!loading && (!session || !profile)) {
      router.replace('/login');
    }
  }, [loading, session, profile, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gbb-mesh-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading Goh Betoch Bank Asset Inventory Management Portal...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    // useEffect above is already redirecting to /login; render nothing
    // in the meantime rather than flashing protected content.
    return null;
  }

  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center gbb-mesh-bg p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lift border border-brand-600 p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Account Disabled</h2>
          <p className="text-gray-600 dark:text-gray-300">Your account has been disabled. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (profile.must_change_password) {
    return <ForcePasswordChangePage />;
  }

  return (
    <Layout
      activePage={activePage}
      onNavigate={(page: string) => router.push(`/${page}`)}
      onCreate={(page: string) => router.push(`/${page}?create=${Date.now()}`)}
    >
      {children}
    </Layout>
  );
}
