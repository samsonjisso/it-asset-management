"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
  required?: boolean;
  skip?: boolean;
  onSkip?: () => void;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, required, skip, onSkip, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {skip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-[#343494] hover:text-[#4e4ec1] font-medium underline"
          >
            Skip
          </button>
        )}
      </div>
      {children}
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`gbb-input w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm transition-all placeholder:text-gray-400 ${props.className ?? ''}`}
    />
  );
}

export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <TextInput {...props} type="number" />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`gbb-input w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm transition-all ${props.className ?? ''}`}
    >
      {props.children}
    </select>
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`gbb-input w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm transition-all placeholder:text-gray-400 resize-y ${props.className ?? ''}`}
    />
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const variants = {
    primary: 'bg-[#343494] text-white hover:bg-[#4e4ec1] shadow-sm',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    gold: 'bg-[#ffc800] text-white hover:bg-[#ffd53d] shadow-sm font-semibold',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    ghost: 'text-gray-600 hover:bg-gray-100',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`gbb-button disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
