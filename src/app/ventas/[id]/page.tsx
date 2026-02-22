"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MdLocalShipping, MdStore, MdCancel, MdCheck } from "react-icons/md";
import Breadcrumb from "@/app/components/Breadcrumb";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";
import { getCopy, getStatusLabel, getStatusClass, type SalesMode } from "../sales-mode";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function displayInvoiceNumber(invoiceNumber: string) {
  if (!invoiceNumber) return invoiceNumber;
  const sin = invoiceNumber.replace(/^FV-?\s*/i, "").trim();
  return sin || invoiceNumber;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  mixed: "Mixto",
};

const ORDER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "preparing", label: "En preparación" },
  { value: "on_the_way", label: "En camino" },
  { value: "delivered", label: "Entregado" },
];

type SaleDetail = {
  id: string;
  branch_id: string;
  user_id: string;
  customer_id: string | null;
  invoice_number: string;
  total: number;
  payment_method: "cash" | "transfer" | "mixed";
  status: string;
  payment_pending?: boolean;
  is_delivery: boolean;
  delivery_address_id: string | null;
  delivery_fee: number | null;
  delivery_person_id: string | null;
  delivery_paid: boolean;
  created_at: string;
  cancellation_requested_at?: string | null;
  cancellation_requested_by?: string | null;
  customers: { name: string; phone: string | null } | null;
  users: { name: string } | null;
  delivery_persons: { name: string; code: string } | null;
  branches: {
    name: string;
    nit: string | null;
    address: string | null;
    phone: string | null;
    responsable_iva: boolean;
    invoice_print_type: "tirilla" | "block";
    invoice_cancel_requires_approval?: boolean;
  } | null;
};

type DeliveryAddress = {
  id: string;
  label: string;
  address: string;
  reference_point: string | null;
};

type SaleItemRow = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  products: { name: string; sku: string | null } | null;
};

type WarrantyRow = {
  id: string;
  warranty_type: "exchange" | "refund" | "repair";
  reason: string;
  status: "pending" | "approved" | "rejected" | "processed";
  created_at: string;
  products: { name: string } | null;
  replacement_product: { name: string } | null;
};

function lineSubtotal(item: SaleItemRow): number {
  const raw = item.quantity * item.unit_price;
  const byPercent = raw * (Number(item.discount_percent) || 0) / 100;
  const byAmount = Number(item.discount_amount) || 0;
  return Math.max(0, Math.round(raw - byPercent - byAmount));
}

function hasLineDiscount(item: SaleItemRow): boolean {
  return (Number(item.discount_percent) || 0) > 0 || (Number(item.discount_amount) || 0) > 0;
}

