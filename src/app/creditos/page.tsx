"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import { getAvatarVariant } from "@/app/components/app-nav-data";
import {
  clientAggregateChip,
  clientAggregateStatusFromCredits,
  creditRowPending,
  formatDateShort,
  formatMoney,
  type ClientAggregateStatus,
  type CreditStatus,
} from "./credit-ui";

const REPORTS_SURFACE = "berea-reports-surface";

const bereaFieldClass =
  "h-11 w-full rounded-xl border border-[var(--shell-workspace-search-border)] bg-[var(--shell-workspace-search-bg)] text-[14px] text-[var(--berea-ink)] shadow-[inset_0_0_0_0.5px_rgba(44,40,36,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--berea-ink-muted)] focus:border-[rgba(44,40,36,0.22)] focus:ring-0 dark:border-[var(--shell-nav-border)] dark:bg-[var(--shell-nav-card-bg)] dark:text-[var(--shell-nav-fg)] dark:placeholder:text-[var(--shell-nav-fg-subtle)]";

const bereaFilterLabel = "block text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]";

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

function CreditFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: CreditStatusFilter;
  onStatusChange: (value: CreditStatusFilter) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
      <div className="relative min-w-0 w-full lg:min-w-0 lg:flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--berea-ink-muted)]">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar cliente…"
          className={`${bereaFieldClass} py-2.5 pl-11 pr-4`}
          aria-label="Filtrar por nombre de cliente"
        />
      </div>
      <div className="w-full min-w-0 space-y-1.5 sm:w-[11rem] sm:shrink-0 lg:w-[12rem]">
        <label htmlFor="creditos-filter-estado" className={bereaFilterLabel}>
          Estado
        </label>
        <select
          id="creditos-filter-estado"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as CreditStatusFilter)}
          className={`${bereaFieldClass} px-3 font-medium`}
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
  );
}

