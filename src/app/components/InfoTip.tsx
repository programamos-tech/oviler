"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Icono (i) con texto explicativo. Se abre y cierra con clic/tap (iPad y móvil);
 * clic fuera o Escape cierra. Así no dependemos de :hover ni del foco táctil inconsistente.
 */
export function InfoTip({ children, ariaLabel = "Más información" }: { children: ReactNode; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const target = e.target;
      if (target instanceof Node && !el.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("touchstart", closeIfOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("touchstart", closeIfOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const onButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  }, []);

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-500 dark:hover:text-slate-300"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={tooltipId}
        onClick={onButtonClick}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute left-0 top-full z-50 mt-1.5 w-[min(calc(100vw-2rem),18rem)] rounded-lg bg-slate-800 px-3 py-2 text-left text-[11px] font-medium leading-snug text-white shadow-lg ring-1 ring-black/10 transition-opacity dark:bg-slate-700 dark:ring-white/10 sm:left-1/2 sm:w-72 sm:-translate-x-1/2 ${
          open ? "visible opacity-100 pointer-events-auto" : "invisible opacity-0 pointer-events-none"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
