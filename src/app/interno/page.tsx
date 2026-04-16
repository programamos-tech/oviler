"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MdDomain } from "react-icons/md";
import { MdOutlineVisibility } from "react-icons/md";
import { normalizePlanType, PLAN_CATALOG, type PlanId } from "@/lib/plan-catalog";
import { licenseClass, licenseLabel } from "@/lib/subscription-status";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import {
  workspaceFilterLabelClass,
  workspaceFilterSearchPillClass,
  workspaceFilterSelectClass,
} from "@/lib/workspace-field-classes";

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
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Bernabé backOffice
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Clientes de la plataforma. Busca por nombre y filtra por licencia o plan; entra al detalle para gestionar la
              suscripción.
            </p>
          </div>
          <div className="w-full lg:overflow-x-auto">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:min-w-max lg:flex-nowrap lg:items-center lg:justify-end">
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-slate-100/90 px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-200/70 sm:w-auto dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
              <Link
                href="/dashboard"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:w-auto"
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

      <section className="space-y-3 outline-none" aria-label="Lista de clientes NOU">
        {loading ? (
          <div className="min-h-[280px] animate-pulse rounded-3xl bg-white dark:bg-slate-900" aria-hidden />
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
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
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
            <div className="space-y-6 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
              {totalCount > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] lg:items-end">
                    <div className="relative min-w-0">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </span>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nombre de organización…"
                        aria-label="Buscar por nombre de organización"
                        className={workspaceFilterSearchPillClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={workspaceFilterLabelClass}>Licencia</label>
                      <select
                        value={licenseFilter}
                        onChange={(e) => setLicenseFilter(e.target.value as LicenseFilter)}
                        className={workspaceFilterSelectClass}
                      >
                        <option value="all">Todas</option>
                        <option value="trial">Prueba gratis</option>
                        <option value="active">Activas</option>
                        <option value="suspended">Suspendidas</option>
                        <option value="cancelled">Canceladas</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={workspaceFilterLabelClass}>Plan</label>
                      <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
                        className={workspaceFilterSelectClass}
                      >
                        <option value="all">Todos</option>
                        <option value="free">Prueba</option>
                        <option value="basic">Estándar</option>
                        <option value="pro">Pro</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : null}
              {/* Desktop: misma rejilla que Clientes */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-100 dark:border-zinc-800/80 xl:block">
                <div
                  className="grid grid-cols-[minmax(150px,1.25fr)_1fr_minmax(120px,1.15fr)_minmax(90px,0.9fr)_minmax(110px,1fr)_minmax(120px,auto)] gap-x-6 border-b border-slate-100 px-5 py-3.5 dark:border-zinc-800/80"
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
                <div className="min-w-0 pl-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Acciones
                </div>
              </div>
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                {filtered.map((o, index) => (
                  <div
                    key={o.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/interno/${o.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/interno/${o.id}`);
                    }}
                    className={`grid grid-cols-[minmax(150px,1.25fr)_1fr_minmax(120px,1.15fr)_minmax(90px,0.9fr)_minmax(110px,1fr)_minmax(120px,auto)] gap-x-6 items-center cursor-pointer px-5 py-4 transition-colors ${
                      index === filtered.length - 1 ? "" : ""
                    } hover:bg-slate-100/90 dark:hover:bg-zinc-900/35`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <WorkspaceCharacterAvatar
                          seed={`${o.name}-${o.id}`}
                          size={64}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="truncate text-[14px] font-medium tracking-tight text-slate-900 dark:text-slate-50">{o.name}</p>
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
                    <div className="flex min-w-0 items-center justify-end gap-1 pl-6" onClick={(e) => e.stopPropagation()}>
                      <span className="group/tooltip relative inline-flex">
                        <Link
                          href={`/interno/${o.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
                          aria-label="Ver detalle"
                        >
                          <MdOutlineVisibility className="h-5 w-5" aria-hidden />
                        </Link>
                        <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 dark:bg-slate-700">
                          Ver detalle
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
                </div>
              </div>

            {/* Mobile: tarjetas estilo Clientes */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:hidden pt-1">
              {filtered.map((o) => (
                <div
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/interno/${o.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(`/interno/${o.id}`);
                  }}
                  className="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/40 px-5 py-4 transition-[border-color,background-color,box-shadow] duration-150 hover:border-slate-200 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-800/25 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Cliente</span>
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <WorkspaceCharacterAvatar
                            seed={`${o.name}-${o.id}`}
                            size={64}
                            className="h-full w-full object-cover"
                          />
                        </div>
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
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/interno/${o.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
                        title="Ver detalle"
                        aria-label="Ver detalle"
                      >
                        <MdOutlineVisibility className="h-5 w-5" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
