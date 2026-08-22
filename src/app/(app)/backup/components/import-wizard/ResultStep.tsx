import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/FormControls";
import { ImportRunResult } from "../../types";

interface ResultStepProps {
  result: ImportRunResult;
  onReset: () => void;
}

export function ResultStep({ result, onReset }: ResultStepProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-gray-800">
            {result.totalRows}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total rows</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-green-700">
            {result.imported}
          </p>
          <p className="text-xs text-green-700/80 mt-1">Imported</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-red-700">
            {result.skipped}
          </p>
          <p className="text-xs text-red-700/80 mt-1">Skipped</p>
        </div>
      </div>

      {result.errors.length === 0 ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          <CheckCircle2 size={16} />
          <span>Every row imported cleanly.</span>
        </div>
      ) : (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Skipped rows
            {result.truncatedErrors
              ? ` (first ${result.errors.length} shown)`
              : ""}
          </h4>
          <div className="border border-gray-200 rounded-xl overflow-auto max-h-72 divide-y divide-gray-100">
            {result.errors.map((e) => (
              <div
                key={e.row}
                className="flex items-start gap-2 px-4 py-2.5 text-sm"
              >
                <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <span className="text-gray-500 shrink-0">Row {e.row}:</span>
                <span className="text-red-600">{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw size={14} /> Import another file
        </Button>
      </div>
    </div>
  );
}