function lineDiscountLabel(item: SaleItemRow): string {
  const pct = Number(item.discount_percent) || 0;
  const amt = Number(item.discount_amount) || 0;
  if (pct > 0 && amt > 0) return `${pct}% · $ ${formatMoney(amt)}`;
  if (pct > 0) return `${pct}%`;
  if (amt > 0) return `$ ${formatMoney(amt)}`;
  return "";
}

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [items, setItems] = useState<SaleItemRow[]>([]);
  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markingDeliveryPaid, setMarkingDeliveryPaid] = useState(false);
  const [salesMode, setSalesMode] = useState<SalesMode>("sales");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select(
          "id, branch_id, user_id, customer_id, invoice_number, total, payment_method, status, payment_pending, is_delivery, delivery_address_id, delivery_fee, delivery_person_id, delivery_paid, created_at, customers(name, phone), users!user_id(name), delivery_persons(name, code)"
        )
        .eq("id", id)
        .single();

      if (cancelled) return;
      if (saleError || !saleData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const transformedSale = {
        ...saleData,
        customers: Array.isArray(saleData.customers) ? (saleData.customers[0] || null) : saleData.customers,
        users: Array.isArray(saleData.users) ? (saleData.users[0] || null) : saleData.users,
        delivery_persons: Array.isArray(saleData.delivery_persons) ? (saleData.delivery_persons[0] || null) : saleData.delivery_persons,
        branches: null, // Se asignará después
      } as SaleDetail & { branch_id: string };
      const s = transformedSale;
      let branchData: SaleDetail["branches"] = null;
      if (s.branch_id) {
        const { data: branchRow } = await supabase
          .from("branches")
          .select("name, nit, address, phone, responsable_iva, sales_mode")
          .eq("id", s.branch_id)
          .single();
        if (!cancelled && branchRow) {
          const row = branchRow as { invoice_print_type?: string; invoice_cancel_requires_approval?: boolean; sales_mode?: string };
          branchData = {
            name: branchRow.name,
            nit: branchRow.nit ?? null,
            address: branchRow.address ?? null,
            phone: branchRow.phone ?? null,
            responsable_iva: Boolean(branchRow.responsable_iva),
            invoice_print_type: row.invoice_print_type === "tirilla" ? "tirilla" : "block",
            invoice_cancel_requires_approval: Boolean(row.invoice_cancel_requires_approval),
          };
          if (row.sales_mode === "orders") setSalesMode("orders");
        }
      }
      const finalSale = {
        ...transformedSale,
        branches: branchData,
      } as SaleDetail;
      setSale(finalSale);

      const { data: itemsData } = await supabase
        .from("sale_items")
        .select("id, product_id, quantity, unit_price, discount_percent, discount_amount, products(name, sku)")
        .eq("sale_id", id);

      if (!cancelled) {
        const transformedItems = ((itemsData ?? []) as Array<{
          id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          discount_percent: number;
          discount_amount: number;
          products: { name: string; sku: string | null }[] | { name: string; sku: string | null } | null;
        }>).map((item) => ({
          ...item,
          products: Array.isArray(item.products) ? (item.products[0] || null) : item.products,
        })) as SaleItemRow[];
        setItems(transformedItems);
      }

      // Cargar garantías de esta venta
      const { data: warrantiesData } = await supabase
        .from("warranties")
        .select("id, warranty_type, reason, status, created_at, products(name), replacement_product:products!warranties_replacement_product_id_fkey(name)")
        .eq("sale_id", id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        const transformedWarranties = ((warrantiesData ?? []) as Array<{
          id: string;
          warranty_type: string;
          reason: string;
          status: string;
          created_at: string;
          products: { name: string }[] | { name: string } | null;
          replacement_product: { name: string }[] | { name: string } | null;
        }>).map((w) => ({
          ...w,
          products: Array.isArray(w.products) ? (w.products[0] || null) : w.products,
          replacement_product: Array.isArray(w.replacement_product) ? (w.replacement_product[0] || null) : w.replacement_product,
        })) as WarrantyRow[];
        setWarranties(transformedWarranties);
      }

      if (s.delivery_address_id) {
        const { data: addr } = await supabase
          .from("customer_addresses")
          .select("id, label, address, reference_point")
          .eq("id", s.delivery_address_id)
          .single();
        if (!cancelled && addr) setDeliveryAddress(addr as DeliveryAddress);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled && user) {
        const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();
        setCurrentUserRole(userRow?.role ?? null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function handleOrderStatusChange(newStatus: string) {
    if (!sale?.id) return;
    setUpdatingStatus(true);
    const supabase = createClient();
    await supabase.from("sales").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", sale.id);
    setSale((prev) => (prev ? { ...prev, status: newStatus } : null));
    setUpdatingStatus(false);
  }

  async function handleCancel() {
    if (!sale?.id) return;
    setCancelling(true);
    const supabase = createClient();
    const requiresApproval = sale.branches?.invoice_cancel_requires_approval ?? false;
    const { data: { user } } = await supabase.auth.getUser();
    if (requiresApproval && user) {
      await supabase
        .from("sales")
        .update({
          cancellation_reason: cancelReason.trim() || null,
          cancellation_requested_at: new Date().toISOString(),
          cancellation_requested_by: user.id,
        })
        .eq("id", sale.id);
      setSale((prev) =>
        prev
          ? {
              ...prev,
              cancellation_requested_at: new Date().toISOString(),
              cancellation_requested_by: user.id,
            }
          : null
      );
    } else {
      await supabase
        .from("sales")
        .update({ status: "cancelled", cancellation_reason: cancelReason.trim() || null })
        .eq("id", sale.id);
      setSale((prev) => (prev ? { ...prev, status: "cancelled" as const } : null));
    }
    setCancelling(false);
    setCancelOpen(false);
    setCancelReason("");
  }

  const isAdminOrOwner = currentUserRole === "owner" || currentUserRole === "admin";

  async function handleApproveCancel() {
    if (!sale?.id) return;
    setApproving(true);
    const supabase = createClient();
    await supabase
      .from("sales")
      .update({
        status: "cancelled",
        cancellation_requested_at: null,
        cancellation_requested_by: null,
      })
      .eq("id", sale.id);
    setSale((prev) =>
      prev
        ? { ...prev, status: "cancelled" as const, cancellation_requested_at: null, cancellation_requested_by: null }
        : null
    );
    setApproving(false);
  }

  async function handleRejectCancel() {
    if (!sale?.id) return;
    setRejecting(true);
    const supabase = createClient();
    await supabase
      .from("sales")
      .update({
        cancellation_requested_at: null,
        cancellation_requested_by: null,
        cancellation_reason: null,
      })
      .eq("id", sale.id);
    setSale((prev) =>
      prev
        ? { ...prev, cancellation_requested_at: null, cancellation_requested_by: null }
        : null
    );
    setRejecting(false);
  }

  async function handleMarkAsPaid() {
    if (!sale?.id) return;
    setMarkingPaid(true);
    const supabase = createClient();
    await supabase.from("sales").update({ payment_pending: false }).eq("id", sale.id);
    setSale((prev) => (prev ? { ...prev, payment_pending: false } : null));
    setMarkingPaid(false);
  }

  async function handleMarkDeliveryAsPaid() {
    if (!sale?.id) return;
    setMarkingDeliveryPaid(true);
    const supabase = createClient();
    await supabase
      .from("sales")
      .update({ 
        delivery_paid: true,
        delivery_paid_at: new Date().toISOString()
      })
      .eq("id", sale.id);
    setSale((prev) => (prev ? { ...prev, delivery_paid: true } : null));
    setMarkingDeliveryPaid(false);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-500 dark:text-slate-400">Cargando factura…</p>
      </div>
    );
  }

  if (notFound || !sale) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">Factura no encontrada.</p>
        <Link href="/ventas" className="text-[14px] font-medium text-ov-pink hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const customerName = sale.customers?.name ?? "Cliente ocasional";
  const branchName = sale.branches?.name ?? "—";
  const userName = sale.users?.name ?? "—";
  const copy = getCopy(salesMode);
  const paymentLabel = PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method;
  const statusLabel =
    sale.payment_pending && sale.status === "completed"
      ? "Pago pendiente"
      : getStatusLabel(sale.status, salesMode);
  const statusClass =
    sale.payment_pending && sale.status === "completed"
      ? "text-amber-600 dark:text-amber-400"
      : getStatusClass(sale.status);
  const pendingCancel = (sale.status === "completed" || sale.status === "delivered") && !!sale.cancellation_requested_at;
  const canCancel = (sale.status === "completed" || sale.status === "delivered") && !sale.cancellation_requested_at;
  const canChangeOrderStatus = salesMode === "orders" && !["cancelled", "completed", "delivered"].includes(sale.status);
  const itemsSubtotal = items.reduce((sum, it) => sum + lineSubtotal(it), 0);
  const totalDiscount = items.reduce(
    (sum, it) => sum + (it.quantity * it.unit_price - lineSubtotal(it)),
    0
  );
  const hasAnyDiscount = totalDiscount > 0;
  const deliveryFee = Number(sale.delivery_fee) || 0;
  const invoicePrintType = sale.branches?.invoice_print_type ?? "block";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .print-invoice-tirilla {
                max-width: 80mm !important;
                width: 80mm !important;
                margin: 0 auto !important;
                padding: 3mm !important;
                font-size: 11px !important;
                color: #000 !important;
              }
              .print-invoice-tirilla * { color: #000 !important; }
              .print-invoice-tirilla .print-tirilla-single-col { display: block !important; }
              .print-invoice-tirilla .print-tirilla-single-col > * { width: 100% !important; max-width: none !important; }
              .print-invoice-tirilla h1, .print-invoice-tirilla h2 { font-size: 12px !important; }
              .print-invoice-tirilla table { font-size: 10px !important; }
            }
          `,
        }}
      />
    <div
      className={`space-y-6 print:space-y-4 ${invoicePrintType === "tirilla" ? "print-invoice-tirilla" : ""}`}
    >
      {/* Encabezado legal solo para impresión: datos de la sucursal */}
      <div className="hidden print:block print:pb-4 print:border-b print:border-slate-300 print:mb-4">
        <div className="print:text-center print:text-black">
          <h2 className="print:text-lg print:font-bold print:uppercase print:tracking-tight">
            {sale.branches?.name ?? "Establecimiento"}
          </h2>
          {sale.branches?.nit && (
            <p className="print:mt-1 print:text-sm">
              <span className="print:font-semibold">NIT: </span>
              {sale.branches.nit}
            </p>
          )}
          {sale.branches?.address && (
            <p className="print:mt-0.5 print:text-sm">
              <span className="print:font-semibold">Dirección: </span>
              {sale.branches.address}
            </p>
          )}
          {sale.branches?.phone && (
            <p className="print:mt-0.5 print:text-sm">
              <span className="print:font-semibold">Teléfono: </span>
              {sale.branches.phone}
            </p>
          )}
          <p className="print:mt-0.5 print:text-sm">
            <span className="print:font-semibold">Responsable de IVA: </span>
            {sale.branches?.responsable_iva ? "Sí" : "No"}
          </p>
        </div>
        <p className="print:mt-3 print:text-center print:font-bold print:uppercase print:text-base print:text-black">
          Factura de venta #{displayInvoiceNumber(sale.invoice_number)}
        </p>
      </div>

      {/* Card: título + métricas y acciones */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6 print:shadow-none print:ring-0">
        <Breadcrumb
          items={[
            { label: copy.sectionTitle, href: "/ventas" },
            { label: `Factura ${displayInvoiceNumber(sale.invoice_number)}` },
          ]}
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              Factura #{displayInvoiceNumber(sale.invoice_number)}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              <span>{formatDate(sale.created_at)} · {formatTime(sale.created_at)}</span>
              <span>·</span>
              <span>{customerName}</span>
              <span className="inline-flex items-center gap-1">
                {sale.is_delivery ? (
                  <>
                    <MdLocalShipping className="h-4 w-4" aria-hidden />
                    <span>Domicilio</span>
                  </>
                ) : (
                  <>
                    <MdStore className="h-4 w-4" aria-hidden />
                    <span>Tienda</span>
                  </>
                )}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 print:hidden">
            <Link
              href="/ventas"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={`Volver a ${copy.sectionTitle.toLowerCase()}`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 sm:gap-y-0">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
                $ {formatMoney(sale.total)}
              </p>
            </div>
            <div className="border-l-0 pl-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Método de pago</p>
              <p className="mt-0.5 text-lg font-medium text-slate-700 dark:text-slate-300 sm:text-xl">
                {paymentLabel}
              </p>
            </div>
            <div className="border-l-0 pl-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Estado</p>
              {canChangeOrderStatus ? (
                <select
                  value={sale.status}
                  onChange={(e) => handleOrderStatusChange(e.target.value)}
                  disabled={updatingStatus}
                  className={`mt-0.5 block w-full max-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 ${statusClass}`}
                >
                  {ORDER_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <p className={`mt-0.5 text-lg font-semibold sm:text-xl ${statusClass}`}>
                  {statusLabel}
                </p>
              )}
            </div>
            <div className="border-l-0 pl-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Fecha y hora</p>
              <p className="mt-0.5 text-[14px] font-medium text-slate-700 dark:text-slate-300">
                {formatDate(sale.created_at)} · {formatTime(sale.created_at)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
            >
              Imprimir
            </button>
            {sale.payment_pending && (
              <button
                type="button"
                onClick={handleMarkAsPaid}
                disabled={markingPaid}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <MdCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {markingPaid ? "Guardando…" : "Pago recibido"}
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-ov-pink/50 bg-white px-4 text-[13px] font-medium text-ov-pink hover:bg-ov-pink/10 dark:border-ov-pink/50 dark:bg-slate-800 dark:text-ov-pink-muted dark:hover:bg-ov-pink/20"
              >
                Anular factura
              </button>
            )}
            {pendingCancel && (
              <>
                <span className="inline-flex h-9 items-center rounded-lg bg-amber-100 px-3 text-[13px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  Anulación pendiente de aprobación
                </span>
                {isAdminOrOwner && (
                  <>
                    <button
                      type="button"
                      onClick={handleApproveCancel}
                      disabled={approving || rejecting}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {approving ? "Aprobando…" : "Aprobar anulación"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectCancel}
                      disabled={approving || rejecting}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {rejecting ? "Rechazando…" : "Rechazar solicitud"}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Resumen: total, domicilio si aplica */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5 print:shadow-none print:ring-0">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Resumen de la factura
        </h2>
        <div className="mt-4 flex flex-nowrap gap-4 overflow-x-auto">
          <div className="min-w-0 flex-1 shrink-0 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Subtotal ítems
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              $ {formatMoney(itemsSubtotal)}
            </p>
          </div>
          {hasAnyDiscount && (
            <div className="min-w-0 flex-1 shrink-0 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Descuentos aplicados
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
                $ {formatMoney(totalDiscount)}
              </p>
            </div>
          )}
          {sale.is_delivery && deliveryFee > 0 && (
            <div className="min-w-0 flex-1 shrink-0 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Valor domicilio
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
                $ {formatMoney(deliveryFee)}
              </p>
            </div>
          )}
          <div className="min-w-0 flex-1 shrink-0 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total facturado
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-200 sm:text-2xl">
              $ {formatMoney(sale.total)}
            </p>
          </div>
        </div>
      </div>

      {/* Dos columnas: Identificación + Ítems (en tirilla impresión una columna) */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1fr] print-tirilla-single-col">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 print:shadow-none print:ring-0">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Identificación
            </h2>
            <dl className="mt-3 space-y-2 text-[14px]">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Nº factura</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{displayInvoiceNumber(sale.invoice_number)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Cliente</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{customerName}</dd>
              </div>
              {sale.customers?.phone && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Teléfono</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100">{sale.customers.phone}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Vendedor</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{userName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Sucursal</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{branchName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Método de pago</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{paymentLabel}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Tipo</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{sale.is_delivery ? "Domicilio" : "En tienda"}</dd>
              </div>
              {sale.is_delivery && deliveryAddress && (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Dirección</dt>
                    <dd className="text-right font-medium text-slate-800 dark:text-slate-100">
                      {deliveryAddress.label}: {deliveryAddress.address}
                      {deliveryAddress.reference_point ? ` (${deliveryAddress.reference_point})` : ""}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 print:shadow-none print:ring-0">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Ítems de la factura
          </h2>
          {items.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-700">
              <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Sin ítems registrados</p>
            </div>
          ) : (
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
                  {items.map((it) => (
                    <tr key={it.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-800 dark:text-slate-100">
                            {it.products?.name ?? "—"}
                            {it.products?.sku && (
                              <span className="ml-1.5 text-[12px] font-normal text-slate-500 dark:text-slate-400">({it.products.sku})</span>
                            )}
                          </span>
                          {hasLineDiscount(it) && (
                            <span className="inline-flex w-fit items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                              Descuento: {lineDiscountLabel(it)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{it.quantity}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">$ {formatMoney(it.unit_price)}</td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">$ {formatMoney(lineSubtotal(it))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={3} className="py-2.5 pr-2 text-right text-[13px] font-medium text-slate-600 dark:text-slate-400">
                      Subtotal
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">
                      $ {formatMoney(itemsSubtotal)}
                    </td>
                  </tr>
                  {hasAnyDiscount && (
                    <tr>
                      <td colSpan={3} className="py-1.5 pr-2 text-right text-[13px] text-slate-600 dark:text-slate-400">
                        Descuentos
                      </td>
                      <td className="py-1.5 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        −$ {formatMoney(totalDiscount)}
                      </td>
                    </tr>
                  )}
                  {sale.is_delivery && deliveryFee > 0 && (
                    <>
                      <tr>
                        <td colSpan={3} className="py-1.5 pr-2 text-right text-[13px] text-slate-600 dark:text-slate-400">
                          <div className="flex items-center justify-end gap-2">
                            <span>Envío</span>
                            {sale.delivery_persons && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                ({sale.delivery_persons.code} - {sale.delivery_persons.name})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100">
                              $ {formatMoney(deliveryFee)}
                            </span>
                            {!sale.delivery_paid ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" title="Pago de envío pendiente">
                                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Pendiente
                                </span>
                                <label className="inline-flex cursor-pointer items-center gap-2 px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:opacity-80 dark:text-slate-200">
                                  <input
                                    type="checkbox"
                                    checked={false}
                                    onChange={handleMarkDeliveryAsPaid}
                                    disabled={markingDeliveryPaid}
                                    className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600"
                                  />
                                  <span className={markingDeliveryPaid ? "opacity-50" : ""}>
                                    {markingDeliveryPaid ? "Guardando…" : "Pagado"}
                                  </span>
                                </label>
                              </div>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[12px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" title="Envío pagado">
                                <MdCheck className="mr-1.5 h-4 w-4" aria-hidden />
                                Pagado
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td colSpan={3} className="py-2.5 pr-2 text-right text-[13px] font-bold text-slate-700 dark:text-slate-200">
                      Total
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-bold text-slate-900 dark:text-slate-50">
                      $ {formatMoney(sale.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Sección de Garantías */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 print:shadow-none print:ring-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Garantías {warranties.length > 0 && `(${warranties.length})`}
          </h2>
          <Link
            href={`/garantias/nueva?sale_id=${sale.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 print:hidden"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva garantía
          </Link>
        </div>
        <div className="mt-4">
          {warranties.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/30">
              <svg className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="mt-3 text-[14px] font-medium text-slate-600 dark:text-slate-400">
                No hay garantías registradas para esta venta
              </p>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-500">
                Las garantías relacionadas con los productos de esta factura aparecerán aquí.
              </p>
              <Link
                href={`/garantias/nueva?sale_id=${sale.id}`}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover print:hidden"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar garantía
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {warranties.map((warranty) => {
                const statusColors: Record<string, { bg: string; text: string }> = {
                  pending: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300" },
                  approved: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300" },
                  rejected: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300" },
                  processed: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
                };
                const statusLabels: Record<string, string> = {
                  pending: "Pendiente",
                  approved: "Aprobada",
                  rejected: "Rechazada",
                  processed: "Procesada",
                };
                const typeLabels: Record<string, string> = {
                  exchange: "Cambio",
                  refund: "Devolución",
                  repair: "Reparación",
                };
                const color = statusColors[warranty.status] || statusColors.pending;
                return (
                  <Link
                    key={warranty.id}
                    href="/garantias"
                    className="block rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                            {warranty.products?.name ?? "Producto"}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${color.bg} ${color.text}`}>
                            {statusLabels[warranty.status]}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">
                          {typeLabels[warranty.warranty_type]} · {formatDate(warranty.created_at)}
                        </p>
                        {warranty.replacement_product && (
                          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-500">
                            Reemplazo: {warranty.replacement_product.name}
                          </p>
                        )}
                        <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400 line-clamp-2">
                          {warranty.reason}
                        </p>
                      </div>
                      <svg className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={cancelOpen}
        onClose={() => { setCancelOpen(false); setCancelReason(""); }}
        title="Anular factura"
        message={
          sale.branches?.invoice_cancel_requires_approval
            ? `La anulación de la factura #${displayInvoiceNumber(sale.invoice_number)} requerirá aprobación de un administrador. Escribe el motivo de la solicitud.`
            : `¿Anular la factura #${displayInvoiceNumber(sale.invoice_number)}? La venta quedará en estado "Anulada" y no se podrá revertir desde esta pantalla.`
        }
        confirmLabel={sale.branches?.invoice_cancel_requires_approval ? "Enviar solicitud" : "Anular"}
        onConfirm={handleCancel}
        loading={cancelling}
        ariaTitle={`Anular factura ${displayInvoiceNumber(sale.invoice_number)}`}
        icon={<MdCancel className="h-5 w-5" aria-hidden />}
        reasonLabel="Motivo de anulación"
        reasonValue={cancelReason}
        reasonOnChange={setCancelReason}
        reasonPlaceholder="Ej. Error en datos del cliente, venta duplicada…"
      />
    </div>
    </>
  );
}
