"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DashboardData = {
  totalIncome: number; // Ingresos tienda (sin delivery fees)
  totalDeliveryFees: number; // Total envíos (no es ingreso de la tienda)
  unpaidDeliveryFees: number; // Envíos pendientes de pago
  cash: number;
  transfer: number;
  totalSales: number;
  physicalSales: number;
  deliverySales: number;
  cashSales: number;
  transferSales: number;
  cancelledInvoices: number;
  cancelledTotal: number;
  cancelledList: { invoice_number: string; total: number }[];
  topProducts: { name: string; units: number; total: number }[];
  last7Days: { day: string; sales: number }[];
  yesterdayIncome: number;
  totalStockInvestment: number;
  expectedProfit: number;
  grossProfit: number;
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getDayBounds(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function DashboardPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hideSensitiveInfo, setHideSensitiveInfo] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) return;
      setBranchId(ub.branch_id);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!branchId) {
      setDashboardData(null);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);
    const { start, end } = getDayBounds(selectedDate);
    const yesterday = new Date(selectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const { start: yStart, end: yEnd } = getDayBounds(yesterday);

    (async () => {
      const [
        { data: salesDay },
        { data: salesYesterday },
        { data: salesLast7 },
        { data: inventoryData },
      ] = await Promise.all([
        supabase
          .from("sales")
          .select("id, total, payment_method, amount_cash, amount_transfer, is_delivery, status, invoice_number, delivery_fee, delivery_paid")
          .eq("branch_id", branchId)
          .gte("created_at", start)
          .lte("created_at", end),
        supabase
          .from("sales")
          .select("total")
          .eq("branch_id", branchId)
          .eq("status", "completed")
          .gte("created_at", yStart)
          .lte("created_at", yEnd),
        supabase
          .from("sales")
          .select("total, created_at, delivery_fee")
          .eq("branch_id", branchId)
          .eq("status", "completed")
          .gte("created_at", (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const d = new Date(today);
            d.setDate(d.getDate() - 6);
            d.setHours(0, 0, 0, 0);
            return d.toISOString();
          })())
          .lte("created_at", (() => {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            return today.toISOString();
          })()),
        supabase
          .from("inventory")
          .select("product_id, quantity, products(base_cost, base_price)")
          .eq("branch_id", branchId),
      ]);

      if (cancelled) return;

      const sales = (salesDay ?? []) as Array<{
        id: string;
        total: number;
        payment_method: string;
        amount_cash: number | null;
        amount_transfer: number | null;
        is_delivery: boolean;
        status: string;
        invoice_number: string;
        delivery_fee: number | null;
        delivery_paid: boolean;
      }>;
      const completed = sales.filter((s) => s.status === "completed");
      
      // Calcular ingresos tienda (sin delivery fees) y delivery fees por separado
      let totalStoreIncome = 0;
      let totalDeliveryFees = 0;
      let unpaidDeliveryFees = 0;
      let cash = 0;
      let transfer = 0;
      let cashSales = 0;
      let transferSales = 0;
      completed.forEach((s) => {
        const deliveryFee = Number(s.delivery_fee) || 0;
        const saleAmount = Number(s.total) - deliveryFee; // Ingreso real de la tienda
        totalStoreIncome += saleAmount;
        totalDeliveryFees += deliveryFee;
        // Calcular envíos pendientes (no pagados)
        if (deliveryFee > 0 && !s.delivery_paid) {
          unpaidDeliveryFees += deliveryFee;
        }
        
        if (s.payment_method === "cash") {
          cash += saleAmount;
          cashSales += 1;
        } else if (s.payment_method === "transfer") {
          transfer += saleAmount;
          transferSales += 1;
        } else if (s.payment_method === "mixed") {
          const ac = Number(s.amount_cash ?? 0);
          const at = Number(s.amount_transfer ?? 0);
          const sumMixed = ac + at;
          // Proporcionalmente distribuir el saleAmount (sin delivery) entre cash y transfer
          if (sumMixed > 0 && Math.abs(sumMixed - Number(s.total)) < 0.01) {
            // Si los amounts coinciden con el total, restar delivery proporcionalmente
            const deliveryRatio = deliveryFee / Number(s.total);
            const cashDelivery = ac * deliveryRatio;
            const transferDelivery = at * deliveryRatio;
            cash += ac - cashDelivery;
            transfer += at - transferDelivery;
            if (ac > 0) cashSales += 1;
            if (at > 0) transferSales += 1;
          } else if (sumMixed > 0) {
            const ratio = saleAmount / sumMixed;
            const cashPart = Math.round(ac * ratio);
            const transferPart = saleAmount - cashPart;
            cash += cashPart;
            transfer += transferPart;
            if (ac > 0) cashSales += 1;
            if (at > 0) transferSales += 1;
          } else {
            cash += saleAmount;
            cashSales += 1;
          }
        }
      });
      
      const totalIncome = totalStoreIncome; // Total ingresos tienda (sin delivery)
      const physicalSales = completed.filter((s) => !s.is_delivery).length;
      const deliverySales = completed.filter((s) => s.is_delivery).length;
      const cancelledSales = sales.filter((s) => s.status === "cancelled");
      const cancelledTotal = cancelledSales.reduce((a, s) => a + Number(s.total), 0);
      const cancelledList = cancelledSales.map((s) => ({ invoice_number: s.invoice_number, total: Number(s.total) }));
      const yesterdayIncome = (salesYesterday ?? []).reduce((a, s) => a + Number((s as { total: number }).total), 0);

      const byDay: Record<string, number> = {};
      // Calcular últimos 7 días desde hoy (no desde selectedDate)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const last7Start = new Date(today);
      last7Start.setDate(last7Start.getDate() - 6);
      last7Start.setHours(0, 0, 0, 0);
      (salesLast7 ?? []).forEach((s: { total: number; created_at: string; delivery_fee: number | null }) => {
        const saleDate = new Date(s.created_at);
        saleDate.setHours(0, 0, 0, 0);
        const key = saleDate.toDateString();
        const deliveryFee = Number(s.delivery_fee) || 0;
        const storeIncome = Number(s.total) - deliveryFee; // Solo ingresos tienda (sin delivery)
        byDay[key] = (byDay[key] ?? 0) + storeIncome;
      });
      const last7Days: { day: string; sales: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(last7Start);
        d.setDate(d.getDate() + i);
        const key = d.toDateString();
        last7Days.push({
          day: DAY_LABELS[d.getDay()],
          sales: byDay[key] ?? 0,
        });
      }

      const completedIds = completed.map((s) => s.id);
      let items: Array<{ product_id: string; quantity: number; unit_price: number; discount_percent: number; discount_amount: number; products: { name: string; base_cost: number | null } | null }> = [];
      if (completedIds.length > 0) {
        const { data: itemsDay } = await supabase
          .from("sale_items")
          .select("product_id, quantity, unit_price, discount_percent, discount_amount, products(name, base_cost)")
          .in("sale_id", completedIds);
        items = (itemsDay ?? []) as typeof items;
      }
      if (cancelled) return;

      const byProduct: Record<string, { name: string; units: number; total: number }> = {};
      items.forEach((it) => {
        const lineTotal = Math.max(
          0,
          Math.round(
            it.quantity * Number(it.unit_price) * (1 - Number(it.discount_percent || 0) / 100) - Number(it.discount_amount || 0)
          )
        );
        const name = it.products?.name ?? "—";
        if (!byProduct[it.product_id]) byProduct[it.product_id] = { name, units: 0, total: 0 };
        byProduct[it.product_id].units += it.quantity;
        byProduct[it.product_id].total += lineTotal;
      });
      const topProducts = Object.values(byProduct)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const inventory = (inventoryData ?? []) as Array<{
        product_id: string;
        quantity: number;
        products: { base_cost: number | null; base_price: number | null } | null;
      }>;
      const totalStockInvestment = inventory.reduce((sum, inv) => {
        const cost = Number(inv.products?.base_cost ?? 0);
        const qty = Number(inv.quantity ?? 0);
        return sum + cost * qty;
      }, 0);
      const expectedProfit = inventory.reduce((sum, inv) => {
        const cost = Number(inv.products?.base_cost ?? 0);
        const price = Number(inv.products?.base_price ?? 0);
        const qty = Number(inv.quantity ?? 0);
        if (price > 0 && cost > 0) {
          return sum + (price - cost) * qty;
        }
        return sum;
      }, 0);

      const grossProfit = items.reduce((sum, it) => {
        const unitPrice = Number(it.unit_price ?? 0);
        const discountPercent = Number(it.discount_percent ?? 0);
        const discountAmount = Number(it.discount_amount ?? 0);
        const quantity = Number(it.quantity ?? 0);
        const baseCost = Number(it.products?.base_cost ?? 0);
        
        // Precio de venta con descuento aplicado
        const salePriceWithDiscount = Math.max(
          0,
          unitPrice * (1 - discountPercent / 100) - discountAmount
        );
        
        // Ganancia por item = (precio de venta - costo) * cantidad
        if (baseCost > 0) {
          return sum + (salePriceWithDiscount - baseCost) * quantity;
        }
        return sum;
      }, 0);

      setDashboardData({
        totalIncome,
        totalDeliveryFees,
        unpaidDeliveryFees,
        cash,
        transfer,
        totalSales: completed.length,
        physicalSales,
        deliverySales,
        cashSales,
        transferSales,
        cancelledInvoices: cancelledSales.length,
        cancelledTotal,
        cancelledList,
        topProducts,
        last7Days,
        yesterdayIncome,
        totalStockInvestment,
        expectedProfit,
        grossProfit,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [branchId, selectedDate]);

  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck.getTime() === today.getTime()) {
      return "Hoy";
    } else if (dateToCheck.getTime() === yesterday.getTime()) {
      return "Ayer";
    } else {
      return dateToLocaleDateString(date);
    }
  };

  const dateToLocaleDateString = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate <= today) {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const data = dashboardData ?? {
    totalIncome: 0,
    totalDeliveryFees: 0,
    unpaidDeliveryFees: 0,
    cash: 0,
    transfer: 0,
    totalSales: 0,
    physicalSales: 0,
    deliverySales: 0,
    cashSales: 0,
    transferSales: 0,
    cancelledInvoices: 0,
    cancelledTotal: 0,
    cancelledList: [],
    topProducts: [],
    last7Days: DAY_LABELS.map((day) => ({ day, sales: 0 })),
    yesterdayIncome: 0,
    totalStockInvestment: 0,
    expectedProfit: 0,
    grossProfit: 0,
  };
  const warrantiesToday = 0; // Sin tabla de garantías en DB aún

  const formatSensitiveValue = (value: number | string, type: "currency" | "number" = "currency") => {
    if (hideSensitiveInfo) {
      return type === "currency" ? "***" : "***";
    }
    if (type === "currency") {
      return `$${typeof value === "number" ? value.toLocaleString("es-CO") : value}`;
    }
    return typeof value === "number" ? value.toLocaleString("es-CO") : value;
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
            Dashboard
          </h1>
          <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            Resumen de ventas e ingresos de tu sucursal. Cambia el día para ver métricas de esa fecha.
          </p>
        </div>
        <div className="flex items-center gap-2">
            {/* Botón Cerrar caja */}
            <button
              onClick={() => router.push(`/cierre-caja/nuevo?fecha=${selectedDate.toISOString().split("T")[0]}`)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Cerrar caja
            </button>
            {/* Botón para ocultar información sensible */}
            <button
              onClick={() => setHideSensitiveInfo(!hideSensitiveInfo)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              title={hideSensitiveInfo ? "Mostrar información" : "Ocultar información sensible"}
            >
              {hideSensitiveInfo ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>

            {/* Navegación temporal */}
            <button
              onClick={goToPreviousDay}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              title="Día anterior"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                isToday
                  ? "bg-slate-900 text-white dark:bg-slate-800"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {formatDate(selectedDate)}
            </button>
            <button
              onClick={goToNextDay}
              disabled={isToday}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 ${
                isToday
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
              title="Día siguiente"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
        </div>
      </header>

      {loading && (
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Cargando métricas…</p>
      )}

      {/* Métricas principales - Primera fila */}
      <section className={`grid gap-3 ${data.unpaidDeliveryFees > 0 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {/* Ingreso total */}
        <div className="rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Ingreso tienda (nuestro)
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                {formatSensitiveValue(data.totalIncome)}
              </p>
            </div>
            <svg
              className="ml-3 h-5 w-5 text-slate-400 dark:text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          {data.totalDeliveryFees > 0 && (
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                  Envíos totales (+)
                </p>
                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  +{formatSensitiveValue(data.totalDeliveryFees)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Egresos */}
        {data.unpaidDeliveryFees > 0 && (
          <div className="rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Egresos
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                  {formatSensitiveValue(data.unpaidDeliveryFees)}
                </p>
              </div>
              <svg
                className="ml-3 h-5 w-5 text-slate-400 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">
              Envíos pendientes y otros conceptos
            </p>
          </div>
        )}

        {/* Efectivo */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Efectivo
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                {formatSensitiveValue(data.cash)}
              </p>
            </div>
            <svg
              className="ml-3 h-5 w-5 text-slate-400 dark:text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                  Porcentaje del total:
                </span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                  {data.totalIncome > 0 ? Math.round((data.cash / data.totalIncome) * 100) : 0}%
                </span>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                  Ventas en efectivo: {hideSensitiveInfo ? "***" : data.cashSales}
                </p>
                {!hideSensitiveInfo && (
                  <p className="mt-1 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Ticket promedio:{" "}
                    {formatSensitiveValue(
                      data.cashSales > 0 ? Math.round(data.cash / data.cashSales) : 0
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </details>

        {/* Transferencia */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Transferencia
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                {formatSensitiveValue(data.transfer)}
              </p>
            </div>
            <svg
              className="ml-3 h-5 w-5 text-slate-400 dark:text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                  Porcentaje del total:
                </span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                  {data.totalIncome > 0 ? Math.round((data.transfer / data.totalIncome) * 100) : 0}%
                </span>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                  Ventas con transferencia: {hideSensitiveInfo ? "***" : data.transferSales}
                </p>
                {!hideSensitiveInfo && (
                  <p className="mt-1 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Ticket promedio:{" "}
                    {formatSensitiveValue(
                      data.transferSales > 0 ? Math.round(data.transfer / data.transferSales) : 0
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </details>
      </section>

      {/* Métricas secundarias - Segunda fila (3 cards) */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Inversión total en stock */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Inversión total en stock
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                {formatSensitiveValue(data.totalStockInvestment)}
              </p>
            </div>
            <svg
              className="ml-3 h-5 w-5 text-slate-400 dark:text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="space-y-2">
              {!hideSensitiveInfo && (
                <>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                      Valor total de tu inventario según el costo de compra de cada producto.
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Ganancia esperada
                    </p>
                    <p className="mt-1 text-[18px] font-bold text-emerald-700 dark:text-emerald-400">
                      {formatSensitiveValue(data.expectedProfit)}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Ganancia potencial al vender todo el inventario.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </details>

        {/* Garantías gestionadas */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Garantías gestionadas
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                {hideSensitiveInfo ? "***" : warrantiesToday}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                {formatDate(selectedDate)}
              </p>
            </div>
            <svg
              className="ml-3 h-5 w-5 text-slate-400 dark:text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="space-y-2">
                {!hideSensitiveInfo && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-orange-50 p-2 text-center dark:bg-orange-950">
                      <p className="text-[12px] font-bold text-ov-pink dark:text-ov-pink-muted">
                        0
                      </p>
                      <p className="text-[10px] font-medium text-orange-600 dark:text-orange-400">
                        Pendientes
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2 text-center dark:bg-emerald-950">
                      <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                        0
                      </p>
                      <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Aprobadas
                      </p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-center dark:bg-red-950">
                      <p className="text-[12px] font-bold text-red-700 dark:text-red-300">
                        0
                      </p>
                      <p className="text-[10px] font-medium text-red-600 dark:text-red-400">
                        Rechazadas
                      </p>
                    </div>
                  </div>
                )}
              {!hideSensitiveInfo && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Valor total en garantías: {formatSensitiveValue(0)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </details>

        {/* Facturas anuladas */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Facturas anuladas
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                {hideSensitiveInfo ? "***" : data.cancelledInvoices}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                {formatDate(selectedDate)}
              </p>
            </div>
            <svg
              className="ml-3 h-5 w-5 text-slate-400 dark:text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="space-y-2">
              {data.cancelledInvoices > 0 ? (
                <>
                  {data.cancelledList.slice(0, 3).map((c, i) => (
                    <div key={i} className="rounded-lg bg-red-50 p-3 dark:bg-red-950">
                      <p className="text-[12px] font-bold text-red-800 dark:text-red-200">
                        Factura #{c.invoice_number}
                      </p>
                      {!hideSensitiveInfo && (
                        <p className="mt-1 text-[11px] font-medium text-red-700 dark:text-red-300">
                          Valor: {formatSensitiveValue(c.total)}
                        </p>
                      )}
                    </div>
                  ))}
                  {!hideSensitiveInfo && data.cancelledTotal > 0 && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                        Impacto en ingresos: -{formatSensitiveValue(data.cancelledTotal)}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    No hay facturas anuladas {formatDate(selectedDate)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </details>
      </section>

      {/* Gráfica y productos - lado a lado */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Gráfica de ventas últimos 7 días */}
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Ventas últimos 7 días
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Ingresos por día
            </p>
          </div>
          {/* Gráfica últimos 7 días (datos reales) */}
          <div className="relative h-56">
            {/* Eje Y dinámico */}
            {(() => {
              const maxSales = Math.max(...data.last7Days.map((d) => d.sales), 1);
              const ticks = [1, 0.8, 0.6, 0.4, 0.2, 0].map((r) => Math.round(maxSales * r));
              return (
                <div className="absolute left-0 top-0 flex h-full flex-col justify-between pr-3 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {ticks.map((v, i) => (
                    <span key={i}>
                      {hideSensitiveInfo ? "***" : v === 0 ? "$0" : v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`}
                    </span>
                  ))}
                </div>
              );
            })()}

            {/* Área de gráfica */}
            <div className="relative ml-12 h-full pb-6">
              {/* Grid horizontal */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800"
                  style={{ top: `${(i / 5) * 100}%` }}
                />
              ))}

              {/* Barras de la gráfica */}
              {(() => {
                const maxSales = Math.max(...data.last7Days.map((d) => d.sales), 1);
                return (
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-1 px-1" style={{ height: "calc(100% - 24px)", paddingBottom: "24px" }}>
                    {data.last7Days.map((day, i) => {
                      const percentage = maxSales > 0 ? (day.sales / maxSales) * 100 : 0;
                      return (
                        <div
                          key={i}
                          className="group relative flex-1 flex flex-col items-center justify-end"
                          style={{ height: "100%" }}
                        >
                          {!hideSensitiveInfo && day.sales > 0 && (
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-slate-700 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-300 z-10">
                              {formatSensitiveValue(day.sales)}
                            </span>
                          )}
                          <div
                            className="relative w-full rounded-t bg-gradient-to-t from-ov-pink/80 to-ov-pink transition-all hover:from-ov-pink hover:to-ov-pink/90"
                            style={{
                              height: `${percentage}%`,
                              minHeight: day.sales > 0 ? "4px" : "0",
                            }}
                            title={!hideSensitiveInfo ? formatSensitiveValue(day.sales) : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Días */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between">
                {data.last7Days.map((day, i) => (
                  <div key={i} className="relative flex-1 text-center">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Promedio diario:{" "}
              <span className="font-bold text-slate-900 dark:text-slate-50">
                {hideSensitiveInfo ? "***" : (() => {
                  const total = data.last7Days.reduce((a, d) => a + d.sales, 0);
                  const daysWithSales = data.last7Days.filter((d) => d.sales > 0).length;
                  return daysWithSales > 0 ? `$${Math.round(total / daysWithSales).toLocaleString("es-CO")}` : "$0";
                })()}
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total semana:{" "}
              <span className="font-bold text-slate-900 dark:text-slate-50">
                {hideSensitiveInfo ? "***" : `$${data.last7Days.reduce((a, d) => a + d.sales, 0).toLocaleString("es-CO")}`}
              </span>
            </div>
          </div>
        </section>

        {/* Top productos vendidos */}
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="mb-3">
            <h2 className="text-base font-bold text-[#334155] dark:text-slate-50">
              Productos más vendidos
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {formatDate(selectedDate)}
            </p>
          </div>
          <div className="space-y-2">
            {data.topProducts.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 py-6 text-center text-[13px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                Aún no hay productos más vendidos. Las ventas aparecerán aquí.
              </p>
            ) : data.topProducts.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#F8FAFC] p-2.5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold ${
                      index === 0
                        ? "bg-ov-pink/10 text-ov-pink dark:bg-ov-pink/20 dark:text-ov-pink-muted"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-600/30 dark:text-slate-300"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#334155] dark:text-slate-50">
                      {product.name}
                    </p>
                    <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      {hideSensitiveInfo ? "***" : `${product.units} unidades`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold text-[#334155] dark:text-slate-50">
                    {formatSensitiveValue(product.total)}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Total vendido
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// Componente Modal de Cierre de Caja
function CashCloseModal({
  isOpen,
  onClose,
  selectedDate,
  branchId,
  onSave,
  saving,
  hideSensitiveInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  branchId: string | null;
  onSave: (closingData?: {
    expectedCash: number;
    expectedTransfer: number;
    actualCash: string;
    actualTransfer: string;
    totalSales: number;
    physicalSales: number;
    deliverySales: number;
    totalUnits: number;
    cancelledInvoices: number;
    cancelledTotal: number;
    warranties: number;
    notes?: string;
    differenceReason?: string;
  }) => Promise<void>;
  saving: boolean;
  hideSensitiveInfo: boolean;
}) {
  const [cashCloseData, setCashCloseData] = useState<{
    cash: number;
    transfer: number;
    cancelledInvoices: number;
    cancelledTotal: number;
    warranties: number;
    products: Array<{ name: string; quantity: number; total: number }>;
    totalSales: number;
    physicalSales: number;
    deliverySales: number;
    totalUnits: number;
    cashPercentage: number;
    transferPercentage: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualCash, setActualCash] = useState("");
  const [actualTransfer, setActualTransfer] = useState("");
  const [differenceReason, setDifferenceReason] = useState("");
  const [lowStockProducts, setLowStockProducts] = useState<Array<{ name: string; quantity: number; min_stock: number }>>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Array<{ name: string }>>([]);
  const [checkedItems, setCheckedItems] = useState<{
    cash: boolean;
    transfer: boolean;
    totalSales: boolean;
    totalUnits: boolean;
    cancelledInvoices: boolean;
    warranties: boolean;
    products: Record<number, boolean>;
  }>({
    cash: false,
    transfer: false,
    totalSales: false,
    totalUnits: false,
    cancelledInvoices: false,
    warranties: false,
    products: {},
  });

  useEffect(() => {
    if (!isOpen || !branchId) return;
    // Reset checkboxes when modal opens
    setCheckedItems({
      cash: false,
      transfer: false,
      totalSales: false,
      totalUnits: false,
      cancelledInvoices: false,
      warranties: false,
      products: {},
    });
    setActualCash("");
    setActualTransfer("");
    setDifferenceReason("");
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { start, end } = getDayBounds(selectedDate);

      const { data: salesDay } = await supabase
        .from("sales")
        .select("id, total, payment_method, amount_cash, amount_transfer, status, invoice_number, is_delivery")
        .eq("branch_id", branchId)
        .gte("created_at", start)
        .lte("created_at", end);

      if (cancelled) return;

      const sales = (salesDay ?? []) as Array<{
        id: string;
        total: number;
        payment_method: string;
        amount_cash: number | null;
        amount_transfer: number | null;
        status: string;
        invoice_number: string;
        is_delivery: boolean;
      }>;

      const completed = sales.filter((s) => s.status === "completed");
      const completedIds = completed.map((s) => s.id);

      let itemsDay: { data: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        discount_percent: number;
        discount_amount: number;
        products: { name: string } | null;
      }> | null } = { data: [] };

      if (completedIds.length > 0 && branchId) {
        const { data: items, error } = await supabase
          .from("sale_items")
          .select("product_id, quantity, unit_price, discount_percent, discount_amount, products(name)")
          .in("sale_id", completedIds);
        if (error) {
          console.error("Error fetching sale_items:", error);
        }
        itemsDay = { data: items ?? [] };
      }

      if (cancelled) return;

      const cancelledSales = sales.filter((s) => s.status === "cancelled");

      let cash = 0;
      let transfer = 0;
      completed.forEach((s) => {
        const t = Number(s.total);
        if (s.payment_method === "cash") {
          cash += t;
        } else if (s.payment_method === "transfer") {
          transfer += t;
        } else if (s.payment_method === "mixed") {
          const ac = Number(s.amount_cash ?? 0);
          const at = Number(s.amount_transfer ?? 0);
          const sumMixed = ac + at;
          if (sumMixed > 0 && Math.abs(sumMixed - t) < 0.01) {
            cash += ac;
            transfer += at;
          } else if (sumMixed > 0) {
            const ratio = t / sumMixed;
            const cashPart = Math.round(ac * ratio);
            const transferPart = t - cashPart;
            cash += cashPart;
            transfer += transferPart;
          } else {
            cash += t;
          }
        }
      });

      const totalIncome = cash + transfer;
      const cashPercentage = totalIncome > 0 ? Math.round((cash / totalIncome) * 100) : 0;
      const transferPercentage = totalIncome > 0 ? Math.round((transfer / totalIncome) * 100) : 0;

      const cancelledTotal = cancelledSales.reduce((a, s) => a + Number(s.total), 0);

      const physicalSales = completed.filter((s) => !s.is_delivery).length;
      const deliverySales = completed.filter((s) => s.is_delivery).length;

      const items = (itemsDay?.data ?? []) as Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        discount_percent: number;
        discount_amount: number;
        products: { name: string } | null;
      }>;

      const byProduct: Record<string, { name: string; quantity: number; total: number }> = {};
      items.forEach((it) => {
        const lineTotal = Math.max(
          0,
          Math.round(
            it.quantity * Number(it.unit_price) * (1 - Number(it.discount_percent || 0) / 100) - Number(it.discount_amount || 0)
          )
        );
        const name = it.products?.name ?? "—";
        if (!byProduct[it.product_id]) {
          byProduct[it.product_id] = { name, quantity: 0, total: 0 };
        }
        byProduct[it.product_id].quantity += it.quantity;
        byProduct[it.product_id].total += lineTotal;
      });

      const productsList = Object.values(byProduct).sort((a, b) => b.total - a.total);
      const totalUnits = productsList.reduce((sum, p) => sum + p.quantity, 0);

      // Obtener productos con stock bajo o agotado
      const { data: inventoryData } = await supabase
        .from("inventory")
        .select("quantity, min_stock, products(name)")
        .eq("branch_id", branchId);

      const lowStock: Array<{ name: string; quantity: number; min_stock: number }> = [];
      const outOfStock: Array<{ name: string }> = [];

      (inventoryData ?? []).forEach((inv: any) => {
        const qty = Number(inv.quantity ?? 0);
        const minStock = Number(inv.min_stock ?? 0);
        const productName = inv.products?.name ?? "—";
        
        if (qty === 0) {
          outOfStock.push({ name: productName });
        } else if (minStock > 0 && qty <= minStock) {
          lowStock.push({ name: productName, quantity: qty, min_stock: minStock });
        }
      });

      setLowStockProducts(lowStock);
      setOutOfStockProducts(outOfStock);

      setCashCloseData({
        cash,
        transfer,
        cancelledInvoices: cancelledSales.length,
        cancelledTotal,
        warranties: 0, // Por ahora 0, se puede agregar si hay tabla de garantías
        products: productsList,
        totalSales: completed.length,
        physicalSales,
        deliverySales,
        totalUnits,
        cashPercentage,
        transferPercentage,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedDate, branchId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const formatValue = (value: number) => {
    if (hideSensitiveInfo) return "***";
    return `$${value.toLocaleString("es-CO")}`;
  };

  const handleCheckChange = (key: keyof typeof checkedItems, index?: number) => {
    if (key === "products" && index !== undefined) {
      setCheckedItems((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          [index]: !prev.products[index],
        },
      }));
    } else {
      setCheckedItems((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  const allItemsChecked = cashCloseData ? (
    checkedItems.cash &&
    checkedItems.transfer &&
    checkedItems.totalSales &&
    checkedItems.totalUnits &&
    checkedItems.cancelledInvoices &&
    checkedItems.warranties
  ) : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70"
        onClick={saving ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Cierre de caja manual
          </h2>
          <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
            Resumen del día {selectedDate.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400">
            Cargando datos...
          </div>
        ) : cashCloseData ? (
          <div className="space-y-6">
            {/* Resumen financiero y estadísticas - 3 arriba y 3 abajo */}
            <div className="grid gap-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleCheckChange("cash")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.cash ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Efectivo
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {formatValue(cashCloseData.cash)}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                    {cashCloseData.cashPercentage}% del total
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCheckChange("transfer")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.transfer ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Transferencia
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {formatValue(cashCloseData.transfer)}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                    {cashCloseData.transferPercentage}% del total
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCheckChange("totalSales")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.totalSales ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Total ventas
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : cashCloseData.totalSales}
                  </p>
                  {!hideSensitiveInfo && cashCloseData.totalSales > 0 && (
                    <div className="mt-1 flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                          {Math.round((cashCloseData.physicalSales / cashCloseData.totalSales) * 100)}%
                        </span>
                      </div>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                          {Math.round((cashCloseData.deliverySales / cashCloseData.totalSales) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Arqueo de caja - Campos de entrada */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-50">
                Arqueo de caja
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Efectivo */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Efectivo esperado
                  </label>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    {formatValue(cashCloseData.cash)}
                  </div>
                  <label className="mt-3 mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Efectivo ingresado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-ov-pink focus:outline-none focus:ring-2 focus:ring-ov-pink/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:placeholder-slate-500"
                  />
                  {actualCash && (
                    <div className="mt-2">
                      <span className="text-[12px] text-slate-600 dark:text-slate-400">
                        Diferencia:{" "}
                      </span>
                      <span
                        className={`text-[12px] font-semibold ${
                          Number(actualCash) - cashCloseData.cash === 0
                            ? "text-green-600 dark:text-green-400"
                            : Number(actualCash) - cashCloseData.cash < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {Number(actualCash) - cashCloseData.cash >= 0 ? "+" : ""}
                        {formatValue(Number(actualCash) - cashCloseData.cash)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Transferencia */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Transferencia esperada
                  </label>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    {formatValue(cashCloseData.transfer)}
                  </div>
                  <label className="mt-3 mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Transferencia ingresada
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualTransfer}
                    onChange={(e) => setActualTransfer(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-ov-pink focus:outline-none focus:ring-2 focus:ring-ov-pink/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:placeholder-slate-500"
                  />
                  {actualTransfer && (
                    <div className="mt-2">
                      <span className="text-[12px] text-slate-600 dark:text-slate-400">
                        Diferencia:{" "}
                      </span>
                      <span
                        className={`text-[12px] font-semibold ${
                          Number(actualTransfer) - cashCloseData.transfer === 0
                            ? "text-green-600 dark:text-green-400"
                            : Number(actualTransfer) - cashCloseData.transfer < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {Number(actualTransfer) - cashCloseData.transfer >= 0 ? "+" : ""}
                        {formatValue(Number(actualTransfer) - cashCloseData.transfer)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas sobre diferencias */}
              {(actualCash || actualTransfer) &&
                (Number(actualCash || 0) - cashCloseData.cash !== 0 ||
                  Number(actualTransfer || 0) - cashCloseData.transfer !== 0) && (
                  <div className="mt-4">
                    <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">
                      Motivo de la diferencia (opcional)
                    </label>
                    <textarea
                      value={differenceReason}
                      onChange={(e) => setDifferenceReason(e.target.value)}
                      placeholder="Explica si falta o sobra dinero..."
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-ov-pink focus:outline-none focus:ring-2 focus:ring-ov-pink/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:placeholder-slate-500"
                    />
                  </div>
                )}
            </div>

            {/* Segunda fila - 3 cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleCheckChange("totalUnits")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.totalUnits ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Total unidades vendidas
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : cashCloseData.totalUnits}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCheckChange("cancelledInvoices")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.cancelledInvoices ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Facturas anuladas
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : cashCloseData.cancelledInvoices}
                  </p>
                  {cashCloseData.cancelledInvoices > 0 && (
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      {formatValue(cashCloseData.cancelledTotal)}
                    </p>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCheckChange("warranties")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.warranties ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Garantías
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : cashCloseData.warranties}
                  </p>
                </div>
              </button>
            </div>

            {/* Productos vendidos */}
            <div>
              <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-slate-50">
                Productos vendidos
              </h3>
              {cashCloseData.products.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="pb-2 text-left font-medium text-slate-600 dark:text-slate-400">
                          Producto
                        </th>
                        <th className="pb-2 text-right font-medium text-slate-600 dark:text-slate-400">
                          Cantidad
                        </th>
                        <th className="pb-2 text-right font-medium text-slate-600 dark:text-slate-400">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashCloseData.products.map((product, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-800"
                        >
                          <td className="py-2 text-slate-900 dark:text-slate-50">
                            {product.name}
                          </td>
                          <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                            {hideSensitiveInfo ? "***" : `${product.quantity} unidades`}
                          </td>
                          <td className="py-2 text-right font-medium text-slate-900 dark:text-slate-50">
                            {formatValue(product.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                        <td className="py-2 font-bold text-slate-900 dark:text-slate-50">
                          Total
                        </td>
                        <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-50">
                          {hideSensitiveInfo ? "***" : `${cashCloseData.totalUnits} unidades`}
                        </td>
                        <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-50">
                          {formatValue(cashCloseData.cash + cashCloseData.transfer)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-4 text-center text-[13px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  No se vendieron productos este día
                </div>
              )}
            </div>

            {/* Productos con stock bajo o agotado */}
            {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Alertas de inventario
                </h3>
                {outOfStockProducts.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-2 flex items-center gap-2">
                      <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[12px] font-medium text-red-600 dark:text-red-400">
                        Productos agotados ({outOfStockProducts.length})
                      </span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {outOfStockProducts.map((p, i) => (
                        <div key={i} className="text-[12px] text-slate-600 dark:text-slate-400">
                          • {p.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {lowStockProducts.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[12px] font-medium text-orange-600 dark:text-orange-400">
                        Productos con stock bajo ({lowStockProducts.length})
                      </span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {lowStockProducts.map((p, i) => (
                        <div key={i} className="text-[12px] text-slate-600 dark:text-slate-400">
                          • {p.name} ({p.quantity} unidades, mínimo: {p.min_stock})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Botones */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!cashCloseData) return;
              onSave({
                expectedCash: cashCloseData.cash,
                expectedTransfer: cashCloseData.transfer,
                actualCash: actualCash || String(cashCloseData.cash),
                actualTransfer: actualTransfer || String(cashCloseData.transfer),
                totalSales: cashCloseData.totalSales,
                physicalSales: cashCloseData.physicalSales,
                deliverySales: cashCloseData.deliverySales,
                totalUnits: cashCloseData.totalUnits,
                cancelledInvoices: cashCloseData.cancelledInvoices,
                cancelledTotal: cashCloseData.cancelledTotal,
                warranties: cashCloseData.warranties,
                differenceReason: differenceReason || undefined,
              });
            }}
            disabled={saving || loading || !allItemsChecked || !cashCloseData}
            className="rounded-lg bg-ov-pink px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-ov-pink-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
          >
            {saving ? "Guardando..." : "Guardar y aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}

