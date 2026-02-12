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

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function getTimeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
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

export default function WarrantiesPage() {
  const router = useRouter();
  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

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

  const handleApprove = async (warrantyId: string) => {
    setApprovingId(warrantyId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("warranties")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", warrantyId);

    if (error) {
      alert("Error al aprobar la garantía: " + error.message);
    } else {
      setWarranties((w) =>
        w.map((warranty) =>
          warranty.id === warrantyId
            ? {
                ...warranty,
                status: "approved",
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                reviewed_by_user: { name: user.email?.split("@")[0] || "Usuario" },
              }
            : warranty
        )
      );
    }
    setApprovingId(null);
  };

  const handleReject = async (warrantyId: string) => {
    if (!rejectionReason.trim()) {
      alert("Debes ingresar un motivo de rechazo");
      return;
    }
    setRejectingId(warrantyId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("warranties")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason.trim(),
      })
      .eq("id", warrantyId);

    if (error) {
      alert("Error al rechazar la garantía: " + error.message);
    } else {
      setWarranties((w) =>
        w.map((warranty) =>
          warranty.id === warrantyId
            ? {
                ...warranty,
                status: "rejected",
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                rejection_reason: rejectionReason.trim(),
                reviewed_by_user: { name: user.email?.split("@")[0] || "Usuario" },
              }
            : warranty
        )
      );
      setShowRejectModal(null);
      setRejectionReason("");
    }
    setRejectingId(null);
  };

  const handleProcess = async (warrantyId: string) => {
    setProcessingId(warrantyId);
    const supabase = createClient();
    const warranty = warranties.find((w) => w.id === warrantyId);
    if (!warranty) return;

    const { data: ub } = await supabase
      .from("user_branches")
      .select("branch_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .limit(1)
      .single();
    const branchId = warranty.branch_id ?? ub?.branch_id;

    try {
      // Actualizar status a processed
      const { error: updateError } = await supabase
        .from("warranties")
        .update({ status: "processed" })
        .eq("id", warrantyId);

      if (updateError) throw updateError;

      // Si es cambio, descontar stock del producto de reemplazo
      if (warranty.warranty_type === "exchange" && warranty.replacement_product_id && branchId) {
        if (branchIdForInv) {
          // Obtener stock actual
          const { data: currentInventory } = await supabase
            .from("inventory")
            .select("quantity")
            .eq("product_id", warranty.replacement_product_id)
            .eq("branch_id", branchIdForInv)
            .single();

          const currentQty = currentInventory?.quantity || 0;
          const qtyToDeduct = warranty.sale_items?.quantity ?? warranty.quantity ?? 1;
          const newQty = Math.max(0, currentQty - qtyToDeduct);

          // Actualizar inventario
          const { error: inventoryError } = await supabase
            .from("inventory")
            .upsert({
              product_id: warranty.replacement_product_id,
              branch_id: branchIdForInv,
              quantity: newQty,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "product_id,branch_id"
            });

          if (inventoryError) {
            console.error("Error updating inventory:", inventoryError);
            // Continuar aunque falle el inventario
          }
        }
      }

      // Crear registro en defective_products automáticamente
      if (branchId) {
        const qty = warranty.sale_items?.quantity ?? warranty.quantity ?? 1;
        const { error: defectiveError } = await supabase.from("defective_products").insert({
          warranty_id: warrantyId,
          product_id: warranty.product_id,
          branch_id: branchId,
          quantity: qty,
          defect_description: warranty.reason,
        });

        if (defectiveError) {
          console.error("Error creating defective product:", defectiveError);
          alert("La garantía se procesó pero hubo un error al registrar el producto defectuoso: " + defectiveError.message);
        }
      }

      setWarranties((w) =>
        w.map((warranty) =>
          warranty.id === warrantyId ? { ...warranty, status: "processed" } : warranty
        )
      );
    } catch (error: any) {
      alert("Error al procesar la garantía: " + error.message);
    }
    setProcessingId(null);
  };

  const filteredWarranties = warranties;

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

      {!loading && warranties.length > 0 && (
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
              {statusFilter === "all" ? "Aún no hay garantías registradas" : `No hay garantías con estado "${STATUS_LABELS[statusFilter]}"`}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {statusFilter === "all" ? "Registra tu primera garantía para verla aquí." : "Prueba cambiando el filtro de estado."}
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
          filteredWarranties.map((warranty) => {
            const statusColor = STATUS_COLORS[warranty.status];
            const saleDate = warranty.sales?.created_at ? new Date(warranty.sales.created_at) : null;
            const daysSinceSale = saleDate ? Math.floor((new Date().getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
            const productValue = warranty.sale_items ? warranty.sale_items.unit_price * warranty.sale_items.quantity : 0;

            return (
              <details
                key={warranty.id}
                className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4">
                  <div className="flex w-28 items-center gap-2 text-[13px] font-bold text-slate-600 dark:text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {getTimeAgo(warranty.created_at)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50 truncate">
                      {warranty.customers?.name ?? "Cliente"}
                    </p>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {warranty.products?.name ?? "Producto"}
                      {warranty.sale_id ? ` · Comprado hace ${daysSinceSale !== null ? daysSinceSale : 0} día${daysSinceSale !== 1 ? "s" : ""}` : " · Por producto"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-bold ${statusColor.bg} ${statusColor.text}`}>
                    {warranty.status === "pending" && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {warranty.status === "approved" && (
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {warranty.status === "rejected" && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {warranty.status === "processed" && (
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {STATUS_LABELS[warranty.status]}
                  </span>
                  <Link
                    href={`/garantias/${warranty.id}`}
                    className="w-32 text-right text-[15px] font-bold text-ov-pink hover:underline"
                  >
                    #{warranty.id.slice(0, 8).toUpperCase()} · Ver detalle
                  </Link>
                </summary>
                <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">Información de la garantía</p>
                      <div className="space-y-2 text-[13px]">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span className="font-bold">Producto:</span>
                          <span className="text-slate-600 dark:text-slate-400">{warranty.products?.name ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-bold">Cliente:</span>
                          <span className="text-slate-600 dark:text-slate-400">{warranty.customers?.name ?? "—"}</span>
                        </div>
                        {warranty.sale_id && (
                          <>
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="font-bold">Fecha de compra:</span>
                              <span className="text-slate-600 dark:text-slate-400">
                                {saleDate ? formatDate(warranty.sales!.created_at) : "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="font-bold">Factura:</span>
                              <Link href={`/ventas/${warranty.sale_id}`} className="text-ov-pink hover:underline">
                                {warranty.sales?.invoice_number ?? "—"}
                              </Link>
                            </div>
                          </>
                        )}
                        {!warranty.sale_id && warranty.quantity > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="font-bold">Cantidad:</span>
                            <span className="text-slate-600 dark:text-slate-400">{warranty.quantity}</span>
                          </div>
                        )}
                        {productValue > 0 && (
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-bold">Valor del producto:</span>
                            <span className="text-slate-600 dark:text-slate-400">$ {formatMoney(productValue)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">Motivo de la garantía</p>
                        <div className="rounded-lg bg-slate-50 p-3 text-[13px] dark:bg-slate-800">
                          <p className="text-slate-700 dark:text-slate-300">{warranty.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[13px]">
                        <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-bold">Tipo:</span>
                        <span className="text-slate-600 dark:text-slate-400">{WARRANTY_TYPE_LABELS[warranty.warranty_type]}</span>
                      </div>
                      {warranty.replacement_product_id && warranty.replacement_product && (
                        <div className="flex items-center gap-2 text-[13px]">
                          <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          <span className="font-bold">Producto de reemplazo:</span>
                          <span className="text-slate-600 dark:text-slate-400">{warranty.replacement_product.name}</span>
                        </div>
                      )}
                      {warranty.reviewed_by_user && (
                        <div className="flex items-center gap-2 text-[13px]">
                          <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-bold">
                            {warranty.status === "approved" ? "Aprobada por:" : warranty.status === "rejected" ? "Rechazada por:" : "Revisada por:"}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">{warranty.reviewed_by_user.name}</span>
                        </div>
                      )}
                      {warranty.rejection_reason && (
                        <div>
                          <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">Razón del rechazo</p>
                          <div className="rounded-lg bg-red-50 p-3 text-[13px] dark:bg-red-950/20">
                            <p className="text-red-700 dark:text-red-300">{warranty.rejection_reason}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                    <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      Garantía registrada {getTimeAgo(warranty.created_at).toLowerCase()} · {formatTime(warranty.created_at)}
                    </p>
                    <div className="flex gap-2">
                      {warranty.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(warranty.id)}
                            disabled={approvingId === warranty.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-emerald-500 bg-emerald-50 px-4 py-2 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {approvingId === warranty.id ? "Aprobando..." : "Aprobar"}
                          </button>
                          <button
                            onClick={() => setShowRejectModal(warranty.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-700 hover:bg-red-100 dark:border-red-500 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Rechazar
                          </button>
                        </>
                      )}
                      {warranty.status === "approved" && (
                        <button
                          onClick={() => handleProcess(warranty.id)}
                          disabled={processingId === warranty.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2 text-[13px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {processingId === warranty.id ? "Procesando..." : "Procesar"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            );
          })
        )}
      </section>

      {/* Modal de rechazo */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Rechazar garantía</h3>
            <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
              Ingresa el motivo del rechazo. Este motivo será visible para el cliente.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej: El producto no presenta defectos de fábrica..."
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              rows={4}
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason("");
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={rejectingId === showRejectModal || !rejectionReason.trim()}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectingId === showRejectModal ? "Rechazando..." : "Rechazar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
