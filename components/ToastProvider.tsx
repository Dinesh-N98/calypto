"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Toast = {
  id: number;
  message: string;
  isExiting: boolean;
};

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const EXIT_DURATION = 250;
const DISPLAY_DURATION = 3000;

type ToastTimer = ReturnType<typeof setTimeout>;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<ToastTimer[]>([]);

  useEffect(() => {
    const activeTimers = timers.current;

    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const showToast = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, isExiting: false }]);

    const exitTimer = setTimeout(() => {
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, isExiting: true } : toast)),
      );

      const removeTimer = setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, EXIT_DURATION);
      timers.current.push(removeTimer);
    }, DISPLAY_DURATION);

    timers.current.push(exitTimer);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[60] flex max-w-[calc(100vw-2rem)] flex-col gap-3 max-sm:bottom-4 max-sm:left-1/2 max-sm:right-auto max-sm:w-[calc(100%-2rem)] max-sm:-translate-x-1/2"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            className={`flex items-center gap-3 bg-[#4a7a1e] px-4 py-3 text-paper shadow-lg transition-all duration-250 ${toast.isExiting ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}`}
            key={toast.id}
          >
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
