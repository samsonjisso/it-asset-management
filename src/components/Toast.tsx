'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  // Bumped every time an already-visible toast is re-triggered, purely so
  // its key changes and the entrance animation replays — a visible cue
  // that the repeated click registered, without duplicating the box or
  // showing a growing counter.
  bounce: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // One auto-dismiss timer per toast id, so re-triggering a still-visible
  // toast can restart its countdown instead of it disappearing early.
  const timeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const existing = timeoutsRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    // Same type+message = the same underlying validation error, so it gets
    // a stable id. Repeating the same action (e.g. clicking "Sign in" with
    // bad credentials several times) reuses/updates that one error box
    // instead of piling up duplicates.
    const id = `${type}:${message}`;

    setToasts((prev) => {
      const existingIndex = prev.findIndex((t) => t.id === id);
      if (existingIndex === -1) {
        return [...prev, { id, type, message, bounce: 0 }];
      }
      const next = [...prev];
      const existing = next[existingIndex];
      next[existingIndex] = { ...existing, bounce: existing.bounce + 1 };
      return next;
    });

    const existingTimeout = timeoutsRef.current.get(id);
    if (existingTimeout) clearTimeout(existingTimeout);
    timeoutsRef.current.set(id, setTimeout(() => remove(id), AUTO_DISMISS_MS));
  }, [remove]);

  const icons = {
    success: <CheckCircle size={20} className="text-green-600" />,
    error: <XCircle size={20} className="text-red-600" />,
    warning: <AlertCircle size={20} className="text-amber-600" />,
    info: <Info size={20} className="text-brand-600" />,
  };

  const borders = {
    success: 'border-l-green-600',
    error: 'border-l-red-600',
    warning: 'border-l-amber-600',
    info: 'border-l-blue-600',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col-reverse gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            // Re-keying on `bounce` remounts just this box when the same
            // message repeats, replaying the slide-in animation as visible
            // feedback that the click registered — without adding a
            // second, stacked copy of the same message.
            key={`${t.id}:${t.bounce}`}
            className={`gbb-slide-in flex items-start gap-3 bg-white dark:bg-gray-900 rounded shadow-lift ring-1 ring-black/5 border-l-4 ${borders[t.type]} px-4 py-3.5`}
          >
            {icons[t.type]}
            <p className="text-sm text-gray-800 dark:text-gray-100 flex-1 leading-snug">
              {t.message}
            </p>
            <button onClick={() => remove(t.id)} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
