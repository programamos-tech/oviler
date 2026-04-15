import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Contenido extra en la barra tipo ventana (ej. título de módulo) */
  toolbarExtra?: ReactNode;
};

/**
 * Marco común para mockups de la landing (barra tipo ventana + panel).
 */
export function LandingMockupFrame({ children, className = "", toolbarExtra }: Props) {
  return (
    <div className={`relative mx-auto w-full ${className}`}>
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 via-transparent to-zinc-500/10 blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.06]">
        <div className="flex items-center gap-2 border-b border-zinc-800/90 bg-zinc-950/80 px-3 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          </div>
          {toolbarExtra ? (
            <div className="min-w-0 flex-1">{toolbarExtra}</div>
          ) : (
            <div className="mx-auto hidden h-6 max-w-[55%] flex-1 rounded-md bg-zinc-800/80 sm:block" aria-hidden />
          )}
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
