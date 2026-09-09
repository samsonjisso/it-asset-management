"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "md",
}: ModalProps) {
  if (!open) return null;

  const sizeClass = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 gbb-fade-in">
      <div
        className={`bg-white/95 dark:bg-gray-900/95 rounded-2xl border border-brand-600/60 dark:border-brand-400/40 shadow-[0_0_24px_rgba(34,211,238,0.28),0_20px_60px_rgba(0,0,0,0.22)] ring-1 ring-cyan-200/30 dark:ring-cyan-400/20 w-full ${sizeClass} max-h-[90vh] flex flex-col gbb-pop-in overflow-hidden`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}
