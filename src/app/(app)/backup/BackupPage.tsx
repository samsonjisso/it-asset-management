"use client";

import { useAuth } from "@/context/AuthContext";
import { BackupPageHeader } from "./components/BackupPageHeader";
import { FullBackupCard } from "./components/FullBackupCard";
import { TableExportGrid } from "./components/TableExportGrid";
import { ImportWizard } from "./components/import-wizard/ImportWizard";
import { BackupRecommendations } from "./components/BackupRecommendations";

function AuthLoading() {
  return (
    <div className="max-w-4xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm text-gray-600">Checking your session...</p>
    </div>
  );
}

function NotAuthenticated() {
  return (
    <div className="max-w-4xl rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="font-semibold text-amber-900">Authentication required</h2>
      <p className="mt-1 text-sm text-amber-800">
        Your session is no longer available. Please sign in again.
      </p>
    </div>
  );
}

export function BackupPage() {
  const { session, profile, loading, canWrite } = useAuth();

  if (loading) return <AuthLoading />;
  if (!session) return <NotAuthenticated />;

  const writable = canWrite();

  if (!profile) {
    return (
      <div className="max-w-4xl rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-900">Profile unavailable</h2>
        <p className="mt-1 text-sm text-red-800">
          You are signed in, but your user profile could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <BackupPageHeader />
      <FullBackupCard />
      <TableExportGrid />
      <ImportWizard canWrite={writable} />
      <BackupRecommendations />
    </div>
  );
}
