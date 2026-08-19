import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';

interface ImageInputProps {
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  hint?: string;
  size?: number;
}

const MAX_BYTES = 3 * 1024 * 1024; // 3MB, comfortably under the 8MB JSON body limit

// A square photo picker: click to choose a file, shows a live preview,
// and hands the parent a base64 data URL it can store directly on the
// record (no separate upload endpoint needed). Used to attach an
// identifying photo to a PC/device/server registration, and to attach
// a reference photo to a Customization > Asset Model.
export function ImageInput({ value, onChange, label = 'Photo', hint, size = 96 }: ImageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image is too large (max 3MB)');
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setLoading(false);
      onChange(String(reader.result));
    };
    reader.onerror = () => {
      setLoading(false);
      setError('Could not read that image');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{ width: size, height: size }}
          className="relative shrink-0 rounded-xl border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 flex items-center justify-center overflow-hidden transition-colors"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin text-gray-400" />
          ) : value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus size={22} className="text-gray-400" />
          )}
        </button>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-brand-600 hover:text-brand-500 text-left"
          >
            {value ? 'Change photo' : 'Upload photo'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs font-medium text-red-500 hover:text-red-600 text-left inline-flex items-center gap-1"
            >
              <X size={12} /> Remove
            </button>
          )}
          {hint && !error && <span className="text-xs text-gray-400">{hint}</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
