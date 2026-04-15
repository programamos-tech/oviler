"use client";

import { useEffect } from "react";

/** Misma paleta que el resto del panel (sucursales, créditos, dashboard): shell (gris). */
const shellBtnClass =
  "rounded-lg bg-[color:var(--shell-sidebar)] px-4 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:opacity-50";
/** Mismo tono que el botón de acción principal. */
const shellSameAsBtnClass = "text-[color:var(--shell-sidebar)]";

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
  /** Solo una X en verde marca (sin círculos). Ideal para anular factura; ignora `icon` si es true. */
  showPlainCloseIcon?: boolean;
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
  showPlainCloseIcon = false,
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      aria-modal="true"
      aria-labelledby={ariaTitle ? "confirm-delete-title" : undefined}
      role="dialog"
    >
      {/* Negro + blur leve (como el carrito en catálogo): el slate semitransparente sobre el sidebar verde se veía azulado */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] dark:bg-black/58"
        onClick={loading ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[36.5rem] rounded-xl border border-zinc-200/90 bg-white p-5 shadow-xl dark:border-white/[0.08] dark:bg-[rgb(var(--ov-surface-strong))] dark:shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
        <div className="flex gap-4">
          {showPlainCloseIcon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden>
              <svg
                className={`h-6 w-6 shrink-0 ${shellSameAsBtnClass}`}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" />
              </svg>
            </span>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center text-zinc-500 dark:text-zinc-400" aria-hidden>
              {icon ?? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4m1 4h.01M12 4h.01M17 4h.01" />
                </svg>
              )}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-delete-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              {title}
            </h2>
            <p className="mt-1 text-[14px] text-zinc-600 dark:text-zinc-400">
              {message}
            </p>
            {reasonLabel && (
              <div className="mt-3">
                <label htmlFor="confirm-reason" className="mb-1 block text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                  {reasonLabel}{" "}
                  <span className={`font-semibold ${shellSameAsBtnClass}`}>*</span>
                </label>
                <textarea
                  id="confirm-reason"
                  value={reasonValue}
                  onChange={(e) => reasonOnChange?.(e.target.value)}
                  placeholder={reasonPlaceholder}
                  rows={3}
                  disabled={loading}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[color:var(--shell-sidebar)] focus:ring-2 focus:ring-[color:var(--shell-sidebar)]/30 dark:border-zinc-600 dark:bg-[rgb(var(--ov-surface-soft))] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[color:var(--shell-sidebar)]"
                />
              </div>
            )}
            {warning && (
              <div className="mt-3 rounded-lg border border-[color:var(--shell-sidebar)]/20 bg-[color:var(--shell-sidebar)]/[0.06] p-3 text-[13px] text-zinc-700 dark:border-[color:var(--shell-sidebar)]/35 dark:bg-[color:var(--shell-sidebar)]/12 dark:text-zinc-300">
                {warning}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:bg-zinc-700/90"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || confirmDisabled || (!!reasonLabel && !reasonValue.trim())}
                className={shellBtnClass}
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
