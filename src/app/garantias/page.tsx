"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  workspaceFilterLabelClass,
  workspaceFilterSearchPillClass,
  workspaceFilterSelectClass,
} from "@/lib/workspace-field-classes";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

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

const STATUS_CHIP_CLASS: Record<string, string> = {
  pending:
    "inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12px] font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200",
  approved:
    "inline-flex max-w-full items-center rounded-full border border-nou-200 bg-nou-50 px-2 py-0.5 text-[12px] font-medium text-nou-900 dark:border-emerald-900/45 dark:bg-emerald-950/30 dark:text-emerald-100",
  rejected:
    "inline-flex max-w-full items-center rounded-full border border-red-200/90 bg-red-50/90 px-2 py-0.5 text-[12px] font-medium text-red-800 dark:border-red-900/55 dark:bg-red-950/35 dark:text-red-200",
  processed:
    "inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12px] font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
};

type TypeFilter = "all" | "exchange" | "refund" | "repair";

export default function WarrantiesPage() {
  const router = useRouter();
  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const { data: ub } = await supabase
        .from("user_branches")
        .select("branch_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (!ub?.branch_id || cancelled) {
        setWarranties([]);
        setLoading(false);
        return;
      }
      const currentBranchId = ub.branch_id;

      let q = supabase
        .from("warranties")
        .select(`
          *,
          customers(name),
          products:products!warranties_product_id_fkey(name),
          sales(invoice_number, created_at, branch_id),
          sale_items(unit_price, quantity),
          requested_by_user:users!warranties_requested_by_fkey(name),
          reviewed_by_user:users!warranties_reviewed_by_fkey(name),
          replacement_product:products!warranties_replacement_product_id_fkey(name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        q = q.eq("status", statusFilter);
      }

      const { data: warrantiesData, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error("Error loading warranties:", error);
        setLoadError(error.message || "Error al cargar garantías");
        setWarranties([]);
      } else {
        const scoped = ((warrantiesData ?? []) as WarrantyRow[]).filter((w) => {
          const saleBranchId = w.sales?.branch_id ?? null;
          return w.branch_id === currentBranchId || saleBranchId === currentBranchId;
        });
        setWarranties(scoped);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  const filteredWarranties = warranties.filter((w) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const matchId = w.id.toLowerCase().includes(q) || w.id.slice(0, 8).toUpperCase().includes(q.toUpperCase());
      const matchCustomer = w.customers?.name?.toLowerCase().includes(q);
      const matchProduct = w.products?.name?.toLowerCase().includes(q);
      const matchInvoice = w.sales?.invoice_number?.toLowerCase().includes(q);
      if (!matchId && !matchCustomer && !matchProduct && !matchInvoice) return false;
    }
    if (typeFilter !== "all" && w.warranty_type !== typeFilter) return false;
    return true;
  });

  const actionIconClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-[color:var(--shell-sidebar)] dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-zinc-300";

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Garantías de productos
            </h1>
            <p className="mt-1 text-left text-[13px] font-medium leading-snug text-pretty text-slate-500 dark:text-slate-400">
              Gestiona las garantías de productos vendidos: registra solicitudes, revisa estados y procesa cambios o devoluciones.
            </p>
          </div>
          <Link
            href="/garantias/nueva"
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:w-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva garantía
          </Link>
        </div>
      </header>

      {loadError && (
        <div className="rounded-3xl border border-amber-200/80 bg-white px-6 py-10 text-center dark:border-amber-900/35 dark:bg-slate-900">
          <p className="text-[15px] font-semibold text-amber-900 dark:text-amber-200">Error al cargar garantías</p>
          <p className="mt-2 text-[13px] font-medium text-amber-800/95 dark:text-amber-300/95">{loadError}</p>
          <p className="mt-3 text-[12px] font-medium text-slate-500 dark:text-slate-400">
            Comprueba que tu usuario tenga sucursal asignada y permisos. Si el error continúa, revisa la consola del navegador.
          </p>
        </div>
      )}

      <section className="outline-none">
        {loading ? (
          <div className="min-h-[280px] animate-pulse rounded-3xl bg-white dark:bg-slate-900" aria-hidden />
        ) : filteredWarranties.length === 0 ? (
          <div className="space-y-6 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:flex-nowrap md:items-end md:gap-2 md:overflow-x-auto md:pb-0.5 md:[scrollbar-width:thin] lg:gap-3 lg:overflow-visible xl:gap-3">
              <div className="relative min-w-0 md:min-w-[14rem] md:flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por ID, cliente, producto o factura..."
                  className={workspaceFilterSearchPillClass}
                />
              </div>
              <div className="w-full shrink-0 space-y-1.5 md:w-[9rem] lg:w-[9.25rem] xl:w-[10rem]">
                <label className={workspaceFilterLabelClass}>Estado</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={workspaceFilterSelectClass}>
                  <option value="all">Todas</option>
                  <option value="pending">Pendientes</option>
                  <option value="approved">Aprobadas</option>
                  <option value="rejected">Rechazadas</option>
                  <option value="processed">Procesadas</option>
                </select>
              </div>
              <div className="w-full shrink-0 space-y-1.5 md:w-[9rem] lg:w-[9.25rem] xl:w-[10rem]">
                <label className={workspaceFilterLabelClass}>Tipo</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className={workspaceFilterSelectClass}>
                  <option value="all">Todos</option>
                  <option value="exchange">Cambio</option>
                  <option value="refund">Devolución</option>
                  <option value="repair">Reparación</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-slate-700">
              <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200">
                {warranties.length === 0
                  ? (statusFilter === "all" ? "Aún no hay garantías registradas" : `No hay garantías con estado "${STATUS_LABELS[statusFilter]}"`)
                  : "Ninguna garantía coincide con la búsqueda o filtros"}
              </p>
              <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {warranties.length === 0
                  ? (statusFilter === "all" ? "Registra tu primera garantía para verla aquí." : "Prueba cambiando el filtro de estado.")
                  : "Prueba cambiando la búsqueda, el estado o el tipo de garantía."}
              </p>
              {statusFilter === "all" && (
                <Link
                  href="/garantias/nueva"
                  className="mt-6 inline-flex h-9 items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
                >
                  Nueva garantía
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:flex-nowrap md:items-end md:gap-2 md:overflow-x-auto md:pb-0.5 md:[scrollbar-width:thin] lg:gap-3 lg:overflow-visible xl:gap-3">
              <div className="relative min-w-0 md:min-w-[14rem] md:flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por ID, cliente, producto o factura..."
                  className={workspaceFilterSearchPillClass}
                />
              </div>
              <div className="w-full shrink-0 space-y-1.5 md:w-[9rem] lg:w-[9.25rem] xl:w-[10rem]">
                <label className={workspaceFilterLabelClass}>Estado</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={workspaceFilterSelectClass}>
                  <option value="all">Todas</option>
                  <option value="pending">Pendientes</option>
                  <option value="approved">Aprobadas</option>
                  <option value="rejected">Rechazadas</option>
                  <option value="processed">Procesadas</option>
                </select>
              </div>
              <div className="w-full shrink-0 space-y-1.5 md:w-[9rem] lg:w-[9.25rem] xl:w-[10rem]">
                <label className={workspaceFilterLabelClass}>Tipo</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className={workspaceFilterSelectClass}>
                  <option value="all">Todos</option>
                  <option value="exchange">Cambio</option>
                  <option value="refund">Devolución</option>
                  <option value="repair">Reparación</option>
                </select>
              </div>
            </div>

            <>
              <div className="hidden overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 xl:block">
                <div className="grid grid-cols-[minmax(120px,1fr)_1fr_minmax(130px,1.2fr)_minmax(130px,1.2fr)_minmax(90px,0.8fr)_minmax(90px,0.9fr)_auto] gap-x-6 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
                  <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Garantía</div>
                  <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Fecha</div>
                  <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cliente</div>
                  <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Producto</div>
                  <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tipo</div>
                  <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Estado</div>
                  <div className="min-w-0 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Acciones</div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
                      className="grid cursor-pointer grid-cols-[minmax(120px,1fr)_1fr_minmax(130px,1.2fr)_minmax(130px,1.2fr)_minmax(90px,0.8fr)_minmax(90px,0.9fr)_auto] gap-x-6 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/55"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <svg className="h-4.5 w-4.5 shrink-0 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="truncate text-[14px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">#{warranty.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 text-[14px] font-medium text-slate-700 dark:text-slate-200">
                        {formatTime(warranty.created_at)} · {formatDateShort(warranty.created_at)}
                      </div>
                      <div className="min-w-0 truncate text-[15px] font-medium text-slate-900 dark:text-slate-50">{warranty.customers?.name ?? "Cliente"}</div>
                      <div className="min-w-0 truncate text-[14px] font-medium text-slate-700 dark:text-slate-200">{warranty.products?.name ?? "Producto"}</div>
                      <div className="min-w-0 text-[14px] font-medium text-slate-700 dark:text-slate-200">{WARRANTY_TYPE_LABELS[warranty.warranty_type]}</div>
                      <div className="min-w-0">
                        <span className={STATUS_CHIP_CLASS[warranty.status]}>{STATUS_LABELS[warranty.status]}</span>
                      </div>
                      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/garantias/${warranty.id}`} className={actionIconClass} aria-label="Ver detalle">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:hidden">
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
                    className="cursor-pointer rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">#{warranty.id.slice(0, 8).toUpperCase()}</span>
                        <span className={STATUS_CHIP_CLASS[warranty.status]}>{STATUS_LABELS[warranty.status]}</span>
                      </div>
                      <div className="text-[13px] text-slate-600 dark:text-slate-300">
                        {formatTime(warranty.created_at)} · {formatDateShort(warranty.created_at)}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="text-slate-500 dark:text-slate-400">Cliente</span>
                        <span className="truncate font-medium text-slate-900 dark:text-slate-50">{warranty.customers?.name ?? "Cliente"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="text-slate-500 dark:text-slate-400">Producto</span>
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{warranty.products?.name ?? "Producto"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="text-slate-500 dark:text-slate-400">Tipo</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{WARRANTY_TYPE_LABELS[warranty.warranty_type]}</span>
                      </div>
                      <div className="flex justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/garantias/${warranty.id}`} className={actionIconClass} aria-label="Ver detalle">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          </div>
        )}
      </section>

    </div>
  );
}
