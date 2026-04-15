"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MdDomain } from "react-icons/md";
import { normalizePlanType, PLAN_CATALOG, type PlanId } from "@/lib/plan-catalog";
import { licenseClass, licenseLabel } from "@/lib/subscription-status";

type OrgStat = {
  id: string;
  name: string;
  plan_type: string;
  subscription_status: string | null;
  created_at: string;
  max_branches: number;
  max_users: number;
  max_products: number;
  trial_ends_at: string | null;
  user_count: number;
  branch_count: number;
  product_count: number;
  customer_count: number;
  sale_count: number;
  expense_count: number;
};

type OverviewPayload = {
  totals: {
    organizations: number;
    users: number;
    products: number;
    branches: number;
    customers: number;
    sales: number;
    expenses: number;
  };
  organizations: OrgStat[];
};

type LicenseFilter = "all" | "trial" | "active" | "suspended" | "cancelled";
type PlanFilter = "all" | PlanId;

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function planLabel(p: string) {
  return PLAN_CATALOG[normalizePlanType(p)].label;
}

export default function InternoPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [licenseFilter, setLicenseFilter] = useState<LicenseFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/internal/overview", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json.error ?? `Error ${res.status}`);
          return;
        }
        if (!cancelled) {
          setError(null);
          setData(json as OverviewPayload);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!data?.organizations) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.organizations.filter((o) => {
      const matchSearch = !q || o.name.toLowerCase().includes(q);
      const st = o.subscription_status ?? "";
      const matchLicense =
        licenseFilter === "all" ||
        (licenseFilter === "trial" && st === "trial") ||
        (licenseFilter === "active" && st === "active") ||
        (licenseFilter === "suspended" && st === "suspended") ||
        (licenseFilter === "cancelled" && st === "cancelled");
      const matchPlan = planFilter === "all" || normalizePlanType(o.plan_type) === planFilter;
      return matchSearch && matchLicense && matchPlan;
    });
  }, [data, searchQuery, licenseFilter, planFilter]);

  const totalCount = data?.organizations.length ?? 0;

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200/80 bg-amber-50 p-6 text-amber-950 shadow-sm ring-1 ring-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-900/40">
        <p className="font-semibold">No se pudo cargar el panel</p>
        <p className="mt-2 text-sm opacity-90">{error}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ov-pink hover:text-ov-pink-hover hover:underline dark:text-ov-pink-muted"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full space-y-4">
      <header className="min-w-0 space-y-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-emerald-50 sm:text-2xl">
              Clientes NOU
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Organizaciones que usan la plataforma. Busca por nombre y filtra por licencia o plan; entra al detalle para
              gestionar la suscripción.
            </p>
          </div>
          <div className="w-full lg:overflow-x-auto">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:min-w-max lg:flex-nowrap lg:items-center lg:justify-end">
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto sm:px-4 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
              <Link
                href="/dashboard"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-ov-pink px-3 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover sm:w-auto sm:px-4 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  dashboard
                </span>
                Ir a mi cuenta
              </Link>
            </div>
          </div>
        </div>
      </header>

      {!loading && totalCount > 0 && (
        <div className="space-y-3">
          <div className="relative min-w-0 w-full">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre de organización…"
              aria-label="Buscar por nombre de organización"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-[14px] text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400">Licencia</label>
              <select
                value={licenseFilter}
                onChange={(e) => setLicenseFilter(e.target.value as LicenseFilter)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Todas</option>
                <option value="trial">Prueba gratis</option>
                <option value="active">Activas</option>
                <option value="suspended">Suspendidas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400">Plan</label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Todos</option>
                <option value="free">Prueba</option>
                <option value="basic">Estándar</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3 outline-none" aria-label="Lista de clientes NOU">
        {loading ? (
          <div className="min-h-[280px]" aria-hidden />
        ) : error && data ? (
          <div className="rounded-xl bg-amber-50 p-6 text-center dark:bg-amber-900/20">
            <p className="text-[15px] font-medium text-amber-800 dark:text-amber-200">Error al actualizar</p>
            <p className="mt-1 text-[13px] text-amber-700 dark:text-amber-300/90">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm hover:bg-ov-pink-hover"
            >
              Reintentar
            </button>
          </div>
        ) : !data || filtered.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
              {totalCount === 0 ? "Aún no hay clientes registrados" : "Ningún cliente coincide con los filtros"}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {totalCount === 0
                ? "Cuando existan organizaciones en la base de datos aparecerán aquí."
                : "Prueba cambiando la búsqueda, la licencia o el plan."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: misma rejilla que Ventas */}
            <div className="hidden overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 xl:block">
              <div
                className="grid grid-cols-[minmax(100px,1fr)_1fr_minmax(100px,1.2fr)_minmax(70px,0.8fr)_minmax(90px,0.9fr)_minmax(72px,0.7fr)_minmax(155px,auto)] gap-x-6 items-center border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50"
                aria-hidden
              >
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Organización
                </div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Fecha alta
                </div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Plan
                </div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Licencia
                </div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sucursales
                </div>
                <div className="min-w-0 w-full text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ventas
                </div>
                <div className="min-w-0 pl-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Acciones
                </div>
              </div>
              {filtered.map((o, index) => {
                const isLast = index === filtered.length - 1;
                return (
                  <div
                    key={o.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/interno/${o.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/interno/${o.id}`);
                    }}
                    className={`grid grid-cols-[minmax(100px,1fr)_1fr_minmax(100px,1.2fr)_minmax(70px,0.8fr)_minmax(90px,0.9fr)_minmax(72px,0.7fr)_minmax(155px,auto)] gap-x-6 items-center cursor-pointer border-b border-slate-100 px-5 py-4 transition-colors dark:border-slate-800 ${
                      isLast ? "border-b-0" : ""
                    } hover:bg-slate-50 dark:hover:bg-slate-800/50`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <MdDomain className="h-5 w-5 shrink-0 text-ov-pink dark:text-ov-pink-muted" aria-hidden />
                      <p className="truncate text-[14px] font-bold text-slate-900 dark:text-slate-50">{o.name}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">
                        {formatTime(o.created_at)} · {formatDate(o.created_at)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-slate-900 dark:text-slate-50 sm:text-base">
                        {planLabel(o.plan_type)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[14px] font-bold ${licenseClass(o.subscription_status)}`}>
                        {licenseLabel(o.subscription_status)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">
                        {o.branch_count} suc. · {o.user_count} usu.
                      </p>
                    </div>
                    <div className="flex w-full min-w-0 items-center justify-end">
                      <span className="text-[14px] font-bold tabular-nums text-slate-900 dark:text-slate-50 sm:text-base">
                        {o.sale_count}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-end gap-1 pl-6" onClick={(e) => e.stopPropagation()}>
                      <span className="group/tooltip relative inline-flex">
                        <Link
                          href={`/interno/${o.id}`}
                          className="inline-flex p-1 text-ov-pink hover:text-ov-pink-hover dark:text-ov-pink dark:hover:text-ov-pink-hover"
                          aria-label="Ver detalle"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                        <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 dark:bg-slate-700">
                          Ver detalle
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile: tarjetas como Ventas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
              {filtered.map((o) => (
                <div
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/interno/${o.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(`/interno/${o.id}`);
                  }}
                  className="cursor-pointer rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-100 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Cliente</span>
                      <div className="flex min-w-0 items-center gap-2">
                        <MdDomain className="h-4 w-4 shrink-0 text-ov-pink dark:text-ov-pink-muted" aria-hidden />
                        <span className="truncate font-bold text-slate-900 dark:text-slate-50">{o.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Fecha</span>
                      <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200">
                        {formatTime(o.created_at)} · {formatDate(o.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Plan</span>
                      <span className="truncate text-[14px] font-bold text-slate-900 dark:text-slate-50">{planLabel(o.plan_type)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Licencia · Suc./Usu.</span>
                      <span className="text-right text-[14px]">
                        <span className={licenseClass(o.subscription_status)}>{licenseLabel(o.subscription_status)}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {" "}
                          · {o.branch_count}/{o.user_count}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                      <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Ventas registradas</span>
                      <span className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-50">{o.sale_count}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <span className="inline-flex gap-1 text-[13px] font-medium text-ov-pink">
                        <Link href={`/interno/${o.id}`} className="hover:underline" title="Ver detalle">
                          Ver detalle
                        </Link>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
