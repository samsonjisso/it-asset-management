import { AlertTriangle, CheckCircle } from 'lucide-react';

const RECOMMENDATIONS = [
  'Perform regular backups (weekly recommended)',
  'Store backups on a separate secure location',
  'Always backup before major system changes',
  'Verify backup integrity by testing imports',
];

export function BackupRecommendations() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-800 text-sm">Backup Recommendations</h4>
          <ul className="text-xs text-amber-700 mt-1 space-y-1">
            {RECOMMENDATIONS.map((item) => (
              <li key={item} className="flex items-center gap-1">
                <CheckCircle size={12} /> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
