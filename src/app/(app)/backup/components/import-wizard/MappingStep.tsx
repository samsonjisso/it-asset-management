import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/FormControls';
import { ColumnMapping, ImportColumn } from '../../types';

interface MappingStepProps {
  headers: string[];
  sampleRow: Record<string, string> | undefined;
  columns: ImportColumn[];
  mapping: ColumnMapping;
  onChange: (header: string, target: string | null) => void;
  onBack: () => void;
  onNext: () => void;
  previewing: boolean;
}

export function MappingStep({
  headers,
  sampleRow,
  columns,
  mapping,
  onChange,
  onBack,
  onNext,
  previewing,
}: MappingStepProps) {
  const mappedTargets = new Set(Object.values(mapping).filter(Boolean) as string[]);
  const unmappedRequired = columns.filter((c) => c.required && !mappedTargets.has(c.name));

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Match each column from your file to a field in the table. Columns you leave set to
        "Don't import" are skipped.
      </p>

      {unmappedRequired.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Required and not yet mapped: {unmappedRequired.map((c) => c.label).join(', ')}
          </span>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-3 gap-3 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Header Field</span>
          <span>Import Field</span>
          <span>Sample Value</span>
        </div>
        <div className="divide-y divide-gray-100">
          {headers.map((header) => {
            const target = mapping[header] ?? null;
            return (
              <div key={header} className="grid grid-cols-3 gap-3 px-4 py-3 items-center">
                <span className="text-sm font-medium text-gray-700 truncate">{header}</span>
                <select
                  value={target ?? ''}
                  onChange={(e) => onChange(header, e.target.value || null)}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#343494]/40 focus:border-[#343494]"
                >
                  <option value="">Don't import</option>
                  {columns.map((c) => (
                    <option
                      key={c.name}
                      value={c.name}
                      disabled={mappedTargets.has(c.name) && target !== c.name}
                    >
                      {c.label}
                      {c.required ? ' *' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500 truncate">
                  {sampleRow?.[header] || <span className="text-gray-300">—</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={previewing}>
          {previewing ? 'Validating...' : 'Next: Preview'}
        </Button>
      </div>
    </div>
  );
}
