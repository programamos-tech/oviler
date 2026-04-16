"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
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
  placeholder?: string;
};

export function GlobalSearchCombobox({
  inputClassName,
  formClassName = "min-w-0 flex-1",
  searchIconLeftClass = "left-3",
  placeholder = "Productos, SKU o clientes…",
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GlobalSearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!showPanel) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showPanel]);

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

  const modal =
    showPanel && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[190] cursor-default bg-black/35 backdrop-blur-[1px]"
              aria-label="Cerrar búsqueda"
              onClick={close}
            />
            <div
              id="global-search-results"
              role="dialog"
              aria-modal="true"
              aria-label="Resultados de búsqueda"
              className="fixed left-1/2 top-[max(5rem,env(safe-area-inset-top,0px)+3rem)] z-[200] flex max-h-[min(70vh,26rem)] w-[min(calc(100vw-1.5rem),28rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                  Coincidencias
                </p>
                <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">“{query.trim()}”</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {loading ? (
                  <p className="px-3 py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">Buscando…</p>
                ) : data ? (
                  <GlobalSearchResultBody data={data} onPick={go} searchTerm={debounced} />
                ) : null}
              </div>
              <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                <button
                  type="button"
                  className="w-full rounded-xl py-2 text-[12px] font-semibold text-[color:var(--shell-sidebar)] hover:bg-slate-50 dark:hover:bg-white/5"
                  onClick={() => {
                    const t = query.trim();
                    if (t) router.push(`/buscar?q=${encodeURIComponent(t)}`);
                    close();
                  }}
                >
                  Ver página de búsqueda completa
                </button>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <form onSubmit={onSubmit} className={formClassName} role="search">
      <div className="relative w-full">
        <svg
          className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500 ${searchIconLeftClass}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={inputClassName}
          autoComplete="off"
          aria-label="Buscar productos o clientes"
          aria-expanded={showPanel}
          aria-controls={showPanel ? "global-search-results" : undefined}
        />
        {modal}
      </div>
    </form>
  );
}

function GlobalSearchResultBody({
  data,
  onPick,
  searchTerm,
}: {
  data: GlobalSearchResult;
  onPick: (href: string) => void;
  searchTerm: string;
}) {
  const hasProducts = data.canProducts && data.products.length > 0;
  const hasCustomers = data.canCustomers && data.customers.length > 0;
  const allEmpty =
    (data.canProducts ? data.products.length === 0 : true) &&
    (data.canCustomers ? data.customers.length === 0 : true) &&
    (data.canProducts || data.canCustomers);

  if (!data.canProducts && !data.canCustomers) {
    return (
      <p className="px-3 py-4 text-[13px] text-slate-500 dark:text-slate-400">No tienes permiso para ver inventario ni clientes.</p>
    );
  }

  if (allEmpty) {
    return (
      <div className="space-y-4">
        <p className="px-2 py-3 text-center text-[13px] text-slate-600 dark:text-slate-400">Sin coincidencias para “{searchTerm}”.</p>
        <FooterLinks data={data} searchTerm={searchTerm} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.canProducts ? (
        <section>
          <h3 className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Productos
          </h3>
          {hasProducts ? (
            <ul className="space-y-0.5">
              {data.products.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-900 transition-colors hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/10"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPick(`/inventario/${p.id}`)}
                  >
                    <span className="block truncate">{p.name}</span>
                    {p.sku ? <span className="block truncate text-[12px] font-normal text-slate-500 dark:text-slate-400">{p.sku}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : !allEmpty ? (
            <p className="px-2 py-1 text-[12px] text-slate-500 dark:text-slate-400">Ningún producto.</p>
          ) : null}
        </section>
      ) : null}

      {data.canCustomers ? (
        <section>
          <h3 className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Clientes
          </h3>
          {hasCustomers ? (
            <ul className="space-y-0.5">
              {data.customers.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-900 transition-colors hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/10"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPick(`/clientes/${c.id}`)}
                  >
                    <span className="block truncate">{c.name}</span>
                    <span className="block truncate text-[12px] font-normal text-slate-500 dark:text-slate-400">
                      {[c.cedula, c.phone].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : !allEmpty ? (
            <p className="px-2 py-1 text-[12px] text-slate-500 dark:text-slate-400">Ningún cliente.</p>
          ) : null}
        </section>
      ) : null}

      <FooterLinks data={data} searchTerm={searchTerm} />
    </div>
  );
}

function FooterLinks({ data, searchTerm }: { data: GlobalSearchResult; searchTerm: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-3 text-[12px] dark:border-slate-800">
      {data.canProducts ? (
        <Link
          href={`/inventario?q=${encodeURIComponent(searchTerm)}`}
          className="font-semibold text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300"
        >
          Abrir inventario filtrado
        </Link>
      ) : null}
      {data.canProducts && data.canCustomers ? <span className="text-slate-300 dark:text-slate-600">·</span> : null}
      {data.canCustomers ? (
        <Link
          href={`/clientes?q=${encodeURIComponent(searchTerm)}`}
          className="font-semibold text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300"
        >
          Abrir clientes filtrados
        </Link>
      ) : null}
    </div>
  );
}
