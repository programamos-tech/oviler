"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PROGRAMAMOS_WA_LICENSE } from "@/lib/programamos-contact";
import { trialRemainingLabel } from "@/lib/trial-ux";

type Props = {
  open: boolean;
  trialEndsAt: string;
  onClose: () => void;
};

export default function FreeTrialWelcomeModal({ open, trialEndsAt, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const remaining = trialRemainingLabel(trialEndsAt);

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-welcome-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl dark:border-slate-600/90 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nou-500/15 text-xl dark:bg-nou-500/20"
            aria-hidden
          >
            ⏱
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="trial-welcome-title"
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50"
            >
              Prueba gratis de Berea Comercios
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
              Te quedan <span className="font-semibold text-slate-900 dark:text-slate-100">{remaining}</span> para usar la
              plataforma en modo prueba (límites reducidos). Para adquirir o renovar la licencia Basic o Pro, escríbenos
              por WhatsApp.
            </p>
            <a
              href={PROGRAMAMOS_WA_LICENSE}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-nou-700/25 bg-nou-500/[0.07] px-4 text-[14px] font-medium text-nou-900 transition-colors hover:border-nou-600/35 hover:bg-nou-500/[0.12] dark:border-nou-400/20 dark:bg-nou-950/50 dark:text-nou-100 dark:hover:border-nou-400/30 dark:hover:bg-nou-900/40"
            >
              <svg className="h-4 w-4 shrink-0 opacity-80" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp programamos
            </a>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-white py-2.5 text-[14px] font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
