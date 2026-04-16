"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import { getAvatarVariant } from "@/app/components/app-nav-data";
import {
  workspaceFilterLabelClass,
  workspaceFilterSearchPillClass,
  workspaceFilterSelectClass,
} from "@/lib/workspace-field-classes";
import {
  clientAggregateChip,
  clientAggregateStatusFromCredits,
  creditRowPending,
  formatDateShort,
  formatMoney,
  type ClientAggregateStatus,
  type CreditStatus,
} from "./credit-ui";

type CreditStatusFilter = "all" | ClientAggregateStatus;

const CREDIT_STATUS_FILTER_OPTIONS: { value: CreditStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "overdue", label: "Vencido" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Anulado" },
];

type CreditRow = {
  id: string;
  customer_id: string;
  total_amount: number;
  amount_paid: number;
  due_date: string;
  status: CreditStatus;
  cancelled_at: string | null;
  customers: { id: string; name: string } | null;
};

type GroupedClient = {
  customerId: string;
  name: string;
  credits: CreditRow[];
  invoiceCount: number;
  totalAmount: number;
  totalPending: number;
  nextDue: string | null;
  aggregateStatus: ReturnType<typeof clientAggregateStatusFromCredits>;
};

export default function CreditosPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [rows, setRows] = useState<CreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CreditStatusFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchRequestId = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const reqId = ++fetchRequestId.current;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled || reqId !== fetchRequestId.current) {
        if (!cancelled && reqId === fetchRequestId.current) setLoading(false);
        return;
      }
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (!ub?.branch_id || cancelled || reqId !== fetchRequestId.current) {
        if (!cancelled && reqId === fetchRequestId.current) {
          setBranchId(null);
          setRows([]);
          setLoading(false);
        }
        return;
      }
      if (cancelled || reqId !== fetchRequestId.current) return;
      setBranchId(ub.branch_id);
      const { data, error: qErr } = await supabase
        .from("customer_credits")
        .select("id, customer_id, total_amount, amount_paid, due_date, status, cancelled_at, customers(id, name)")
        .eq("branch_id", ub.branch_id)
        .order("created_at", { ascending: false });
      if (cancelled || reqId !== fetchRequestId.current) return;
      if (qErr) {
        setError(qErr.message);
        setRows([]);
      } else {
        setRows((data ?? []) as unknown as CreditRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, CreditRow[]>();
    for (const r of rows) {
      const list = map.get(r.customer_id) ?? [];
      list.push(r);
      map.set(r.customer_id, list);
    }
    const out: GroupedClient[] = [];
    for (const [, credits] of map) {
      const first = credits[0];
      const name = first?.customers?.name ?? "Cliente";
      const customerId = first?.customer_id ?? "";
      const totalAmount = credits.reduce((s, c) => s + Number(c.total_amount), 0);
      const totalPending = credits.reduce(
        (s, c) => s + creditRowPending(Number(c.total_amount), Number(c.amount_paid), Boolean(c.cancelled_at)),
        0
      );
      const open = credits.filter((c) => !c.cancelled_at && c.status !== "cancelled");
      const pendingCredits = open.filter(
        (c) => creditRowPending(Number(c.total_amount), Number(c.amount_paid), false) > 0.005
      );
      let nextDue: string | null = null;
      if (pendingCredits.length) {
        const dates = pendingCredits.map((c) => c.due_date).sort();
        nextDue = dates[0] ?? null;
      }
      out.push({
        customerId,
        name,
        credits,
        invoiceCount: credits.length,
        totalAmount,
        totalPending,
        nextDue,
        aggregateStatus: clientAggregateStatusFromCredits(credits),
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name, "es"));
    const q = search.trim().toLowerCase();
    let next = !q ? out : out.filter((g) => g.name.toLowerCase().includes(q) || g.customerId.toLowerCase().includes(q));
    if (statusFilter !== "all") {
      next = next.filter((g) => g.aggregateStatus === statusFilter);
    }
    return next;
  }, [rows, search, statusFilter]);

  const actionIconClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-[color:var(--shell-sidebar)] dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-zinc-300";

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] lg:overflow-visible">
              <h1 className="w-max whitespace-nowrap text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
                Créditos a clientes
              </h1>
            </div>
            <div className="mt-1 overflow-x-auto [-webkit-overflow-scrolling:touch]">
              <p className="w-max whitespace-nowrap text-left text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                Resumen por cliente de esta sucursal. Entra al detalle para ver cada crédito y registrar abonos.
              </p>
            </div>
          </div>
          <div className="w-full shrink-0 lg:w-auto lg:overflow-x-auto">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:min-w-max lg:flex-nowrap lg:items-center lg:justify-end">
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setRefreshKey((k) => k + 1);
                }}
                disabled={loading}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-slate-100/90 px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-200/70 disabled:pointer-events-none disabled:opacity-50 sm:w-auto dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
              <Link
                href="/creditos/nuevo"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:w-auto"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo crédito
              </Link>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-red-800 dark:border-red-900/45 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-medium">Error al cargar créditos</p>
          <p className="mt-1 text-[13px]">{error}</p>
        </div>
      )}

      <section className="space-y-6 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
        {loading ? (
          <div className="min-h-[280px] animate-pulse rounded-2xl bg-slate-50 dark:bg-slate-800/40" aria-hidden />
        ) : !branchId ? (
          <p className="text-center text-[13px] font-medium text-slate-500 dark:text-slate-400">No tienes sucursal asignada.</p>
        ) : (
          <>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3 lg:gap-4">
              <div className="relative min-w-0 max-w-xl flex-1 sm:min-w-[12rem]">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente…"
                  className={workspaceFilterSearchPillClass}
                  aria-label="Filtrar por nombre de cliente"
                />
              </div>
              <div className="w-full min-w-0 space-y-1.5 sm:w-[11rem] sm:shrink-0 lg:w-[12rem]">
                <label htmlFor="creditos-filter-estado" className={workspaceFilterLabelClass}>
                  Estado
                </label>
                <select
                  id="creditos-filter-estado"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CreditStatusFilter)}
                  className={workspaceFilterSelectClass}
                  aria-label="Filtrar por estado del crédito"
                >
                  {CREDIT_STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-slate-700">
                <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200">Aún no hay créditos</p>
                <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  Crea un crédito vinculado a un cliente para verlo aquí.
                </p>
                <Link
                  href="/creditos/nuevo"
                  className="mt-6 inline-flex h-9 items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
                >
                  Nuevo crédito
                </Link>
              </div>
            ) : grouped.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-slate-700">
                <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200">Sin resultados</p>
                <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  Prueba otro nombre o ajusta el filtro de estado.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="mt-5 inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Limpiar búsqueda y filtros
                </button>
              </div>
            ) : (
              <div className="hidden overflow-hidden rounded-2xl border border-slate-100 dark:border-zinc-800/80 xl:block">
                <div className="grid grid-cols-[minmax(160px,2fr)_minmax(100px,1fr)_minmax(90px,0.9fr)_minmax(90px,0.9fr)_minmax(120px,1fr)_minmax(100px,0.85fr)_minmax(52px,auto)] gap-x-4 border-b border-slate-100 bg-slate-50 px-5 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                  <div className={workspaceFilterLabelClass}>Cliente</div>
                  <div className={workspaceFilterLabelClass}>Créditos</div>
                  <div className={`${workspaceFilterLabelClass} text-right`}>Total</div>
                  <div className={`${workspaceFilterLabelClass} text-right`}>Pendiente</div>
                  <div className={workspaceFilterLabelClass}>Estado</div>
                  <div className={workspaceFilterLabelClass}>Vencimiento</div>
                  <div className={`${workspaceFilterLabelClass} text-right`}> </div>
                </div>
                {grouped.map((g) => {
                  const chip = clientAggregateChip(g.aggregateStatus);
                  const avatarSeed = `${g.customerId}-${getAvatarVariant(null)}`;
                  return (
                    <Link
                      key={g.customerId}
                      href={`/creditos/cliente/${g.customerId}`}
                      className="grid grid-cols-[minmax(160px,2fr)_minmax(100px,1fr)_minmax(90px,0.9fr)_minmax(90px,0.9fr)_minmax(120px,1fr)_minmax(100px,0.85fr)_minmax(52px,auto)] gap-x-4 border-b border-slate-100 px-5 py-4 text-inherit no-underline transition-colors last:border-b-0 hover:bg-slate-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--shell-sidebar)] dark:border-zinc-800/60 dark:hover:bg-zinc-900/40 dark:focus-visible:outline-zinc-500"
                      aria-label={`${g.name}: ver créditos del cliente`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                          <WorkspaceCharacterAvatar seed={avatarSeed} size={80} className="h-full w-full object-cover" />
                        </div>
                        <span className="truncate text-[15px] font-medium text-slate-900 dark:text-slate-50">{g.name}</span>
                      </div>
                      <div className="self-center text-[13px] font-medium text-slate-700 dark:text-slate-200">
                        {g.invoiceCount} {g.invoiceCount === 1 ? "crédito" : "créditos"}
                      </div>
                      <div className="self-center text-right text-[13px] font-medium tabular-nums text-slate-900 dark:text-slate-50">
                        $ {formatMoney(g.totalAmount)}
                      </div>
                      <div className="self-center text-right text-[13px] font-medium tabular-nums text-slate-900 dark:text-slate-50">
                        $ {formatMoney(g.totalPending)}
                      </div>
                      <div className="self-center">
                        <span className={chip.className}>{chip.label}</span>
                      </div>
                      <div className="self-center text-[13px] font-medium text-slate-600 dark:text-slate-300">
                        {g.nextDue ? formatDateShort(g.nextDue) : "—"}
                      </div>
                      <div className="flex items-center justify-end" aria-hidden="true">
                        <span className={actionIconClass}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {grouped.length > 0 && (
              <div className="grid gap-3 xl:hidden">
                {grouped.map((g) => {
                  const chip = clientAggregateChip(g.aggregateStatus);
                  const avatarSeed = `${g.customerId}-${getAvatarVariant(null)}`;
                  return (
                    <Link
                      key={g.customerId}
                      href={`/creditos/cliente/${g.customerId}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                          <WorkspaceCharacterAvatar seed={avatarSeed} size={88} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-50">{g.name}</p>
                          <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                            {g.invoiceCount} {g.invoiceCount === 1 ? "crédito" : "créditos"}
                            {g.nextDue ? ` · Vence ${formatDateShort(g.nextDue)}` : ""}
                          </p>
                        </div>
                        <span className={chip.className}>{chip.label}</span>
                      </div>
                      <div className="mt-3 flex justify-between gap-2 border-t border-slate-200 pt-3 dark:border-zinc-800">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Total</p>
                          <p className="text-[14px] font-semibold tabular-nums">$ {formatMoney(g.totalAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Pendiente</p>
                          <p className="text-[14px] font-semibold tabular-nums">$ {formatMoney(g.totalPending)}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
