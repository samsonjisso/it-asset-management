import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/FormControls";
import { ImportableTable } from "../../types";

interface UploadStepProps {
  tables: ImportableTable[];
  loadingTables: boolean;
  selectedTable: string | null;
  onSelectTable: (table: string) => void;
  fileName: string | null;
  rowCount: number;
  onFile: (file: File) => void;
  onNext: () => void;
  loadingSchema: boolean;
}

export function UploadStep({
  tables,
  loadingTables,
  selectedTable,
  onSelectTable,
  fileName,
  rowCount,
  onFile,
  onNext,
  loadingSchema,
}: UploadStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Import into
        </label>
        <select
          value={selectedTable ?? ""}
          onChange={(e) => onSelectTable(e.target.value)}
          disabled={loadingTables}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#343494]/40 focus:border-[#343494]"
        >
          <option value="" disabled>
            {loadingTables ? "Loading tables..." : "Select a table"}
          </option>
          {tables.map((t) => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          CSV file
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          {fileName ? (
            <>
              <FileText size={32} className="mx-auto text-[#343494] mb-3" />
              <p className="text-sm font-medium text-gray-700">{fileName}</p>
              <p className="text-xs text-gray-500 mb-3">
                {rowCount} data rows detected
              </p>
            </>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-3">
                Any CSV works - you'll map its columns next
              </p>
            </>
          )}
          <label className="inline-flex">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                e.target.value = "";
              }}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#343494] text-white text-sm font-medium cursor-pointer hover:bg-[#4e4ec1] transition-colors">
              <Upload size={16} />{" "}
              {fileName ? "Choose a different file" : "Choose File"}
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!selectedTable || !fileName || loadingSchema}
        >
          {loadingSchema ? "Loading columns..." : "Next: Map Columns"}
        </Button>
      </div>
    </div>
  );
}
