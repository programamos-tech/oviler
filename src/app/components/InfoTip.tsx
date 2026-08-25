"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Icono (i) con texto explicativo. Se abre y cierra con clic/tap (iPad y móvil);
 * clic fuera o Escape cierra. El panel se renderiza en portal (fixed) para no
 * quedar recortado por overflow:hidden de cards/grids.
 */
export function InfoTip({
  children,
  ariaLabel = "Más información",
  tone = "default",
}: {
  children: ReactNode;
  ariaLabel?: string;
  tone?: "default" | "berea";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const btn = rootRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const maxW = Math.min(window.innerWidth - 16, 240);
    let left = rect.left + rect.width / 2 - maxW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - maxW - 8));
    const top = rect.bottom + 8;
    setCoords({ top, left, width: maxW });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (e: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      const panel = panelRef.current;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (root?.contains(target) || panel?.contains(target)) return;
      setOpen(false);
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

  const panelClass =
    tone === "berea"
      ? "bg-[#111219] text-[#f4f4f5] shadow-lg ring-1 ring-black/25"
      : "bg-slate-800 text-white shadow-lg ring-1 ring-black/10 dark:bg-slate-700 dark:ring-white/10";

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        className={
          tone === "berea"
            ? "inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--berea-ink-subtle)] outline-none transition-colors hover:text-[var(--berea-ink-muted)] focus-visible:ring-2 focus-visible:ring-[var(--berea-accent)]/40"
            : "inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-500 dark:hover:text-slate-300"
        }
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={tooltipId}
        onClick={onButtonClick}
      >
        <svg
          className={tone === "berea" ? "h-3.5 w-3.5" : "h-4 w-4"}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {mounted &&
        open &&
        coords &&
        createPortal(
          <span
            ref={panelRef}
            id={tooltipId}
            role="tooltip"
            className={`fixed z-[200] rounded-lg px-2.5 py-2 text-left text-[11px] font-medium leading-snug ${panelClass}`}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            {children}
          </span>,
          document.body
        )}
    </span>
  );
}
