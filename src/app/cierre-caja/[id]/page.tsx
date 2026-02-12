"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/app/components/Breadcrumb";
import { MdStore, MdLocalShipping } from "react-icons/md";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

type CashClosingDetail = {
  id: string;
  branch_id: string;
  user_id: string;
  closing_date: string;
  expected_cash: number;
  expected_transfer: number;
  actual_cash: number;
  actual_transfer: number;
  cash_difference: number;
  transfer_difference: number;
  total_sales: number;
  physical_sales: number;
  delivery_sales: number;
  total_units: number;
  cancelled_invoices: number;
  cancelled_total: number;
  warranties_count: number;
  notes: string | null;
  difference_reason: string | null;
  created_at: string;
  users: { name: string } | null;
};

type ProductItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  products: { name: string; sku: string | null } | null;
  total: number; // Total calculado para este producto
};

function getDayBounds(dateStr: string): { start: string; end: string } {
  // Parsear fecha YYYY-MM-DD en zona horaria local (igual que en nuevo cierre)
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function lineSubtotal(item: ProductItem): number {
  // Calcular igual que en la página de nuevo cierre de caja
  const base = item.quantity * Number(item.unit_price);
  const discountPercent = Number(item.discount_percent || 0) / 100;
  const discountAmount = Number(item.discount_amount || 0);
  const total = base * (1 - discountPercent) - discountAmount;
  return Math.max(0, Math.round(total));
}

function hasLineDiscount(item: ProductItem): boolean {
  return Number(item.discount_percent || 0) > 0 || Number(item.discount_amount || 0) > 0;
}

function lineDiscountLabel(item: ProductItem): string {
  const pct = Number(item.discount_percent || 0);
  const amt = Number(item.discount_amount || 0);
  if (pct > 0 && amt > 0) return `${pct}% · $ ${formatMoney(amt)}`;
  if (pct > 0) return `${pct}%`;
  if (amt > 0) return `$ ${formatMoney(amt)}`;
  return "";
}

export default function CashClosingDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [closing, setClosing] = useState<CashClosingDetail | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [totalDeliveryFees, setTotalDeliveryFees] = useState(0);
  const [deliveryByPerson, setDeliveryByPerson] = useState<Array<{ personId: string; personName: string; personCode: string; total: number; unpaid: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: closingData, error: closingError } = await supabase
        .from("cash_closings")
        .select("*, users!user_id(name)")
        .eq("id", id)
        .single();

      if (cancelled) return;
      if (closingError || !closingData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const closing = closingData as CashClosingDetail;
      setClosing(closing);

      // Obtener productos vendidos del día
      // closing_date viene como string YYYY-MM-DD desde la BD
      const { start, end } = getDayBounds(closing.closing_date);
      
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("id, delivery_fee, total, delivery_person_id, delivery_paid, delivery_persons(name, code)")
        .eq("branch_id", closing.branch_id)
        .eq("status", "completed")
        .gte("created_at", start)
        .lte("created_at", end);
      
      if (salesError) {
        console.error("Error fetching sales:", salesError);
      }

      if (cancelled) return;

      // Calcular total de delivery fees y desglose por domiciliario
      const sales = (salesData ?? []) as Array<{
        id: string;
        delivery_fee: number | null;
        delivery_person_id: string | null;
        delivery_paid: boolean;
        delivery_persons: { name: string; code: string } | null;
      }>;
      
      const deliveryFees = sales.reduce((sum, s) => {
        return sum + (Number(s.delivery_fee) || 0);
      }, 0);
      setTotalDeliveryFees(deliveryFees);

      // Calcular desglose por domiciliario
      const deliveryByPersonMap: Record<string, { personId: string; personName: string; personCode: string; total: number; unpaid: number }> = {};
      sales.forEach((s) => {
        if (s.delivery_person_id && s.delivery_fee) {
          const deliveryFee = Number(s.delivery_fee) || 0;
          const personId = s.delivery_person_id;
          const personName = s.delivery_persons?.name || "Sin asignar";
          const personCode = s.delivery_persons?.code || "";
          
          if (!deliveryByPersonMap[personId]) {
            deliveryByPersonMap[personId] = {
              personId,
              personName,
              personCode,
              total: 0,
              unpaid: 0,
            };
          }
          deliveryByPersonMap[personId].total += deliveryFee;
          if (!s.delivery_paid) {
            deliveryByPersonMap[personId].unpaid += deliveryFee;
          }
        }
      });
      setDeliveryByPerson(Object.values(deliveryByPersonMap).sort((a, b) => a.personCode.localeCompare(b.personCode)));

      const saleIds = (salesData ?? []).map((s) => s.id);
      if (saleIds.length > 0) {
        const { data: itemsData } = await supabase
          .from("sale_items")
          .select("product_id, quantity, unit_price, discount_percent, discount_amount, products(name, sku)")
          .in("sale_id", saleIds);

        if (cancelled) return;
        
        // Agrupar productos por product_id y calcular totales
        const items = (itemsData ?? []) as ProductItem[];
        const grouped: Record<string, ProductItem & { total: number }> = {};
        items.forEach((it) => {
          const subtotal = lineSubtotal(it);
          if (!grouped[it.product_id]) {
            grouped[it.product_id] = {
              ...it,
              quantity: 0,
              total: 0,
            };
          }
          grouped[it.product_id].quantity += it.quantity;
          grouped[it.product_id].total += subtotal;
        });
        
        setProducts(Object.values(grouped).sort((a, b) => {
          const nameA = a.products?.name ?? "";
          const nameB = b.products?.name ?? "";
          return nameA.localeCompare(nameB);
        }));
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
          <p className="text-slate-500 dark:text-slate-400">Cargando cierre de caja...</p>
        </div>
      </div>
    );
  }

  if (notFound || !closing) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Cierres de caja", href: "/cierre-caja" },
              { label: "Detalle", href: "#" },
            ]}
          />
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
            <p className="text-lg font-semibold text-red-800 dark:text-red-200">
              Cierre de caja no encontrado
            </p>
            <Link
              href="/cierre-caja"
              className="mt-4 inline-block text-ov-pink hover:text-ov-pink-hover"
            >
              ← Volver a cierres de caja
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cashDiff = closing.cash_difference;
  const transferDiff = closing.transfer_difference;
  const totalDiff = cashDiff + transferDiff;
  const totalDay = closing.expected_cash + closing.expected_transfer;

  return (
    <div className="space-y-6">
      {/* Card: título + métricas y acciones */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Cierres de caja", href: "/cierre-caja" },
            { label: `Cierre ${formatDate(closing.closing_date)}` },
          ]}
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              Cierre de caja
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              <span>{formatDate(closing.closing_date)} · {formatTime(closing.created_at)}</span>
              <span>·</span>
              <span>{closing.users?.name ?? "—"}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/cierre-caja"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Volver a cierres de caja"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4 sm:gap-6">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total del día</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
                $ {formatMoney(totalDay)}
              </p>
            </div>
            <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Facturas anuladas</p>
              <p className={`mt-0.5 text-lg font-bold sm:text-xl ${
                closing.cancelled_invoices > 0 
                  ? "text-red-600 dark:text-red-400" 
                  : "text-slate-700 dark:text-slate-300"
              }`}>
                {closing.cancelled_invoices}
              </p>
              {closing.cancelled_total > 0 && (
                <p className="mt-0.5 text-[13px] font-medium text-red-500 dark:text-red-400">
                  $ {formatMoney(closing.cancelled_total)}
                </p>
              )}
            </div>
            <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Garantías</p>
              <p className="mt-0.5 text-lg font-bold text-slate-700 dark:text-slate-300 sm:text-xl">
                {closing.warranties_count}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen: arqueo de caja */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Arqueo de caja
        </h2>
        <div className="mt-4 flex flex-nowrap gap-4 overflow-x-auto">
          <div className="min-w-0 flex-1 shrink-0 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Efectivo esperado
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              $ {formatMoney(closing.expected_cash)}
            </p>
          </div>
          <div className="min-w-0 flex-1 shrink-0 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Efectivo ingresado
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              $ {formatMoney(closing.actual_cash)}
            </p>
          </div>
          <div className={`min-w-0 flex-1 shrink-0 rounded-xl p-4 ${
            cashDiff === 0
              ? "bg-green-50 dark:bg-green-900/20"
              : cashDiff < 0
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-orange-50 dark:bg-orange-900/20"
          }`}>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${
              cashDiff === 0
                ? "text-green-600 dark:text-green-400"
                : cashDiff < 0
                ? "text-red-600 dark:text-red-400"
                : "text-orange-600 dark:text-orange-400"
            }`}>
              Diferencia efectivo
            </p>
            <p className={`mt-1 text-xl font-bold sm:text-2xl ${
              cashDiff === 0
                ? "text-green-800 dark:text-green-200"
                : cashDiff < 0
                ? "text-red-800 dark:text-red-200"
                : "text-orange-800 dark:text-orange-200"
            }`}>
              {cashDiff >= 0 ? "+" : ""}$ {formatMoney(cashDiff)}
            </p>
          </div>
          <div className="min-w-0 flex-1 shrink-0 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Transferencia esperada
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              $ {formatMoney(closing.expected_transfer)}
            </p>
          </div>
          <div className="min-w-0 flex-1 shrink-0 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Transferencia ingresada
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              $ {formatMoney(closing.actual_transfer)}
            </p>
          </div>
          <div className={`min-w-0 flex-1 shrink-0 rounded-xl p-4 ${
            transferDiff === 0
              ? "bg-green-50 dark:bg-green-900/20"
              : transferDiff < 0
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-orange-50 dark:bg-orange-900/20"
          }`}>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${
              transferDiff === 0
                ? "text-green-600 dark:text-green-400"
                : transferDiff < 0
                ? "text-red-600 dark:text-red-400"
                : "text-orange-600 dark:text-orange-400"
            }`}>
              Diferencia transferencia
            </p>
            <p className={`mt-1 text-xl font-bold sm:text-2xl ${
              transferDiff === 0
                ? "text-green-800 dark:text-green-200"
                : transferDiff < 0
                ? "text-red-800 dark:text-red-200"
                : "text-orange-800 dark:text-orange-200"
            }`}>
              {transferDiff >= 0 ? "+" : ""}$ {formatMoney(transferDiff)}
            </p>
          </div>
        </div>
        {totalDiff !== 0 && closing.difference_reason && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
              <strong>Motivo de la diferencia:</strong> {closing.difference_reason}
            </p>
          </div>
        )}
      </div>

      {/* Dos columnas: Identificación + Productos vendidos */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Identificación
            </h2>
            <dl className="mt-3 space-y-2 text-[14px]">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Fecha de cierre</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{formatDate(closing.closing_date)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Hora</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{formatTime(closing.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Responsable</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{closing.users?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Total ventas</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{closing.total_sales}</dd>
              </div>
              {closing.total_sales > 0 && (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">
                      <MdStore className="inline h-3.5 w-3.5 mr-1" />
                      Físicas
                    </dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-100">
                      {closing.physical_sales} ({Math.round((closing.physical_sales / closing.total_sales) * 100)}%)
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">
                      <MdLocalShipping className="inline h-3.5 w-3.5 mr-1" />
                      Delivery
                    </dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-100">
                      {closing.delivery_sales} ({Math.round((closing.delivery_sales / closing.total_sales) * 100)}%)
                    </dd>
                  </div>
                </>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Total unidades</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{closing.total_units}</dd>
              </div>
              {closing.cancelled_invoices > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Facturas anuladas</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100">
                    {closing.cancelled_invoices} · $ {formatMoney(closing.cancelled_total)}
                  </dd>
                </div>
              )}
              {closing.warranties_count > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Garantías</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100">{closing.warranties_count}</dd>
                </div>
              )}
            </dl>
          </div>
          {/* Notas */}
          {closing.notes && (
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Notas
              </h2>
              <p className="mt-3 text-[14px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {closing.notes}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Productos vendidos
          </h2>
          {products.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-700">
              <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Sin productos registrados</p>
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
                  {products.map((it, idx) => (
                    <tr key={`${it.product_id}-${idx}`} className="border-b border-slate-100 dark:border-slate-800">
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
                      <td className="py-2.5 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">$ {formatMoney(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={3} className="py-2.5 pr-2 text-right text-[13px] font-medium text-slate-600 dark:text-slate-400">
                      Subtotal productos
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">
                      $ {formatMoney(products.reduce((sum, it) => sum + it.total, 0))}
                    </td>
                  </tr>
                  {totalDeliveryFees > 0 && (
                    <tr>
                      <td colSpan={3} className="py-1.5 pr-2 text-right text-[13px] text-slate-500 dark:text-slate-500">
                        Domicilios (excluido)
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-[13px] text-slate-500 dark:text-slate-500 line-through">
                        $ {formatMoney(totalDeliveryFees)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td colSpan={3} className="py-2.5 pr-2 text-right text-[13px] font-bold text-slate-700 dark:text-slate-200">
                      Total del día
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-bold text-slate-900 dark:text-slate-50">
                      $ {formatMoney(closing.expected_cash + closing.expected_transfer)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Desglose por domiciliario */}
      {deliveryByPerson.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Envíos a pagar
          </h2>
          <div className="mt-3 space-y-3">
            {deliveryByPerson.map((person) => {
              const isPaid = person.unpaid === 0;
              return (
                <div key={person.personId} className="flex items-center justify-between text-[14px]">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={async (e) => {
                        const supabase = createClient();
                        // Obtener todas las ventas del día con este domiciliario
                        const { start, end } = getDayBounds(closing!.closing_date);
                        const { data: salesData } = await supabase
                          .from("sales")
                          .select("id")
                          .eq("branch_id", closing!.branch_id)
                          .eq("status", "completed")
                          .eq("delivery_person_id", person.personId)
                          .gte("created_at", start)
                          .lte("created_at", end);
                        
                        if (salesData && salesData.length > 0) {
                          const saleIds = salesData.map(s => s.id);
                          const updateValue = e.target.checked;
                          await supabase
                            .from("sales")
                            .update({ 
                              delivery_paid: updateValue,
                              delivery_paid_at: updateValue ? new Date().toISOString() : null
                            })
                            .in("id", saleIds);
                          
                          // Actualizar estado local
                          setDeliveryByPerson(prev => 
                            prev.map(p => 
                              p.personId === person.personId 
                                ? { ...p, unpaid: updateValue ? 0 : person.total }
                                : p
                            )
                          );
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30 dark:border-slate-600"
                    />
                    <span className={`${isPaid ? 'text-slate-400 line-through' : 'text-slate-700'} dark:${isPaid ? 'text-slate-600' : 'text-slate-300'}`}>
                      {person.personCode} - {person.personName}
                    </span>
                  </div>
                  <div className="text-right">
                    {person.unpaid > 0 ? (
                      <>
                        <span className="font-bold text-slate-900 dark:text-slate-50">
                          $ {formatMoney(person.unpaid)}
                        </span>
                        {person.unpaid < person.total && (
                          <span className="ml-2 text-[12px] text-slate-500 dark:text-slate-400">
                            (de $ {formatMoney(person.total)})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                        Pagado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
              <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400">Total pendiente</span>
              <span className="text-[14px] font-bold text-slate-900 dark:text-slate-50">
                $ {formatMoney(deliveryByPerson.reduce((sum, p) => sum + p.unpaid, 0))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
