import { Download } from 'lucide-react';
import { Button } from '@/components/FormControls';

interface FullBackupCardProps {
  exporting: boolean;
  onExport: () => void;
}

export function FullBackupCard({ exporting, onExport }: FullBackupCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#343494] to-[#4e4ec1] rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
          <Download size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Full System Backup</h3>
          <p className="text-white/80 text-sm mt-1">
            Download a complete backup of all IT asset data (PCs, Assets, IP Addresses,
            Licenses, Devices, Servers, Reminders, Departments) as a single CSV file.
          </p>
          <Button variant="gold" size="md" className="mt-4" onClick={onExport} disabled={exporting}>
            {exporting ? 'Exporting...' : <><Download size={16} /> Download Full Backup</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
