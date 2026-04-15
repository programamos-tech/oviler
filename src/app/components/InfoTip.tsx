"use client";

import type { ReactNode } from "react";

/**
 * Icono (i) con texto largo al hover / foco. Mantiene la vista limpia frente a párrafos explicativos.
 */
export function InfoTip({ children, ariaLabel = "Más información" }: { children: ReactNode; ariaLabel?: string }) {
  return (
    <span className="group/infotip relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-500 dark:hover:text-slate-300"
        aria-label={ariaLabel}
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
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-50 mt-1.5 w-[min(calc(100vw-2rem),18rem)] rounded-lg bg-slate-800 px-3 py-2 text-left text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg ring-1 ring-black/10 transition-opacity group-hover/infotip:visible group-hover/infotip:opacity-100 group-focus-within/infotip:visible group-focus-within/infotip:opacity-100 dark:bg-slate-700 dark:ring-white/10 sm:left-1/2 sm:w-72 sm:-translate-x-1/2"
      >
        {children}
      </span>
    </span>
  );
}
