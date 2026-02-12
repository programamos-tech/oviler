"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  sales: { invoice_number: string; created_at: string } | null;
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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300" },
  approved: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300" },
  rejected: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300" },
  processed: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
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

      let q = supabase
        .from("warranties")
        .select(`
          *,
          customers(name),
          products:products!warranties_product_id_fkey(name),
          sales(invoice_number, created_at),
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
        setWarranties((warrantiesData ?? []) as WarrantyRow[]);
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

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Garantías" }]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Garantías de productos
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Gestiona las garantías de productos vendidos: registra solicitudes, revisa estados y procesa cambios o devoluciones.
            </p>
          </div>
          <Link
            href="/garantias/nueva"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva garantía
          </Link>
        </div>
      </header>

      {loadError && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-medium">Error al cargar garantías</p>
          <p className="mt-1 text-[13px]">{loadError}</p>
          <p className="mt-2 text-[12px] opacity-90">Comprueba que tu usuario tenga sucursal asignada y permisos. Si el error continúa, revisa la consola del navegador.</p>
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1 min-w-0 max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID, cliente, producto o factura..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-[14px] text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">Estado:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
              <option value="processed">Procesadas</option>
            </select>
            <label className="ml-2 text-[13px] font-medium text-slate-600 dark:text-slate-400 sm:ml-0">Tipo:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Todos</option>
              <option value="exchange">Cambio</option>
              <option value="refund">Devolución</option>
              <option value="repair">Reparación</option>
            </select>
          </div>
        </div>
      )}

      <section className="space-y-3">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400">Cargando garantías...</p>
          </div>
        ) : filteredWarranties.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
              {warranties.length === 0
                ? (statusFilter === "all" ? "Aún no hay garantías registradas" : `No hay garantías con estado "${STATUS_LABELS[statusFilter]}"`)
                : "Ninguna garantía coincide con la búsqueda o filtros"}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {warranties.length === 0
                ? (statusFilter === "all" ? "Registra tu primera garantía para verla aquí." : "Prueba cambiando el filtro de estado.")
                : "Prueba cambiando la búsqueda, el estado o el tipo de garantía."}
            </p>
            {statusFilter === "all" && (
              <Link
                href="/garantias/nueva"
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
              >
                Nueva garantía
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWarranties.map((warranty) => {
              const statusColor = STATUS_COLORS[warranty.status];
              return (
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
                  className="rounded-xl shadow-sm ring-1 cursor-pointer transition-all bg-white ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-[0.75fr_0.9fr_1.2fr_1fr_1fr_1fr_auto] gap-x-3 gap-y-2 sm:gap-x-4 sm:gap-y-0 items-center px-4 py-3 sm:px-5 sm:py-4">
                    <div className="col-span-2 sm:col-span-1 min-w-0 flex items-center gap-2">
                      <svg className="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <p className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tabular-nums truncate">
                        #{warranty.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="min-w-0 flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0 text-slate-500 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200">
                        {formatTime(warranty.created_at)} · {formatDateShort(warranty.created_at)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                        {warranty.customers?.name ?? "Cliente"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200 truncate">
                        {warranty.products?.name ?? "Producto"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">
                        {WARRANTY_TYPE_LABELS[warranty.warranty_type]}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[14px] font-bold ${statusColor.text}`}>
                        {STATUS_LABELS[warranty.status]}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                      <span className="group relative inline-flex" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/garantias/${warranty.id}`}
                          className="inline-flex shrink-0 items-center justify-center p-1 text-ov-pink hover:text-ov-pink-hover dark:text-ov-pink dark:hover:text-ov-pink-hover"
                          aria-label="Ver detalle"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-slate-700">
                          Ver detalle
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
