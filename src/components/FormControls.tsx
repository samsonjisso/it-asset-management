'use client';

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { digitsOnlyKeyDown } from '../lib/validation';

interface FieldProps {
  label: string;
  required?: boolean;
  skip?: boolean;
  onSkip?: () => void;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, required, skip, onSkip, error, hint, className, children }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500" aria-label="required">★</span>}
        </label>
        {skip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-brand-600 hover:text-brand-500 font-medium underline underline-offset-2"
          >
            Skip
          </button>
        )}
      </div>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
      {!error && hint && <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`gbb-input w-full px-3.5 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-brand-500 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500 ${props.className ?? ''}`}
    />
  );
}

// A text input that only ever accepts digits — used for rack numbers,
// port numbers, license counts, and any other "numbers only" field.
// Blocks non-digit keystrokes and strips non-digit characters from
// anything pasted in, on top of the native type="number" behavior, so
// the value genuinely can't end up with letters or symbols in it.
export function NumberInput({ onKeyDown, onPaste, className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="number"
      inputMode="numeric"
      onKeyDown={(e) => {
        digitsOnlyKeyDown(e);
        onKeyDown?.(e);
      }}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text');
        if (!/^\d*$/.test(text)) e.preventDefault();
        onPaste?.(e);
      }}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
      className={`gbb-input w-full px-3.5 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-brand-500 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500 ${className ?? ''}`}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`gbb-input w-full px-3.5 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm hover:border-brand-500 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500 ${props.className ?? ''}`}
    >
      {props.children}
    </select>
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`gbb-input w-full px-3.5 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-brand-500 resize-y ${props.className ?? ''}`}
    />
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost' | 'outline' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const variants = {
    primary:
      'bg-brand-600 text-white border border-brand-800 hover:bg-brand-500 hover:border-brand-700 focus-visible:ring-2 focus-visible:ring-brand-300',
    // GBB corporate blue-black (same navy-950/900 used on the login
    // panel and top nav) — for surfaces that should read as "the bank's
    // brand color" rather than the app's Jira-blue accent.
    navy:
      'bg-navy-900 text-white border border-brand-950 hover:bg-navy-800 hover:border-brand-900 focus-visible:ring-2 focus-visible:ring-navy-600',
    secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus-visible:ring-2 focus-visible:ring-gray-300',
    gold:
      'bg-gold-400 text-brand-950 border border-gold-600 hover:bg-gold-300 hover:border-gold-700 font-semibold focus-visible:ring-2 focus-visible:ring-gold-200',
    danger: 'bg-red-600 text-white border border-red-800 hover:bg-red-500 hover:border-red-700 focus-visible:ring-2 focus-visible:ring-red-300',
    ghost: 'text-gray-600 dark:text-gray-300 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700 focus-visible:ring-2 focus-visible:ring-gray-200',
    outline:
      'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-gray-200',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  // Every button — whatever its variant's own accent color — gets the same
  // blue-black bordered shading: a thin navy ring plus a soft blue-black
  // drop shadow beneath, so buttons read as tactile/embossed and stay
  // visually consistent with the GBB brand color, deepening a touch on
  // hover for feedback.
  const blueBlackShading =
    'shadow-[0_0_0_1px_rgba(16,16,48,0.35),0_1px_3px_rgba(16,16,48,0.45)] hover:shadow-[0_0_0_1px_rgba(16,16,48,0.55),0_3px_6px_rgba(16,16,48,0.4)]';
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] ${blueBlackShading} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
