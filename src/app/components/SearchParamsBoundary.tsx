import { Suspense, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

const defaultFallback = (
  <div className="flex min-h-[40vh] items-center justify-center text-[14px] text-[var(--berea-ink-muted)] dark:text-[var(--shell-nav-fg-subtle)]">
    Cargando…
  </div>
);

/** Envuelve páginas client que usan useSearchParams (requerido en build de Next.js). */
export function SearchParamsBoundary({ children, fallback = defaultFallback }: Props) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
