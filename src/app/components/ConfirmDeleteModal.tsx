"use client";

import { useEffect } from "react";

export type ConfirmDeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  /** Información adicional (ej. "Hay X productos con esta categoría. Quedarán sin categoría.") */
  warning?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** Mientras es true, el botón de confirmar muestra "Eliminando…" y está deshabilitado */
  loading?: boolean;
  /** Si true, el botón confirmar está deshabilitado (ej. mientras se carga info adicional) */
  confirmDisabled?: boolean;
  /** Accesibilidad: describe qué se va a eliminar (ej. "Eliminar categoría Alimentos") */
  ariaTitle?: string;
  /** Icono a la izquierda del título (ej. Material Icon). Si no se pasa, se usa el icono por defecto. */
  icon?: React.ReactNode;
  /** Si se define, se muestra un campo de texto obligatorio (motivo de anulación, etc.). */
  reasonLabel?: string;
  reasonValue?: string;
  reasonOnChange?: (value: string) => void;
  reasonPlaceholder?: string;
};

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  title,
  message,
  warning,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  onConfirm,
  loading = false,
  confirmDisabled = false,
  ariaTitle,
  icon,
  reasonLabel,
  reasonValue = "",
  reasonOnChange,
  reasonPlaceholder,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  async function handleConfirm() {
    await onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      aria-labelledby={ariaTitle ? "confirm-delete-title" : undefined}
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70"
        onClick={loading ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[36.5rem] rounded-xl bg-white p-5 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ov-pink/10 text-ov-pink dark:bg-ov-pink/20 dark:text-ov-pink-muted">
            {icon ?? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4m1 4h.01M12 4h.01M17 4h.01" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-delete-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-50"
            >
              {title}
            </h2>
            <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">
              {message}
            </p>
            {reasonLabel && (
              <div className="mt-3">
                <label htmlFor="confirm-reason" className="mb-1 block text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  {reasonLabel} <span className="text-ov-pink">*</span>
                </label>
                <textarea
                  id="confirm-reason"
                  value={reasonValue}
                  onChange={(e) => reasonOnChange?.(e.target.value)}
                  placeholder={reasonPlaceholder}
                  rows={3}
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            )}
            {warning && (
              <div className="mt-3 rounded-lg bg-ov-pink/10 p-3 text-[13px] text-slate-700 dark:bg-ov-pink/20 dark:text-slate-300">
                {warning}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || confirmDisabled || (!!reasonLabel && !reasonValue.trim())}
                className="rounded-lg bg-ov-pink px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-ov-pink-hover disabled:opacity-50 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              >
                {loading ? "Eliminando…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
