'use client';

import { useRef, useState } from 'react';
import { Paperclip, X, Loader2, UploadCloud, Download } from 'lucide-react';
import { FileFieldValue } from '../lib/deviceFieldValues';

interface FileInputProps {
  value: FileFieldValue | null;
  onChange: (value: FileFieldValue | null) => void;
  hint?: string;
}

const MAX_BYTES = 4 * 1024 * 1024; // 4MB — comfortably under the JSON body limit

// A generic "File Upload" custom-field control: pick any file, it's
// read as a base64 data URL client-side (same no-separate-endpoint
// approach as ImageInput) and handed back as { name, dataUrl } so the
// original filename survives for display and download.
export function FileInput({ value, onChange, hint }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('File is too large (max 4MB)');
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setLoading(false);
      onChange({ name: file.name, dataUrl: String(reader.result) });
    };
    reader.onerror = () => {
      setLoading(false);
      setError('Could not read that file');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {value ? (
        <div className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl border border-brand-600 bg-gray-50 dark:bg-gray-900 text-sm">
          <Paperclip size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
          <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{value.name}</span>
          <a
            href={value.dataUrl}
            download={value.name}
            className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg"
            title="Download"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={14} />
          </a>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
            title="Remove"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-brand-300 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-brand-500 text-sm text-gray-500 dark:text-gray-400 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          {loading ? 'Uploading...' : 'Choose file to upload'}
        </button>
      )}
      {hint && !error && <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
