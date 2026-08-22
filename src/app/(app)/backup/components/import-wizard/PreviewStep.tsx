import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/FormControls';
import { ImportColumn, ImportPreviewResult } from '../../types';

interface PreviewStepProps {
  result: ImportPreviewResult;
  displayColumns: ImportColumn[];
  onBack: () => void;
  onConfirm: () => void;
  importing: boolean;
}

export function PreviewStep({
  result,
  displayColumns,
  onBack,
  onConfirm,
  importing,
}: PreviewStepProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-gray-800">{result.totalRows}</p>
          <p className="text-xs text-gray-500 mt-1">Total rows</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-green-700">{result.validRows}</p>
          <p className="text-xs text-green-700/80 mt-1">Ready to import</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-red-700">{result.invalidRows}</p>
          <p className="text-xs text-red-700/80 mt-1">Have errors</p>
        </div>
      </div>

      {result.missingRequiredColumns.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            No column is mapped to these required fields, so every row will fail:{' '}
            {result.missingRequiredColumns.join(', ')}
          </span>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Preview ({Math.min(result.sample.length, result.totalRows)} of {result.totalRows} rows)
        </h4>
        <div className="border border-gray-200 rounded-xl overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-gray-500 w-10">#</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500 w-10"> </th>
                {displayColumns.map((c) => (
                  <th key={c.name} className="text-left px-3 py-2 font-semibold text-gray-500">
                    {c.label}
                  </th>
                ))}
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.sample.map((row) => (
                <tr key={row.rowNumber} className={row.errors.length ? 'bg-red-50/50' : ''}>
                  <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                  <td className="px-3 py-2">
                    {row.errors.length ? (
                      <XCircle size={16} className="text-red-500" />
                    ) : (
                      <CheckCircle2 size={16} className="text-green-500" />
                    )}
                  </td>
                  {displayColumns.map((c) => (
                    <td key={c.name} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {row.data[c.name] ?? ''}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-red-600 text-xs max-w-xs">
                    {row.errors.join('; ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          {result.invalidRows > 0 && (
            <span className="text-xs text-gray-500">
              Rows with errors will be skipped automatically
            </span>
          )}
          <Button onClick={onConfirm} disabled={importing || result.validRows === 0}>
            {importing ? 'Importing...' : `Import ${result.validRows} rows`}
          </Button>
        </div>
      </div>
    </div>
  );
}
