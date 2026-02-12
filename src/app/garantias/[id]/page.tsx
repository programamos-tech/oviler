"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [warranty, setWarranty] = useState<WarrantyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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
    const { error } = await supabase.from("warranties").update({ status: "approved" }).eq("id", id);
    setApproving(false);
    if (error) {
      alert("Error al aprobar: " + error.message);
      return;
    }
    setWarranty((w) => (w ? { ...w, status: "approved" as const } : null));
  };

  const handleReject = async () => {
    if (!id || !rejectionReason.trim()) return;
    setRejecting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("warranties")
      .update({ status: "rejected", rejection_reason: rejectionReason.trim() })
      .eq("id", id);
    setRejecting(false);
    setShowRejectModal(false);
    setRejectionReason("");
    if (error) {
      alert("Error al rechazar: " + error.message);
      return;
    }
    setWarranty((w) => (w ? { ...w, status: "rejected" as const, rejection_reason: rejectionReason.trim() } : null));
  };

  const handleProcess = async () => {
    if (!id) return;
    setProcessing(true);
    const supabase = createClient();
    const { error } = await supabase.from("warranties").update({ status: "processed" }).eq("id", id);
    setProcessing(false);
    if (error) {
      alert("Error al procesar: " + error.message);
      return;
    }
    setWarranty((w) => (w ? { ...w, status: "processed" as const } : null));
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-[900px] mx-auto">
        <Breadcrumb items={[{ label: "Garantías", href: "/garantias" }, { label: "Detalle" }]} />
        <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-white p-8 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">Cargando garantía...</p>
        </div>
      </div>
    );
  }

  if (notFound || !warranty) {
    return (
      <div className="space-y-4 max-w-[900px] mx-auto">
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
  const productValue = si && si.unit_price != null ? Number(si.unit_price) * (si.quantity ?? warranty.quantity ?? 1) : 0;
  const statusColor = STATUS_COLORS[warranty.status];

  return (
    <div className="space-y-4 max-w-[900px] mx-auto">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumb items={[{ label: "Garantías", href: "/garantias" }, { label: `#${warranty.id.slice(0, 8).toUpperCase()}` }]} />
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Detalle de la garantía
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
            Registrada el {formatDate(warranty.created_at)} a las {formatTime(warranty.created_at)}
            {warranty.requested_by_user?.name && ` · Por ${warranty.requested_by_user.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-md px-3 py-1.5 text-[13px] font-bold ${statusColor.bg} ${statusColor.text}`}>
            {STATUS_LABELS[warranty.status]}
          </span>
          <Link
            href="/garantias"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Volver a la lista
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
            Información general
          </h2>
          <dl className="space-y-3 text-[14px]">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-600 dark:text-slate-400">Cliente</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-50 text-right">{warranty.customers?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-600 dark:text-slate-400">Producto</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-50 text-right">{warranty.products?.name ?? "—"}</dd>
            </div>
            {warranty.sale_id && sal && (
              <>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-600 dark:text-slate-400">Factura</dt>
                  <dd>
                    <Link href={`/ventas/${warranty.sale_id}`} className="font-medium text-ov-pink hover:underline">
                      {sal.invoice_number ?? "—"}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-600 dark:text-slate-400">Fecha de compra</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-50">{sal.created_at ? formatDate(sal.created_at) : "—"}</dd>
                </div>
              </>
            )}
            {!warranty.sale_id && warranty.quantity > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600 dark:text-slate-400">Cantidad</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-50">{warranty.quantity}</dd>
              </div>
            )}
            {productValue > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600 dark:text-slate-400">Valor del producto</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-50">$ {formatMoney(productValue)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-slate-600 dark:text-slate-400">Tipo de garantía</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-50">{WARRANTY_TYPE_LABELS[warranty.warranty_type]}</dd>
            </div>
            {warranty.replacement_product_id && warranty.replacement_product && (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600 dark:text-slate-400">Producto de reemplazo</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-50 text-right">{warranty.replacement_product.name}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
            Motivo de la garantía
          </h2>
          <p className="text-[14px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{warranty.reason}</p>
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
      </div>

      {(warranty.status === "pending" || warranty.status === "approved") && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
            Acciones
          </h2>
          <div className="flex flex-wrap gap-2">
            {warranty.status === "pending" && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-emerald-500 bg-emerald-50 px-4 py-2 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                >
                  {approving ? "Aprobando..." : "Aprobar"}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={rejecting}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
                >
                  Rechazar
                </button>
              </>
            )}
            {warranty.status === "approved" && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2 text-[13px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
              >
                {processing ? "Procesando..." : "Procesar"}
              </button>
            )}
          </div>
        </div>
      )}

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
                onClick={() => { setShowRejectModal(false); setRejectionReason(""); }}
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
