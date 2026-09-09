"use client";

import { useRef, useState } from "react";
import {
  FileText,
  X,
  Loader2,
  UploadCloud,
  FileImage,
  Download,
} from "lucide-react";

interface FileAttachmentInputProps {
  value: string | null | undefined; // base64 data URL
  valueName: string | null | undefined; // original filename, shown alongside the value
  onChange: (dataUrl: string | null, fileName: string | null) => void;
  label?: string;
  hint?: string;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB raw file (~6.7MB base64) - comfortably under the 8MB JSON body limit
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPT_ATTR = "image/*,.pdf,.doc,.docx";

function isImageDataUrl(dataUrl: string | null | undefined) {
  return !!dataUrl && dataUrl.startsWith("data:image/");
}

// A file picker for attaching a supporting document (e.g. a license
// certificate or proof-of-purchase) to a record. Accepts images and
// PDF/Word documents, shows an image preview or a generic file card
// with the original filename, and hands the parent a base64 data URL
// plus the filename to store directly on the record (same
// no-separate-upload-endpoint pattern as ImageInput).
export function FileAttachmentInput({
  value,
  valueName,
  onChange,
  label = "Attachment",
  hint,
}: FileAttachmentInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File | undefined) => {
    setError("");
    if (!file) return;
    const typeOk =
      ACCEPTED_TYPES.includes(file.type) || /\.(pdf|docx?)$/i.test(file.name);
    if (!typeOk) {
      setError("Please choose an image, PDF, or Word document");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is too large (max 5MB)");
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setLoading(false);
      onChange(String(reader.result), file.name);
    };
    reader.onerror = () => {
      setLoading(false);
      setError("Could not read that file");
    };
    reader.readAsDataURL(file);
  };

  const isImage = isImageDataUrl(value);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div
        onClick={() => !value && inputRef.current?.click()}
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
        role={value ? undefined : "button"}
        tabIndex={value ? undefined : 0}
        onKeyDown={(e) => {
          if (!value && (e.key === "Enter" || e.key === " "))
            inputRef.current?.click();
        }}
        className={`relative w-full rounded-2xl border-2 border-dashed transition-colors ${
          dragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/40"
            : value
              ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 hover:border-brand-400 hover:bg-brand-50/40 cursor-pointer"
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-8 text-gray-400 dark:text-gray-500">
            <Loader2 size={26} className="animate-spin" />
            <span className="text-sm font-medium">Uploading...</span>
          </div>
        ) : value ? (
          <div className="flex items-center gap-3 p-3">
            {isImage ? (
              <img
                src={value}
                alt=""
                className="w-16 h-16 rounded-xl object-cover border border-brand-600 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center shrink-0">
                <FileText size={26} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {valueName || "Attached file"}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <a
                  href={value}
                  download={valueName || "attachment"}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-500"
                >
                  <Download size={12} /> View / Download
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null, null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
                >
                  <X size={12} /> Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
              <UploadCloud size={22} />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <FileImage size={12} /> Image or PDF/Word document, up to 5MB
            </p>
          </div>
        )}
      </div>
      {hint && !error && (
        <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
