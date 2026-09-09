"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2, Pencil, UploadCloud } from "lucide-react";

interface ImageInputProps {
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  hint?: string;
  size?: number;
  // 'compact' (default): small square picker button, used across most
  // registration forms. 'large': a big, clearly-labeled drag-and-drop
  // dropzone with a large preview - used where the photo deserves more
  // visual prominence (e.g. PC Registration).
  variant?: "compact" | "large";
}

const MAX_BYTES = 3 * 1024 * 1024; // 3MB, comfortably under the 8MB JSON body limit

// A photo picker: click (or drag-and-drop, in the 'large' variant) to
// choose a file, shows a live preview, and hands the parent a base64
// data URL it can store directly on the record (no separate upload
// endpoint needed). Used to attach an identifying photo to a
// PC/device/server registration, and to attach a reference photo to a
// Customization > Asset Model.
export function ImageInput({
  value,
  onChange,
  label = "Photo",
  hint,
  size = 96,
  variant = "compact",
}: ImageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large (max 3MB)");
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
      setError("Could not read that image");
    };
    reader.readAsDataURL(file);
  };

  if (variant === "large") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className={`group relative w-full min-h-[220px] rounded-2xl border-2 border-dashed cursor-pointer flex items-center justify-center overflow-hidden transition-colors ${
            dragActive
              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/40"
              : value
                ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                : "border-brand-300 bg-gray-50 dark:bg-gray-900 hover:border-brand-500 hover:bg-brand-50/40"
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400 dark:text-gray-500">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </div>
          ) : value ? (
            <>
              <img
                src={value}
                alt=""
                className="w-full h-full max-h-72 object-contain bg-white dark:bg-gray-900"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm font-medium shadow-soft">
                  <Pencil size={14} /> Change photo
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 text-red-600 text-sm font-medium shadow-soft"
                >
                  <X size={14} /> Remove
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
                <UploadCloud size={26} />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Click to upload or drag and drop a photo
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                PNG or JPG, up to 3MB
              </p>
            </div>
          )}
        </div>
        {hint && !error && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {hint}
          </span>
        )}
        {error && <span className="text-xs text-red-500">{error}</span>}
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

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{ width: size, height: size }}
          className="relative shrink-0 rounded-xl border border-dashed border-brand-300 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-brand-500 flex items-center justify-center overflow-hidden transition-colors"
        >
          {loading ? (
            <Loader2
              size={20}
              className="animate-spin text-gray-400 dark:text-gray-500"
            />
          ) : value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus size={22} className="text-gray-400 dark:text-gray-500" />
          )}
        </button>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-brand-600 hover:text-brand-500 text-left"
          >
            {value ? "Change photo" : "Upload photo"}
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
          {hint && !error && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {hint}
            </span>
          )}
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
