"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/app/components/Breadcrumb";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

type WarrantyDetail = {
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

export default function WarrantyDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [warranty, setWarranty] = useState<WarrantyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showStatusDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showStatusDropdown]);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
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
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setWarranty(null);
      } else {
        setWarranty(data as WarrantyDetail);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    setApproving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setApproving(false);
      return;
    }
    const { error } = await supabase
      .from("warranties")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setApproving(false);
    if (error) {
      alert("Error al aprobar: " + error.message);
      return;
    }
    setWarranty((w) =>
      w
        ? {
            ...w,
            status: "approved" as const,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            reviewed_by_user: { name: user.email?.split("@")[0] || "Usuario" },
          }
        : null
    );
  };

  const handleReject = async () => {
    if (!id || !rejectionReason.trim()) return;
    setRejecting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRejecting(false);
      return;
    }
    const { error } = await supabase
      .from("warranties")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason.trim(),
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setRejecting(false);
    setShowRejectModal(false);
    setRejectionReason("");
    if (error) {
      alert("Error al rechazar: " + error.message);
      return;
    }
    setWarranty((w) =>
      w
        ? {
            ...w,
            status: "rejected" as const,
            rejection_reason: rejectionReason.trim(),
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            reviewed_by_user: { name: user.email?.split("@")[0] || "Usuario" },
          }
        : null
    );
  };

  const handleProcess = async () => {
    if (!id || !warranty) return;
    setProcessing(true);
    const supabase = createClient();
    const { data: ub } = await supabase
      .from("user_branches")
      .select("branch_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .limit(1)
      .single();
    const branchId = warranty.branch_id ?? ub?.branch_id;

    try {
      const { error: updateError } = await supabase
        .from("warranties")
        .update({ status: "processed" })
        .eq("id", id);
      if (updateError) throw updateError;

      if (warranty.warranty_type === "exchange" && warranty.replacement_product_id && branchId) {
        const { data: currentInventory } = await supabase
          .from("inventory")
          .select("quantity")
          .eq("product_id", warranty.replacement_product_id)
          .eq("branch_id", branchId)
          .single();
        const currentQty = currentInventory?.quantity || 0;
        const qtyToDeduct = warranty.sale_items?.quantity ?? warranty.quantity ?? 1;
        const newQty = Math.max(0, currentQty - qtyToDeduct);
        const { error: inventoryError } = await supabase
          .from("inventory")
          .upsert(
            {
              product_id: warranty.replacement_product_id,
              branch_id: branchId,
              quantity: newQty,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "product_id,branch_id" }
          );
        if (inventoryError) {
          console.error("Error updating inventory:", inventoryError);
          alert("La garantía se marcó como procesada pero hubo un error al actualizar el inventario.");
        }
      }

      if (branchId) {
        const qty = warranty.sale_items?.quantity ?? warranty.quantity ?? 1;
        const { error: defectiveError } = await supabase.from("defective_products").insert({
          warranty_id: id,
          product_id: warranty.product_id,
          branch_id: branchId,
          quantity: qty,
          defect_description: warranty.reason,
        });
        if (defectiveError) {
          console.error("Error creating defective product:", defectiveError);
          alert("La garantía se procesó pero hubo un error al registrar el producto defectuoso.");
        }
      }

      setWarranty((w) => (w ? { ...w, status: "processed" as const } : null));
    } catch (err: unknown) {
      alert("Error al procesar la garantía: " + (err instanceof Error ? err.message : String(err)));
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Garantías", href: "/garantias" }, { label: "Detalle" }]} />
        <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-white p-8 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">Cargando garantía...</p>
        </div>
      </div>
    );
  }

  if (notFound || !warranty) {
    return (
      <div className="space-y-4 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Garantías", href: "/garantias" }, { label: "Detalle" }]} />
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">Garantía no encontrada</p>
          <Link href="/garantias" className="mt-4 inline-block text-ov-pink hover:underline text-[14px]">
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  const sal = Array.isArray(warranty.sales) ? warranty.sales[0] : warranty.sales;
  const si = Array.isArray(warranty.sale_items) ? warranty.sale_items[0] : warranty.sale_items;
  const qty = si?.quantity ?? warranty.quantity ?? 1;
  const unitPrice = si?.unit_price ?? 0;
  const productValue = unitPrice * qty;
  const statusColor = STATUS_COLORS[warranty.status];
  const warrantyShortId = warranty.id.slice(0, 8).toUpperCase();

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
      {/* Card principal tipo factura: título + métricas + acciones */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
        <Breadcrumb
          items={[
            { label: "Garantías", href: "/garantias" },
            { label: `Garantía #${warrantyShortId}` },
          ]}
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              Garantía #{warrantyShortId}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              <span>{formatDate(warranty.created_at)} · {formatTime(warranty.created_at)}</span>
              <span>·</span>
              <span>{warranty.customers?.name ?? "Cliente"}</span>
              {warranty.requested_by_user?.name && (
                <>
                  <span>·</span>
                  <span>Registrada por {warranty.requested_by_user.name}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="relative" ref={statusDropdownRef}>
              {(warranty.status === "pending" || warranty.status === "approved") ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStatusDropdown((v) => !v);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-bold ${statusColor.bg} ${statusColor.text} border border-transparent hover:ring-2 hover:ring-slate-400/50 dark:hover:ring-slate-500/50`}
                >
                  {STATUS_LABELS[warranty.status]}
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <span className={`inline-flex items-center rounded-md px-3 py-1.5 text-[13px] font-bold ${statusColor.bg} ${statusColor.text}`}>
                  {STATUS_LABELS[warranty.status]}
                </span>
              )}
              {showStatusDropdown && (warranty.status === "pending" || warranty.status === "approved") && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Cambiar estado
                  </p>
                  {warranty.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowStatusDropdown(false);
                          handleApprove();
                        }}
                        disabled={approving}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        {approving ? "Aprobando…" : "Aprobada"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowStatusDropdown(false);
                          setShowRejectModal(true);
                        }}
                        disabled={rejecting}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                        Rechazada
                      </button>
                    </>
                  )}
                  {warranty.status === "approved" && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowStatusDropdown(false);
                        handleProcess();
                      }}
                      disabled={processing}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                      {processing ? "Procesando…" : "Procesada"}
                    </button>
                  )}
                </div>
              )}
            </div>
            <Link
              href="/garantias"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Volver a garantías"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-start gap-4 sm:gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Estado</p>
            <p className={`mt-0.5 text-lg font-semibold sm:text-xl ${statusColor.text}`}>
              {STATUS_LABELS[warranty.status]}
            </p>
          </div>
          <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tipo</p>
            <p className="mt-0.5 text-lg font-medium text-slate-700 dark:text-slate-300 sm:text-xl">
              {WARRANTY_TYPE_LABELS[warranty.warranty_type]}
            </p>
          </div>
          <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Valor producto</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
              $ {formatMoney(productValue)}
            </p>
          </div>
          <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Fecha</p>
            <p className="mt-0.5 text-[14px] font-medium text-slate-700 dark:text-slate-300">
              {formatDate(warranty.created_at)} · {formatTime(warranty.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla: detalle del producto (como ítems de factura) */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Detalle de la garantía
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[320px] text-[14px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Producto</th>
                <th className="pb-2 text-right font-semibold text-slate-600 dark:text-slate-300">Cant.</th>
                <th className="pb-2 text-right font-semibold text-slate-600 dark:text-slate-300">P. unit.</th>
                <th className="pb-2 text-right font-semibold text-slate-600 dark:text-slate-300">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2.5">
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {warranty.products?.name ?? "—"}
                  </span>
                  <span className="ml-1.5 text-[12px] text-slate-500 dark:text-slate-400">(producto con garantía)</span>
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{qty}</td>
                <td className="py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">$ {formatMoney(unitPrice)}</td>
                <td className="py-2.5 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">$ {formatMoney(productValue)}</td>
              </tr>
              {warranty.warranty_type === "exchange" && warranty.replacement_product && (
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {warranty.replacement_product.name}
                    </span>
                    <span className="ml-1.5 text-[12px] text-slate-500 dark:text-slate-400">(producto de reemplazo)</span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{qty}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">—</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">—</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                <td colSpan={3} className="py-2.5 pr-2 text-right text-[13px] font-medium text-slate-600 dark:text-slate-400">
                  Valor referenciado
                </td>
                <td className="py-2.5 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">
                  $ {formatMoney(productValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Dos columnas: Identificación + Motivo (estilo factura) */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Identificación
          </h2>
          <dl className="mt-3 space-y-2 text-[14px]">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">Cliente</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{warranty.customers?.name ?? "—"}</dd>
            </div>
            {warranty.sale_id && sal && (
              <>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Factura</dt>
                  <dd>
                    <Link href={`/ventas/${warranty.sale_id}`} className="font-medium text-ov-pink hover:underline">
                      {sal.invoice_number ?? "—"}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Fecha de compra</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100">
                    {sal.created_at ? formatDate(sal.created_at) : "—"}
                  </dd>
                </div>
              </>
            )}
            {!warranty.sale_id && warranty.quantity > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Cantidad</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{warranty.quantity}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Motivo de la garantía
          </h2>
          <p className="mt-3 text-[14px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{warranty.reason}</p>
          {warranty.reviewed_by_user && (
            <p className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-[13px] text-slate-500 dark:text-slate-400">
              {warranty.status === "approved" ? "Aprobada" : warranty.status === "rejected" ? "Rechazada" : "Revisada"} por {warranty.reviewed_by_user.name}
              {warranty.reviewed_at && ` · ${formatDate(warranty.reviewed_at)}`}
            </p>
          )}
          {warranty.rejection_reason && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
              <p className="text-[12px] font-bold uppercase text-red-700 dark:text-red-300">Razón del rechazo</p>
              <p className="mt-1 text-[13px] text-red-700 dark:text-red-200">{warranty.rejection_reason}</p>
            </div>
          )}
        </div>
      </section>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Rechazar garantía</h3>
            <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">Ingresa el motivo del rechazo.</p>
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
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectionReason.trim()}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejecting ? "Rechazando..." : "Rechazar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