export default function CreditosPage() {
  const router = useRouter();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [rows, setRows] = useState<CreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<CreditStatusFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeBranchEpoch, setActiveBranchEpoch] = useState(0);
  const fetchRequestId = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBranch = () => {
      setActiveBranchEpoch((n) => n + 1);
    };
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

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
      const currentBranch = await resolveActiveBranchId(supabase, user.id);
      if (!currentBranch || cancelled || reqId !== fetchRequestId.current) {
        if (!cancelled && reqId === fetchRequestId.current) {
          setBranchId(null);
          setRows([]);
          setLoading(false);
        }
        return;
      }
      if (cancelled || reqId !== fetchRequestId.current) return;
      setBranchId(currentBranch);
      const { data, error: qErr } = await supabase
        .from("customer_credits")
        .select("id, customer_id, total_amount, amount_paid, due_date, status, cancelled_at, customers(id, name)")
        .eq("branch_id", currentBranch)
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
  }, [refreshKey, activeBranchEpoch]);

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
    const q = searchDebounced.trim().toLowerCase();
    let next = !q ? out : out.filter((g) => g.name.toLowerCase().includes(q) || g.customerId.toLowerCase().includes(q));
    if (statusFilter !== "all") {
      next = next.filter((g) => g.aggregateStatus === statusFilter);
    }
    return next;
  }, [rows, searchDebounced, statusFilter]);

  const actionIconClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--berea-ink-subtle)] transition-colors hover:bg-[var(--shell-workspace)] hover:text-[var(--berea-accent)]";

  const filterProps = {
    search,
    onSearchChange: setSearch,
    statusFilter,
    onStatusChange: setStatusFilter,
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 text-[15px] text-[var(--berea-ink)] sm:space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">
            Créditos a clientes
          </h1>
          <p className="mt-0.5 text-[14px] text-[var(--berea-ink-muted)]">
            Resumen por cliente de esta sucursal. Entra al detalle para ver cada crédito y registrar abonos.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRefreshKey((k) => k + 1);
            }}
            disabled={loading}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold text-[var(--berea-ink)] hover:bg-[var(--shell-workspace)] disabled:pointer-events-none disabled:opacity-50 ${REPORTS_SURFACE}`}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
          <Link
            href="/creditos/nuevo"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo crédito
          </Link>
        </div>
      </header>

      {error && (
        <div className={`rounded-xl px-6 py-10 text-center ${REPORTS_SURFACE}`}>
          <p className="text-[15px] font-semibold text-amber-900">Error al cargar créditos</p>
          <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">{error}</p>
        </div>
      )}

      <section className="outline-none">
        {loading ? (
          <div className={`min-h-[280px] animate-pulse rounded-xl ${REPORTS_SURFACE}`} aria-hidden />
        ) : !branchId ? (
          <div className={`rounded-xl px-6 py-10 text-center ${REPORTS_SURFACE}`}>
            <p className="text-[15px] font-semibold text-[var(--berea-ink)]">No tienes sucursal asignada</p>
            <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">
              Asigna una sucursal a tu usuario para ver los créditos de clientes.
            </p>
          </div>
        ) : (
          <div className={`space-y-6 rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}`}>
            <CreditFilters {...filterProps} />

            {rows.length === 0 ? (
              <div className="px-2 py-8 text-center sm:px-4">
                <p className="text-[15px] font-semibold text-[var(--berea-ink)]">Aún no hay créditos</p>
                <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">
                  Crea un crédito vinculado a un cliente para verlo aquí.
                </p>
                <Link
                  href="/creditos/nuevo"
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
                >
                  Nuevo crédito
                </Link>
              </div>
            ) : grouped.length === 0 ? (
              <div className="px-2 py-8 text-center sm:px-4">
                <p className="text-[15px] font-semibold text-[var(--berea-ink)]">Sin resultados</p>
                <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">
                  Prueba otro nombre o ajusta el filtro de estado.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`mt-5 inline-flex h-10 items-center justify-center rounded-lg px-4 text-[13px] font-semibold text-[var(--berea-ink)] hover:bg-[var(--shell-workspace)] ${REPORTS_SURFACE}`}
                >
                  Limpiar búsqueda y filtros
                </button>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto xl:block">
                  <table className="w-full min-w-[920px] border-collapse text-left text-[14px] leading-relaxed">
                    <thead>
                      <tr className="border-b border-[var(--berea-card-border)] text-[13px] text-[var(--berea-ink-muted)]">
                        <th className="pb-3 pr-4 font-semibold">Cliente</th>
                        <th className="pb-3 pr-4 font-semibold">Créditos</th>
                        <th className="pb-3 pr-4 text-right font-semibold">Total</th>
                        <th className="pb-3 pr-4 text-right font-semibold">Pendiente</th>
                        <th className="pb-3 pr-4 font-semibold">Estado</th>
                        <th className="pb-3 pr-4 font-semibold">Vencimiento</th>
                        <th className="pb-3 text-right font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.map((g) => {
                        const chip = clientAggregateChip(g.aggregateStatus);
                        const avatarSeed = `${g.customerId}-${getAvatarVariant(null)}`;
                        return (
                          <tr
                            key={g.customerId}
                            role="link"
                            tabIndex={0}
                            className="cursor-pointer transition-colors hover:bg-[var(--shell-workspace)]/70"
                            onClick={() => router.push(`/creditos/cliente/${g.customerId}`)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(`/creditos/cliente/${g.customerId}`);
                              }
                            }}
                          >
                            <td className="py-4 pr-4">
                              <Link
                                href={`/creditos/cliente/${g.customerId}`}
                                className="flex min-w-0 items-center gap-3 text-inherit no-underline"
                                aria-label={`${g.name}: ver créditos del cliente`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--shell-workspace)]">
                                  <WorkspaceCharacterAvatar seed={avatarSeed} size={80} className="h-full w-full object-cover" />
                                </div>
                                <span className="truncate text-[15px] font-semibold text-[var(--berea-ink)]">{g.name}</span>
                              </Link>
                            </td>
                            <td className="py-4 pr-4 font-medium text-[var(--berea-ink)]">
                              {g.invoiceCount} {g.invoiceCount === 1 ? "crédito" : "créditos"}
                            </td>
                            <td className="py-4 pr-4 text-right font-semibold tabular-nums text-[var(--berea-ink)]">
                              ${formatMoney(g.totalAmount)}
                            </td>
                            <td className="py-4 pr-4 text-right font-semibold tabular-nums text-[var(--berea-ink)]">
                              ${formatMoney(g.totalPending)}
                            </td>
                            <td className="py-4 pr-4">
                              <span className={chip.className}>{chip.label}</span>
                            </td>
                            <td className="py-4 pr-4 text-[var(--berea-ink-muted)]">
                              {g.nextDue ? formatDateShort(g.nextDue) : "—"}
                            </td>
                            <td className="py-4 text-right">
                              <Link
                                href={`/creditos/cliente/${g.customerId}`}
                                className={actionIconClass}
                                aria-label={`Ver créditos de ${g.name}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 pt-2 sm:grid-cols-2 xl:hidden">
                  {grouped.map((g) => {
                    const chip = clientAggregateChip(g.aggregateStatus);
                    const avatarSeed = `${g.customerId}-${getAvatarVariant(null)}`;
                    return (
                      <Link
                        key={g.customerId}
                        href={`/creditos/cliente/${g.customerId}`}
                        className="rounded-xl border border-[var(--berea-card-border)] bg-[var(--shell-workspace)] p-5 transition-colors hover:bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[var(--shell-workspace)] ring-1 ring-[var(--berea-card-border)]">
                            <WorkspaceCharacterAvatar seed={avatarSeed} size={88} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-[var(--berea-ink)]">{g.name}</p>
                            <p className="mt-0.5 text-[13px] text-[var(--berea-ink-muted)]">
                              {g.invoiceCount} {g.invoiceCount === 1 ? "crédito" : "créditos"}
                              {g.nextDue ? ` · Vence ${formatDateShort(g.nextDue)}` : ""}
                            </p>
                          </div>
                          <span className={chip.className}>{chip.label}</span>
                        </div>
                        <div className="mt-3 flex justify-between gap-2 border-t border-[var(--berea-card-border)] pt-3">
                          <div>
                            <p className={bereaFilterLabel}>Total</p>
                            <p className="mt-1 text-[15px] font-bold tabular-nums text-[var(--berea-ink)]">
                              ${formatMoney(g.totalAmount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={bereaFilterLabel}>Pendiente</p>
                            <p className="mt-1 text-[15px] font-bold tabular-nums text-[var(--berea-ink)]">
                              ${formatMoney(g.totalPending)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
