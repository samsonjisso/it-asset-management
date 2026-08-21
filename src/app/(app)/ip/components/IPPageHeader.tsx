import { Download, Network, Plus, Radar } from 'lucide-react';
import { Button } from '../../../../components/FormControls';

type Props = {
  count: number;
  canWrite: boolean;
  onCheck: () => void;
  onExport: () => void;
  onCreate: () => void;
};

export function IPPageHeader({
  count,
  canWrite,
  onCheck,
  onExport,
  onCreate,
}: Props) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
          <Network size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-600">
            IP Address Management
          </h1>
          <p className="text-sm text-gray-500">{count} registered IP addresses</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onCheck}>
          <Radar size={16} /> Check IP Availability
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download size={16} /> Export CSV
        </Button>
        {canWrite && (
          <Button variant="primary" size="sm" onClick={onCreate}>
            <Plus size={16} /> Register IP Address
          </Button>
        )}
      </div>
    </div>
  );
}
