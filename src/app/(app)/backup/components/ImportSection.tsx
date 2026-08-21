import { Upload } from 'lucide-react';

interface ImportSectionProps {
  importing: boolean;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImportSection({ importing, onImport }: ImportSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-[#343494] mb-4 flex items-center gap-2">
        <Upload size={20} /> Import Data
      </h3>
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
        <Upload size={32} className="mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 mb-3">Select a CSV backup file to import data</p>
        <label className="inline-flex">
          <input
            type="file"
            accept=".csv"
            onChange={onImport}
            className="hidden"
            disabled={importing}
          />
          <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#343494] text-white text-sm font-medium cursor-pointer hover:bg-[#4e4ec1] transition-colors">
            {importing ? 'Importing...' : <><Upload size={16} /> Choose File</>}
          </span>
        </label>
      </div>
    </div>
  );
}
