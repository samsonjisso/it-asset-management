import type { IPAddress } from '../../../../lib/supabase';
import { statusOptions } from '../utils/ipConstants';

type Props = {
  records: IPAddress[];
};

export function IPStatusSummary({ records }: Props) {
  const counts = statusOptions.map((status) => ({
    ...status,
    count: records.filter((record) => record.status === status.value).length,
  }));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {counts.map((status) => (
        <div
          key={status.value}
          className="gbb-card-hover bg-white rounded-2xl shadow-card border border-gray-100 p-4"
        >
          <p className="text-xs font-medium text-gray-500">{status.label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{status.count}</p>
        </div>
      ))}
    </div>
  );
}
