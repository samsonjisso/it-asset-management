import { DatabaseBackup } from 'lucide-react';

export function BackupPageHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center">
        <DatabaseBackup size={22} />
      </div>
      <div>
        <h1 className="text-xl font-bold text-[#343494]">Backup & Restore</h1>
        <p className="text-sm text-gray-500">Export and import system data for safekeeping</p>
      </div>
    </div>
  );
}
