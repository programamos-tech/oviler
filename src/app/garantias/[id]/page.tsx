"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import Breadcrumb from "@/app/components/Breadcrumb";

/** Inventario puede ser UNIQUE(product_id, branch_id) o UNIQUE(product_id, branch_id, location). */
type InventoryRow = { id: string; quantity: number | null; location?: string | null };

async function adjustInventoryByProductBranch(
  supabase: SupabaseClient,
  productId: string,
  branchId: string,
  delta: number,
  mode: "add" | "subtract"
): Promise<void> {
  const { data: rows, error: selErr } = await supabase
    .from("inventory")
    .select("id, quantity, location")
    .eq("product_id", productId)
    .eq("branch_id", branchId);
  if (selErr) throw selErr;
  const list = (rows ?? []) as InventoryRow[];

  if (list.length === 0) {
    if (mode === "subtract" || delta <= 0) return;
    const { error } = await supabase.from("inventory").insert({
      product_id: productId,
      branch_id: branchId,
      location: "bodega",
      quantity: delta,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return;
  }

  const preferred =
    list.find((r) => r.location === "bodega") ??
    list.find((r) => r.location === "local") ??
    list[0];
  const q = Number(preferred.quantity ?? 0);
  const next = mode === "add" ? q + delta : Math.max(0, q - delta);
  const { error } = await supabase
    .from("inventory")
    .update({ quantity: next, updated_at: new Date().toISOString() })
    .eq("id", preferred.id);
  if (error) throw error;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

/** Subtotal de línea de venta con descuentos (valor a reembolsar proporcionalmente). */
function saleLineTotal(
  unitPrice: number,
  lineQty: number,
  discountPercent: number,
  discountAmount: number
): number {
  if (lineQty <= 0) return 0;
  return Math.max(
    0,
    Math.round(
      lineQty * unitPrice * (1 - (Number(discountPercent) || 0) / 100) - (Number(discountAmount) || 0)
    )
  );
}

function saleLineQuantitySold(si: { quantity: number } | null | undefined): number {
  return Math.max(1, Number(si?.quantity) || 1);
}

/**
 * Unidades cubiertas por esta garantía. Con línea de venta: usa `warranties.quantity`
 * acotada a la cantidad vendida; si la fila no trae cantidad válida, se asume toda la línea (datos antiguos).
 */
function warrantyUnitsCovered(w: WarrantyDetail): number {
  const siRow = Array.isArray(w.sale_items) ? w.sale_items[0] : w.sale_items;
  const lineQty = siRow ? saleLineQuantitySold(siRow) : Math.max(1, Number(w.quantity) || 1);
  const wq = Number(w.quantity);
  if (!siRow) {
    return Number.isFinite(wq) && wq >= 1 ? Math.floor(wq) : 1;
  }
  if (!Number.isFinite(wq) || wq < 1) {
    return lineQty;
  }
  return Math.min(Math.floor(wq), lineQty);
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
  sales: {
    invoice_number: string;
    created_at: string;
    branch_id?: string;
    payment_method?: string;
    amount_cash?: number | null;
    amount_transfer?: number | null;
    total?: number;
  } | null;
  sale_items: {
    unit_price: number;
    quantity: number;
    discount_percent?: number;
    discount_amount?: number;
  } | null;
  requested_by_user: { name: string } | null;
  reviewed_by_user: { name: string } | null;
  replacement_product: { name: string } | null;
};

/** Monto a reembolsar (misma lógica que al procesar). */
function getRefundAmountForWarranty(w: WarrantyDetail): number {
  const siRow = Array.isArray(w.sale_items) ? w.sale_items[0] : w.sale_items;
  if (!siRow) return 0;
  const lineQtySi = saleLineQuantitySold(siRow);
  const returnQty = warrantyUnitsCovered(w);
  const unitPrice = Number(siRow.unit_price ?? 0);
  const dPct = Number(siRow.discount_percent ?? 0);
  const dAmt = Number(siRow.discount_amount ?? 0);
  const lineTotalAll = saleLineTotal(unitPrice, lineQtySi, dPct, dAmt);
  return lineQtySi > 0 ? Math.round(lineTotalAll * (returnQty / lineQtySi)) : 0;
}

/** Reparto efectivo/transferencia del reembolso (misma lógica que egresos y abono al crédito). */
function computeRefundCashTransferSplit(
  refundAmount: number,
  payout: "cash" | "transfer" | "match_invoice" | undefined,
  salRow: { payment_method?: string | null; amount_cash?: number | null; amount_transfer?: number | null }
): { cash: number; transfer: number } {
  const pm = String(salRow.payment_method ?? "cash");
  const p = payout ?? "match_invoice";
  if (p === "cash") return { cash: refundAmount, transfer: 0 };
  if (p === "transfer") return { cash: 0, transfer: refundAmount };
  if (pm === "transfer") return { cash: 0, transfer: refundAmount };
  if (pm === "mixed" && salRow.amount_cash != null && salRow.amount_transfer != null) {
    const ac = Number(salRow.amount_cash);
    const at = Number(salRow.amount_transfer);
    const sumMixed = ac + at;
    if (sumMixed > 0) {
      const cashPart = Math.round((ac / sumMixed) * refundAmount);
      return { cash: cashPart, transfer: refundAmount - cashPart };
    }
  }
  return { cash: refundAmount, transfer: 0 };
}

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
  /** Devolución con factura: al procesar, de dónde sale el dinero del reembolso */
  const [showRefundProcessModal, setShowRefundProcessModal] = useState(false);
  const [refundPayoutChoice, setRefundPayoutChoice] = useState<"cash" | "transfer" | "match_invoice">("match_invoice");
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
          sales(invoice_number, created_at, branch_id, payment_method, amount_cash, amount_transfer, total),
          sale_items(unit_price, quantity, discount_percent, discount_amount),
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

  const handleProcess = async (refundPayout?: "cash" | "transfer" | "match_invoice") => {
    if (!id || !warranty) return;
    if (warranty.status === "processed") {
      alert("Esta garantía ya está procesada.");
      return;
    }
    setProcessing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Debes iniciar sesión para procesar la garantía.");
      setProcessing(false);
      return;
    }
    const { data: ub } = await supabase
      .from("user_branches")
      .select("branch_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const salRow = Array.isArray(warranty.sales) ? warranty.sales[0] : warranty.sales;
    const siRow = Array.isArray(warranty.sale_items) ? warranty.sale_items[0] : warranty.sale_items;
    const branchId = warranty.branch_id ?? salRow?.branch_id ?? ub?.branch_id ?? null;

    try {
      /** Devolución: reingresa stock vendible y registra egreso(s) según la forma de pago de la venta. */
      if (warranty.warranty_type === "refund") {
        if (!branchId) {
          throw new Error("No se pudo determinar la sucursal para devolver el stock.");
        }
        const lineQtySi = siRow ? saleLineQuantitySold(siRow) : Math.max(1, Number(warranty.quantity) || 1);
        const returnQty = siRow ? warrantyUnitsCovered(warranty) : Math.max(1, Number(warranty.quantity) || 1);
        const unitPrice = Number(siRow?.unit_price ?? 0);
        const dPct = Number(siRow?.discount_percent ?? 0);
        const dAmt = Number(siRow?.discount_amount ?? 0);
        const lineTotalAll = saleLineTotal(unitPrice, lineQtySi, dPct, dAmt);
        const refundAmount =
          lineQtySi > 0 && siRow ? Math.round(lineTotalAll * (returnQty / lineQtySi)) : 0;

        await adjustInventoryByProductBranch(supabase, warranty.product_id, branchId, returnQty, "add");

        if (warranty.sale_id && salRow && refundAmount > 0) {
          const invoice = salRow.invoice_number ?? "—";
          const prodName = warranty.products?.name ?? "Producto";
          const concept = `Devolución garantía ${id.slice(0, 8).toUpperCase()} · ${prodName} · Fact. ${invoice}`;

          const insertExpense = async (amount: number, method: "cash" | "transfer") => {
            if (amount <= 0) return;
            const { error } = await supabase.from("expenses").insert({
              branch_id: branchId,
              user_id: user.id,
              amount,
              payment_method: method,
              concept,
              notes: "Reembolso automático al procesar garantía tipo devolución.",
            });
            if (error) throw error;
          };

          const payout = refundPayout ?? "match_invoice";
          const { cash: expenseCash, transfer: expenseTransfer } = computeRefundCashTransferSplit(
            refundAmount,
            payout,
            salRow
          );
          await insertExpense(expenseCash, "cash");
          await insertExpense(expenseTransfer, "transfer");

          const { data: creditRow } = await supabase
            .from("customer_credits")
            .select("id")
            .eq("sale_id", warranty.sale_id)
            .is("cancelled_at", null)
            .maybeSingle();

          if (creditRow?.id) {
            const shortW = id.slice(0, 8).toUpperCase();
            const abonoNotes = `Reembolso garantía · Garantía #${shortW}`;
            const { data: existingAbono } = await supabase
              .from("credit_payments")
              .select("id")
              .eq("credit_id", creditRow.id)
              .eq("payment_source", "warranty_refund")
              .ilike("notes", `%Garantía #${shortW}%`)
              .maybeSingle();

            if (!existingAbono) {
              const baseRow: Record<string, unknown> = {
                credit_id: creditRow.id,
                amount: refundAmount,
                notes: abonoNotes,
                created_by: user.id,
                payment_source: "warranty_refund",
              };
              if (expenseCash > 0 && expenseTransfer > 0) {
                baseRow.payment_method = "mixed";
                baseRow.amount_cash = expenseCash;
                baseRow.amount_transfer = expenseTransfer;
              } else if (expenseCash > 0) {
                baseRow.payment_method = "cash";
              } else {
                baseRow.payment_method = "transfer";
              }
              const { error: abonoErr } = await supabase.from("credit_payments").insert(baseRow);
              if (abonoErr) throw abonoErr;
            }
          }
        } else if (!warranty.sale_id && refundAmount === 0) {
          /* garantía sin factura: solo stock; el dinero debe registrarse a mano si aplica */
        }
      } else if (warranty.warranty_type === "exchange" && warranty.replacement_product_id && branchId) {
        const qtyToDeduct = warrantyUnitsCovered(warranty);
        // Cambio: sale stock del producto de reemplazo y entra stock del producto recibido.
        await adjustInventoryByProductBranch(
          supabase,
          warranty.replacement_product_id,
          branchId,
          qtyToDeduct,
          "subtract"
        );
        await adjustInventoryByProductBranch(
          supabase,
          warranty.product_id,
          branchId,
          qtyToDeduct,
          "add"
        );
      }

      if (warranty.warranty_type !== "refund" && branchId) {
        const qty = warrantyUnitsCovered(warranty);
        const { error: defectiveError } = await supabase.from("defective_products").insert({
          warranty_id: id,
          product_id: warranty.product_id,
          branch_id: branchId,
          quantity: qty,
          defect_description: warranty.reason,
        });
        if (defectiveError) throw defectiveError;
      }

      const { error: updateError } = await supabase
        .from("warranties")
        .update({ status: "processed" })
        .eq("id", id);
      if (updateError) throw updateError;

      if (warranty.warranty_type === "refund" && !warranty.sale_id) {
        alert(
          "Garantía procesada: el stock se devolvió al inventario. Esta garantía no tiene factura vinculada: si devolviste dinero al cliente, registra el egreso en Egresos."
        );
      }

      setWarranty((w) => (w ? { ...w, status: "processed" as const } : null));
      setShowRefundProcessModal(false);
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
  const coveredQty = warrantyUnitsCovered(warranty);
  const unitPrice = si?.unit_price ?? 0;
  const productValue =
    si != null
      ? getRefundAmountForWarranty(warranty)
      : Math.round(Number(unitPrice) * Number(coveredQty));
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
                        if (warranty.warranty_type === "refund" && warranty.sale_id) {
                          setRefundPayoutChoice("match_invoice");
                          setShowRefundProcessModal(true);
                        } else {
                          void handleProcess();
                        }
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
        {warranty.warranty_type === "refund" &&
          (warranty.status === "approved" || warranty.status === "pending") && (
            <div className="mt-4 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[12px] text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-100">
              <p>
                <strong>Devolución:</strong> el <strong>egreso</strong> en{" "}
                <Link href="/egresos" className="font-semibold text-ov-pink underline-offset-2 hover:underline">
                  Egresos
                </Link>{" "}
                y en reportes aparece <strong>solo cuando marques &quot;Procesada&quot;</strong>, no al aprobar.
              </p>
              <p>
                Al procesar, el sistema devuelve unidades al <strong>inventario</strong>
                {warranty.sale_id ? (
                  <>
                    {" "}
                    y registra el reembolso; podrás elegir si descuenta de <strong>efectivo</strong>,{" "}
                    <strong>transferencia</strong> o reparto como la factura.
                  </>
                ) : (
                  <>
                    . <span className="opacity-90">Sin factura vinculada no se crea egreso automático;</span> regístralo
                    en <strong>Egresos</strong> si devolviste dinero.
                  </>
                )}
              </p>
            </div>
          )}
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
                <td className="py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{coveredQty}</td>
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
                  <td className="py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{coveredQty}</td>
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
                    <Link
                      href={`/ventas/${warranty.sale_id}`}
                      className="font-semibold text-sky-600 underline decoration-sky-500/50 underline-offset-2 transition-colors hover:text-sky-700 hover:decoration-sky-600/70 dark:text-sky-400 dark:decoration-sky-400/70 dark:hover:text-sky-300"
                    >
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

      {showRefundProcessModal && warranty && warranty.warranty_type === "refund" && warranty.sale_id && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => !processing && setShowRefundProcessModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            aria-labelledby="refund-process-title"
            aria-modal="true"
          >
            <h3 id="refund-process-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Procesar devolución al cliente
            </h3>
            <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
              Se registrará un egreso por{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                $ {formatMoney(getRefundAmountForWarranty(warranty))}
              </strong>
              . Indica de dónde sale el dinero que devuelves:
            </p>
            {(() => {
              const salModal = Array.isArray(warranty.sales) ? warranty.sales[0] : warranty.sales;
              const pm = String(salModal?.payment_method ?? "cash");
              const pmHint =
                pm === "transfer"
                  ? "La venta original fue solo transferencia."
                  : pm === "mixed"
                    ? "La venta original fue mixta (efectivo + transferencia)."
                    : "La venta original fue en efectivo.";
              return (
                <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">{pmHint}</p>
              );
            })()}
            <fieldset className="mt-4 space-y-3">
              <legend className="sr-only">Origen del reembolso</legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-zinc-600 dark:bg-zinc-950/40">
                <input
                  type="radio"
                  name="refundPayout"
                  className="mt-1"
                  checked={refundPayoutChoice === "cash"}
                  onChange={() => setRefundPayoutChoice("cash")}
                />
                <span>
                  <span className="block text-[13px] font-medium text-slate-800 dark:text-slate-100">Efectivo (caja)</span>
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">Todo el reembolso descuenta de efectivo del día.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-zinc-600 dark:bg-zinc-950/40">
                <input
                  type="radio"
                  name="refundPayout"
                  className="mt-1"
                  checked={refundPayoutChoice === "transfer"}
                  onChange={() => setRefundPayoutChoice("transfer")}
                />
                <span>
                  <span className="block text-[13px] font-medium text-slate-800 dark:text-slate-100">Transferencia</span>
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">Todo el reembolso descuenta de transferencia.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-zinc-600 dark:bg-zinc-950/40">
                <input
                  type="radio"
                  name="refundPayout"
                  className="mt-1"
                  checked={refundPayoutChoice === "match_invoice"}
                  onChange={() => setRefundPayoutChoice("match_invoice")}
                />
                <span>
                  <span className="block text-[13px] font-medium text-slate-800 dark:text-slate-100">Como la factura</span>
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">
                    Reparto automático según cómo pagó el cliente (si era mixto, divide el reembolso en la misma proporción).
                  </span>
                </span>
              </label>
            </fieldset>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowRefundProcessModal(false)}
                disabled={processing}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-slate-200 dark:hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleProcess(refundPayoutChoice)}
                disabled={processing}
                className="flex-1 rounded-lg bg-[color:var(--shell-sidebar)] px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-95 disabled:opacity-50"
              >
                {processing ? "Procesando…" : "Confirmar y registrar egreso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
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
