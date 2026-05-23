"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchWithSalesMode } from "@/lib/active-branch";

const REPORTS_SURFACE = "berea-reports-surface";

const bereaFieldClass =
  "h-11 w-full rounded-xl border border-[var(--shell-workspace-search-border)] bg-[var(--shell-workspace-search-bg)] text-[14px] text-[var(--berea-ink)] shadow-[inset_0_0_0_0.5px_rgba(44,40,36,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--berea-ink-muted)] focus:border-[rgba(44,40,36,0.22)] focus:ring-0 dark:border-[var(--shell-nav-border)] dark:bg-[var(--shell-nav-card-bg)] dark:text-[var(--shell-nav-fg)] dark:placeholder:text-[var(--shell-nav-fg-subtle)]";

const bereaFilterLabel = "block text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]";

const WARRANTY_LIST_SELECT = `
  *,
  customers(name),
  products:products!warranties_product_id_fkey(name),
  sales(invoice_number, created_at, branch_id),
  sale_items(unit_price, quantity),
  requested_by_user:users!warranties_requested_by_fkey(name),
  reviewed_by_user:users!warranties_reviewed_by_fkey(name),
  replacement_product:products!warranties_replacement_product_id_fkey(name)
`;

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

type WarrantyRow = {
  id: string;
  sale_id: string | null;
  sale_item_id: string | null;
  branch_id: string | null;
  quantity: number;
  customer_id: string;
  product_id: string;
  warranty_type: "exchange" | "refund" | "repair";
  reason: string;
  status: "pending" | "approved" | "rejected" | "processed";
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  replacement_product_id: string | null;
  created_at: string;
  updated_at: string;
  customers: { name: string } | null;
  products: { name: string } | null;
  sales: { invoice_number: string; created_at: string; branch_id?: string | null } | null;
  sale_items: { unit_price: number; quantity: number } | null;
  requested_by_user: { name: string } | null;
  reviewed_by_user: { name: string } | null;
  replacement_product: { name: string } | null;
};

const WARRANTY_TYPE_LABELS: Record<string, string> = {
  exchange: "Cambio",
  refund: "Devolución",
  repair: "Reparación",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  processed: "Procesada",
};

const BEREA_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-950 ring-amber-300",
  approved: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  rejected: "bg-rose-100 text-rose-900 ring-rose-300",
  processed: "bg-sky-100 text-sky-950 ring-sky-300",
};

const statusBadgeClass = (status: string) =>
  `inline-flex rounded-md px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset ${BEREA_STATUS_STYLES[status] ?? BEREA_STATUS_STYLES.pending}`;

type TypeFilter = "all" | "exchange" | "refund" | "repair";

function WarrantyFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: TypeFilter;
  onTypeChange: (value: TypeFilter) => void;
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
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por ID, cliente, producto o factura…"
          className={`${bereaFieldClass} py-2.5 pl-11 pr-4`}
        />
      </div>
      <div className="grid min-w-0 w-full grid-cols-2 gap-2 sm:gap-3 lg:w-auto lg:shrink-0 lg:gap-3">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="garantias-filter-status" className={bereaFilterLabel}>
            Estado
          </label>
          <select
            id="garantias-filter-status"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className={`${bereaFieldClass} px-3 font-medium`}
          >
            <option value="all">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="processed">Procesadas</option>
          </select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="garantias-filter-type" className={bereaFilterLabel}>
            Tipo
          </label>
          <select
            id="garantias-filter-type"
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value as TypeFilter)}
            className={`${bereaFieldClass} px-3 font-medium`}
          >
            <option value="all">Todos</option>
            <option value="exchange">Cambio</option>
            <option value="refund">Devolución</option>
            <option value="repair">Reparación</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default function WarrantiesPage() {
  const router = useRouter();
  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchQueryDebounced, setSearchQueryDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [activeBranchEpoch, setActiveBranchEpoch] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBranch = () => setActiveBranchEpoch((n) => n + 1);
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchQueryDebounced(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(null);
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setWarranties([]);
        setLoading(false);
        return;
      }

      const { branchId: currentBranchId } = await resolveActiveBranchWithSalesMode(supabase, user.id);
      if (cancelled) return;
      if (!currentBranchId) {
        setWarranties([]);
        setLoadError(null);
        setLoading(false);
        return;
      }

      const selectByBranch = WARRANTY_LIST_SELECT;
      const selectBySaleBranch = WARRANTY_LIST_SELECT.replace(
        "sales(invoice_number, created_at, branch_id)",
        "sales!inner(invoice_number, created_at, branch_id)"
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const applyListFilters = (base: any) => {
        let q = base;
        if (statusFilter !== "all") q = q.eq("status", statusFilter);
        if (typeFilter !== "all") q = q.eq("warranty_type", typeFilter);
        return q.order("created_at", { ascending: false });
      };

      const q1 = applyListFilters(
        supabase.from("warranties").select(selectByBranch).eq("branch_id", currentBranchId)
      );
      const q2 = applyListFilters(
        supabase
          .from("warranties")
          .select(selectBySaleBranch)
          .not("sale_id", "is", null)
          .eq("sales.branch_id", currentBranchId)
      );

      const [{ data: byDirectBranch, error: err1 }, { data: bySaleBranch, error: err2 }] = await Promise.all([q1, q2]);
      if (cancelled) return;
      const error = err1 || err2;
      if (error) {
        console.error("Error loading warranties:", err1, err2);
        setLoadError((error as { message?: string }).message || "Error al cargar garantías");
        setWarranties([]);
        setLoading(false);
        return;
      }

      const byId = new Map<string, WarrantyRow>();
      for (const w of (byDirectBranch ?? []) as WarrantyRow[]) {
        if (!byId.has(w.id)) byId.set(w.id, w);
      }
      for (const w of (bySaleBranch ?? []) as WarrantyRow[]) {
        if (!byId.has(w.id)) byId.set(w.id, w);
      }
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setWarranties(merged);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, typeFilter, activeBranchEpoch]);

  const filteredWarranties = useMemo(() => {
    return warranties.filter((w) => {
      const q = searchQueryDebounced.trim().toLowerCase();
      if (q) {
        const matchId = w.id.toLowerCase().includes(q) || w.id.slice(0, 8).toUpperCase().includes(q.toUpperCase());
        const matchCustomer = w.customers?.name?.toLowerCase().includes(q);
        const matchProduct = w.products?.name?.toLowerCase().includes(q);
        const matchInvoice = w.sales?.invoice_number?.toLowerCase().includes(q);
        if (!matchId && !matchCustomer && !matchProduct && !matchInvoice) return false;
      }
      return true;
    });
  }, [warranties, searchQueryDebounced]);

  const actionIconClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--berea-ink-subtle)] transition-colors hover:bg-[var(--shell-workspace)] hover:text-[var(--berea-accent)]";

  const filterProps = {
    searchQuery,
    onSearchChange: setSearchQuery,
    statusFilter,
    onStatusChange: setStatusFilter,
    typeFilter,
    onTypeChange: setTypeFilter,
  };

  return (
    <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 text-[15px] text-[var(--berea-ink)] sm:space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">
            Garantías de productos
          </h1>
          <p className="mt-0.5 text-[14px] text-[var(--berea-ink-muted)]">
            Gestiona solicitudes, revisa estados y procesa cambios o devoluciones.
          </p>
        </div>
        <Link
          href="/garantias/nueva"
          className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] lg:self-center"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva garantía
        </Link>
      </header>

      {loadError && (
        <div className={`rounded-xl px-6 py-10 text-center ${REPORTS_SURFACE}`}>
          <p className="text-[15px] font-semibold text-amber-900">Error al cargar garantías</p>
          <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">{loadError}</p>
          <p className="mt-3 text-[12px] text-[var(--berea-ink-subtle)]">
            Comprueba que tu usuario tenga sucursal asignada y permisos. Si el error continúa, revisa la consola del navegador.
          </p>
        </div>
      )}

      <section className="outline-none">
        {loading ? (
          <div className={`min-h-[280px] animate-pulse rounded-xl ${REPORTS_SURFACE}`} aria-hidden />
        ) : filteredWarranties.length === 0 ? (
          <div className={`space-y-6 rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}`}>
            <WarrantyFilters {...filterProps} />
            <div className="px-2 py-8 text-center sm:px-4">
              <p className="text-[15px] font-semibold text-[var(--berea-ink)]">
                {warranties.length === 0
                  ? statusFilter === "all"
                    ? "Aún no hay garantías registradas"
                    : `No hay garantías con estado "${STATUS_LABELS[statusFilter]}"`
                  : "Ninguna garantía coincide con la búsqueda o filtros"}
              </p>
              <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">
                {warranties.length === 0
                  ? statusFilter === "all"
                    ? "Registra tu primera garantía para verla aquí."
                    : "Prueba cambiando el filtro de estado."
                  : "Prueba cambiando la búsqueda, el estado o el tipo de garantía."}
              </p>
              {statusFilter === "all" && warranties.length === 0 && (
                <Link
                  href="/garantias/nueva"
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
                >
                  Nueva garantía
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className={`space-y-6 rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}`}>
            <WarrantyFilters {...filterProps} />

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[880px] border-collapse text-left text-[14px] leading-relaxed">
                <thead>
                  <tr className="border-b border-[var(--berea-card-border)] text-[13px] text-[var(--berea-ink-muted)]">
                    <th className="pb-3 pr-4 font-semibold">Garantía</th>
                    <th className="pb-3 pr-4 font-semibold">Fecha</th>
                    <th className="pb-3 pr-4 font-semibold">Cliente</th>
                    <th className="pb-3 pr-4 font-semibold">Producto</th>
                    <th className="pb-3 pr-4 font-semibold">Tipo</th>
                    <th className="pb-3 pr-4 font-semibold">Estado</th>
                    <th className="pb-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarranties.map((warranty) => (
                    <tr
                      key={warranty.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/garantias/${warranty.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/garantias/${warranty.id}`);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-[var(--shell-workspace)]/70"
                    >
                      <td className="py-4 pr-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <svg className="h-5 w-5 shrink-0 text-[var(--berea-ink-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span className="truncate text-[15px] font-semibold tabular-nums text-[var(--berea-ink)]">
                            #{warranty.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-[var(--berea-ink-muted)]">
                        {formatTime(warranty.created_at)} · {formatDateShort(warranty.created_at)}
                      </td>
                      <td className="max-w-[12rem] truncate py-4 pr-4 font-medium text-[var(--berea-ink)]">
                        {warranty.customers?.name ?? "Cliente"}
                      </td>
                      <td className="max-w-[12rem] truncate py-4 pr-4 text-[var(--berea-ink-muted)]">
                        {warranty.products?.name ?? "Producto"}
                      </td>
                      <td className="py-4 pr-4 font-medium text-[var(--berea-ink)]">
                        {WARRANTY_TYPE_LABELS[warranty.warranty_type]}
                      </td>
                      <td className="py-4 pr-4">
                        <span className={statusBadgeClass(warranty.status)}>{STATUS_LABELS[warranty.status]}</span>
                      </td>
                      <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/garantias/${warranty.id}`} className={actionIconClass} aria-label="Ver detalle">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 xl:hidden">
              {filteredWarranties.map((warranty) => (
                <div
                  key={warranty.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/garantias/${warranty.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/garantias/${warranty.id}`);
                    }
                  }}
                  className="cursor-pointer rounded-xl border border-[var(--berea-card-border)] bg-[var(--shell-workspace)] px-5 py-4 transition-colors hover:bg-white"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[15px] font-semibold tabular-nums text-[var(--berea-ink)]">
                        #{warranty.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={statusBadgeClass(warranty.status)}>{STATUS_LABELS[warranty.status]}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={bereaFilterLabel}>Fecha</span>
                      <span className="text-[14px] text-[var(--berea-ink-muted)]">
                        {formatTime(warranty.created_at)} · {formatDateShort(warranty.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={bereaFilterLabel}>Cliente</span>
                      <span className="truncate text-right text-[14px] font-medium text-[var(--berea-ink)]">
                        {warranty.customers?.name ?? "Cliente"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={bereaFilterLabel}>Producto</span>
                      <span className="truncate text-right text-[14px] font-medium text-[var(--berea-ink)]">
                        {warranty.products?.name ?? "Producto"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-[var(--berea-card-border)] pt-3">
                      <span className={bereaFilterLabel}>Tipo</span>
                      <span className="text-[14px] font-medium text-[var(--berea-ink)]">
                        {WARRANTY_TYPE_LABELS[warranty.warranty_type]}
                      </span>
                    </div>
                    <div className="flex justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/garantias/${warranty.id}`} className={actionIconClass} aria-label="Ver detalle">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
