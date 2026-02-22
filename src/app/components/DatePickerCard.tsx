"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

const WEEKDAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isSameDay(a: Date, b: Date): boolean {
  return toYMD(a) === toYMD(b);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function getCalendarGrid(viewMonth: Date): (Date | null)[] {
  const start = startOfMonth(viewMonth);
  const firstDow = start.getDay(); // 0 = Sunday
  const total = daysInMonth(viewMonth);
  const grid: (Date | null)[] = [];
  // leading empty cells
  for (let i = 0; i < firstDow; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() - (firstDow - i));
    grid.push(d);
  }
  for (let i = 1; i <= total; i++) {
    grid.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i));
  }
  // trailing to complete 6 rows (42 cells)
  while (grid.length < 42) {
    const last = grid[grid.length - 1];
    const next = last instanceof Date ? new Date(last) : new Date();
    next.setDate(next.getDate() + 1);
    grid.push(next);
  }
  return grid;
}

type DatePickerCardProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  min?: Date;
  max?: Date;
  id?: string;
  placeholder?: string;
  allowClear?: boolean;
  "aria-label"?: string;
};

export default function DatePickerCard({
  value,
  onChange,
  min,
  max,
  id,
  placeholder = "Elegir fecha",
  allowClear = true,
  "aria-label": ariaLabel,
}: DatePickerCardProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => value || new Date());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (value) setViewMonth(startOfMonth(value));
  }, [value?.getTime()]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const el = buttonRef.current ?? wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const padding = 8;
    const calendarWidth = 280;
    const viewportPad = 8;
    let top = rect.bottom + padding;
    let left = rect.left;
    if (left + calendarWidth > window.innerWidth - viewportPad) left = window.innerWidth - calendarWidth - viewportPad;
    if (left < viewportPad) left = viewportPad;
    if (top + 380 > window.innerHeight - viewportPad) top = Math.max(viewportPad, rect.top - 380 - padding);
    if (top < viewportPad) top = viewportPad;
    setPosition({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = wrapperRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const displayValue = value
    ? value.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const minStr = min ? toYMD(min) : null;
  const maxStr = max ? toYMD(max) : null;
  const today = new Date();
  const todayStr = toYMD(today);

  const canPrev = min
    ? new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 0) >= min
    : true;
  const canNext = max
    ? new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1) <= max
    : true;

  const grid = getCalendarGrid(viewMonth);

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 min-w-[140px] cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-2 pr-2 text-[12px] text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        <span className={displayValue ? "font-medium" : "text-slate-400 dark:text-slate-500"}>
          {displayValue || placeholder}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-ov-pink dark:text-ov-pink-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            role="dialog"
            aria-modal="true"
            aria-label="Calendario"
            className="fixed w-[280px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-700 z-[9999]"
            style={{ top: position.top, left: position.left }}
          >
          {/* Mes / año y flechas */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() =>
                setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))
              }
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Mes anterior"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-[14px] font-semibold capitalize text-slate-800 dark:text-slate-100">
              {MONTHS[viewMonth.getMonth()]} de {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              disabled={!canNext}
              onClick={() =>
                setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))
              }
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Mes siguiente"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Días de la semana */}
          <div className="mb-2 grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-1 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((d, i) => {
              if (!d) return <div key={i} />;
              const str = toYMD(d);
              const isCurrentMonth = d.getMonth() === viewMonth.getMonth();
              const isSelected = value && isSameDay(d, value);
              const isToday = str === todayStr;
              const disabled = Boolean(
                (minStr && str < minStr) || (maxStr && str > maxStr)
              );

              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    onChange(d);
                    setOpen(false);
                  }}
                  className={`flex h-8 w-full items-center justify-center rounded-lg text-[13px] transition-colors ${
                    !isCurrentMonth
                      ? "text-slate-300 dark:text-slate-600"
                      : disabled
                        ? "cursor-not-allowed text-slate-300 dark:text-slate-600"
                        : isSelected
                          ? "bg-ov-pink text-white hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
                          : isToday
                            ? "font-bold text-ov-pink ring-2 ring-ov-pink/50 hover:bg-ov-pink/10 dark:text-ov-pink-muted dark:ring-ov-pink-muted/50 dark:hover:bg-ov-pink/20"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Borrar y Hoy */}
          <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-[13px] font-medium text-ov-pink hover:underline dark:text-ov-pink-muted"
              >
                Borrar
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                if (minStr && toYMD(t) < minStr) return;
                if (maxStr && toYMD(t) > maxStr) return;
                onChange(t);
                setOpen(false);
              }}
              className="text-[13px] font-medium text-ov-pink hover:underline dark:text-ov-pink-muted"
            >
              Hoy
            </button>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
