"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGlobalSearch, type GlobalSearchResult } from "@/lib/global-search-query";

const DEBOUNCE_MS = 280;
const MIN_CHARS = 1;

type Props = {
  /** Clases del `<input>` (incl. padding izquierdo si hay icono). */
  inputClassName: string;
  formClassName?: string;
  /** Clase horizontal del icono lupa (`left-3` o `left-3.5`, etc.) */
  searchIconLeftClass?: string;
  /** Color del icono lupa (por defecto gris; p. ej. en navbar oscuro `text-white/45`) */
  searchIconClassName?: string;
  placeholder?: string;
  /** Variante visual del panel (navbar oscuro en móvil). */
  variant?: "light" | "dark";
};

export function GlobalSearchCombobox({
  inputClassName,
  formClassName = "min-w-0 flex-1",
  searchIconLeftClass = "left-3",
  searchIconClassName,
  placeholder = "Productos, SKU o clientes…",
  variant = "light",
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GlobalSearchResult | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < MIN_CHARS) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchGlobalSearch(debounced).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const showPanel = open && query.trim().length >= MIN_CHARS;

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!showPanel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPanel, close]);

  useEffect(() => {
    if (!showPanel) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) close();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showPanel, close]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = query.trim();
    if (!t) return;
    router.push(`/buscar?q=${encodeURIComponent(t)}`);
    close();
    setQuery("");
  };

  const go = (href: string) => {
    router.push(href);
    close();
    setQuery("");
  };

  const panelClass =
    variant === "dark"
      ? "border-[var(--shell-nav-border)] bg-[var(--shell-nav-bg)] shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
      : "border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900";

  return (
    <form onSubmit={onSubmit} className={formClassName} role="search">
      <div ref={rootRef} className="relative w-full">
        <svg
          className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 ${searchIconClassName ?? "text-slate-400 dark:text-zinc-500"} ${searchIconLeftClass}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`${inputClassName}${query ? " pr-10" : ""}`}
          autoComplete="off"
          aria-label="Buscar productos o clientes"
          aria-expanded={showPanel}
          aria-controls={showPanel ? "global-search-results" : undefined}
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setData(null);
              setOpen(false);
            }}
            className={`absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
              variant === "dark"
                ? "text-[var(--shell-nav-fg-subtle)] hover:bg-[var(--shell-nav-hover-bg)] hover:text-[var(--shell-nav-fg)]"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-300"
            }`}
            aria-label="Limpiar búsqueda"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}

        {showPanel ? (
          <div
            id="global-search-results"
            role="listbox"
            aria-label="Resultados de búsqueda"
            className={`absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[120] max-h-[min(70vh,22rem)] overflow-hidden rounded-xl border ${panelClass}`}
          >
            <div className="max-h-[min(70vh,22rem)] overflow-y-auto py-2">
              {loading ? (
                <p
                  className={`px-4 py-6 text-center text-[13px] ${
                    variant === "dark" ? "text-[var(--shell-nav-fg-muted)]" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Buscando…
                </p>
              ) : data ? (
                <GlobalSearchResultBody data={data} onPick={go} searchTerm={debounced} variant={variant} />
              ) : null}
            </div>
            {data && !loading ? (
              <div
                className={`border-t px-3 py-2 ${
                  variant === "dark" ? "border-[var(--shell-nav-border)]" : "border-slate-100 dark:border-slate-800"
                }`}
              >
                <button
                  type="button"
                  className={`w-full rounded-lg py-2 text-[12px] font-semibold transition-colors ${
                    variant === "dark"
                      ? "text-[var(--shell-nav-fg)] hover:bg-[var(--shell-nav-hover-bg)]"
                      : "text-[color:var(--shell-sidebar)] hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const t = query.trim();
                    if (t) router.push(`/buscar?q=${encodeURIComponent(t)}`);
                    close();
                  }}
                >
                  Ver todos los resultados
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </form>
  );
}

function GlobalSearchResultBody({
  data,
  onPick,
  searchTerm,
  variant,
}: {
  data: GlobalSearchResult;
  onPick: (href: string) => void;
  searchTerm: string;
  variant: "light" | "dark";
}) {
  const hasProducts = data.canProducts && data.products.length > 0;
  const hasCustomers = data.canCustomers && data.customers.length > 0;
  const allEmpty =
    (data.canProducts ? data.products.length === 0 : true) &&
    (data.canCustomers ? data.customers.length === 0 : true) &&
    (data.canProducts || data.canCustomers);

  if (!data.canProducts && !data.canCustomers) {
    return (
      <p className={`px-4 py-4 text-[13px] ${variant === "dark" ? "text-[var(--shell-nav-fg-muted)]" : "text-slate-500 dark:text-slate-400"}`}>
        No tienes permiso para ver inventario ni clientes.
      </p>
    );
  }

  if (allEmpty) {
    return (
      <div className="space-y-3 px-2">
        <p className={`px-2 py-3 text-center text-[13px] ${variant === "dark" ? "text-[var(--shell-nav-fg-muted)]" : "text-slate-600 dark:text-slate-400"}`}>
          Sin coincidencias para “{searchTerm}”.
        </p>
        <FooterLinks data={data} searchTerm={searchTerm} variant={variant} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {data.canCustomers && hasCustomers ? (
        <section>
          <h3 className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
            Clientes
          </h3>
          <ul>
            {data.customers.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    variant === "dark" ? "hover:bg-[var(--shell-nav-hover-bg)]" : "hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPick(`/clientes/${c.id}`)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300">
                    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[14px] font-semibold ${
                        variant === "dark" ? "text-[var(--shell-nav-fg)]" : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {c.name}
                    </span>
                    <span className={`block truncate text-[12px] ${variant === "dark" ? "text-[var(--shell-nav-fg-subtle)]" : "text-slate-500 dark:text-slate-400"}`}>
                      {c.cedula ? `Doc. ${c.cedula}` : c.phone ? c.phone : "—"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                    Cliente
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasCustomers && hasProducts ? (
        <div className={`mx-4 border-t ${variant === "dark" ? "border-[var(--shell-nav-border)]" : "border-slate-100 dark:border-slate-800"}`} />
      ) : null}

      {data.canProducts && hasProducts ? (
        <section>
          <h3 className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Productos
          </h3>
          <ul>
            {data.products.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    variant === "dark" ? "hover:bg-[var(--shell-nav-hover-bg)]" : "hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPick(`/inventario/${p.id}`)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[14px] font-semibold ${
                        variant === "dark" ? "text-[var(--shell-nav-fg)]" : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {p.name}
                    </span>
                    <span className={`block truncate text-[12px] ${variant === "dark" ? "text-[var(--shell-nav-fg-subtle)]" : "text-slate-500 dark:text-slate-400"}`}>
                      {p.sku ? `Ref. ${p.sku}` : "Sin referencia"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Producto
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={`mx-4 border-t pt-2 ${variant === "dark" ? "border-[var(--shell-nav-border)]" : "border-slate-100 dark:border-slate-800"}`}>
        <FooterLinks data={data} searchTerm={searchTerm} variant={variant} />
      </div>
    </div>
  );
}

function FooterLinks({
  data,
  searchTerm,
  variant,
}: {
  data: GlobalSearchResult;
  searchTerm: string;
  variant: "light" | "dark";
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-1 pb-1 text-[12px] ${variant === "dark" ? "text-[var(--shell-nav-fg-subtle)]" : ""}`}>
      {data.canProducts ? (
        <Link
          href={`/inventario?q=${encodeURIComponent(searchTerm)}`}
          className={`font-semibold hover:underline ${
            variant === "dark" ? "text-emerald-300" : "text-emerald-700 dark:text-emerald-400"
          }`}
          onMouseDown={(e) => e.preventDefault()}
        >
          Inventario filtrado
        </Link>
      ) : null}
      {data.canProducts && data.canCustomers ? (
        <span className={variant === "dark" ? "text-[var(--shell-nav-border)]" : "text-slate-300 dark:text-slate-600"}>·</span>
      ) : null}
      {data.canCustomers ? (
        <Link
          href={`/clientes?q=${encodeURIComponent(searchTerm)}`}
          className={`font-semibold hover:underline ${
            variant === "dark" ? "text-sky-300" : "text-sky-700 dark:text-sky-400"
          }`}
          onMouseDown={(e) => e.preventDefault()}
        >
          Clientes filtrados
        </Link>
      ) : null}
    </div>
  );
}
