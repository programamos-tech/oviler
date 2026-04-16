"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Breadcrumb from "@/app/components/Breadcrumb";
import { fetchGlobalSearch, GLOBAL_SEARCH_LIMIT } from "@/lib/global-search-query";

function BuscarContent() {
  const searchParams = useSearchParams();
  const qRaw = searchParams.get("q");
  const q = typeof qRaw === "string" ? qRaw.trim() : "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchGlobalSearch>> | null>(null);

  useEffect(() => {
    if (!q) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchGlobalSearch(q).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [q]);

  if (!q) {
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-6 font-sans text-[13px] text-slate-800 antialiased dark:text-slate-100">
        <Breadcrumb items={[{ label: "Búsqueda" }]} />
        <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">
          Escribe en el buscador del menú para ver productos y clientes (modal en vivo) o abre una búsqueda desde ahí.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb items={[{ label: "Búsqueda", href: "/buscar" }, { label: `“${q}”` }]} />
        <h1 className="mt-3 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
          Resultados para “{q}”
        </h1>
        <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          Productos (esta sucursal) y clientes de tu sucursal. Hasta {GLOBAL_SEARCH_LIMIT} por categoría.
        </p>
      </header>

      {loading || !data ? (
        <div className="min-h-[200px] animate-pulse rounded-2xl bg-white dark:bg-slate-900" aria-busy />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {data.canProducts ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                Productos
              </h2>
              {data.products.length === 0 ? (
                <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">Ningún producto coincide.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {data.products.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/inventario/${p.id}`}
                        className="flex flex-col gap-0.5 py-3 text-[13px] font-medium text-slate-900 transition-colors hover:text-[color:var(--shell-sidebar)] dark:text-slate-100 dark:hover:text-zinc-300"
                      >
                        <span>{p.name}</span>
                        {p.sku ? <span className="text-[12px] font-normal text-slate-500 dark:text-slate-400">{p.sku}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/inventario?q=${encodeURIComponent(q)}`}
                className="mt-4 inline-block text-[13px] font-semibold text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300"
              >
                Ver todo en inventario
              </Link>
            </section>
          ) : null}

          {data.canCustomers ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                Clientes
              </h2>
              {data.customers.length === 0 ? (
                <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">Ningún cliente coincide.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {data.customers.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/clientes/${c.id}`}
                        className="flex flex-col gap-0.5 py-3 text-[13px] font-medium text-slate-900 transition-colors hover:text-[color:var(--shell-sidebar)] dark:text-slate-100 dark:hover:text-zinc-300"
                      >
                        <span>{c.name}</span>
                        <span className="text-[12px] font-normal text-slate-500 dark:text-slate-400">
                          {[c.cedula, c.phone].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/clientes?q=${encodeURIComponent(q)}`}
                className="mt-4 inline-block text-[13px] font-semibold text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300"
              >
                Ver todo en clientes
              </Link>
            </section>
          ) : null}

          {!data.canProducts && !data.canCustomers ? (
            <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">
              No tienes permiso para ver inventario ni clientes.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-w-0 max-w-[1600px]">
          <div className="min-h-[220px] animate-pulse rounded-2xl bg-white dark:bg-slate-900" aria-busy />
        </div>
      }
    >
      <BuscarContent />
    </Suspense>
  );
}
