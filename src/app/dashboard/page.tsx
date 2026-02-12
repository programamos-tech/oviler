"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type DashboardData = {
  totalIncome: number;
  cash: number;
  transfer: number;
  totalSales: number;
  physicalSales: number;
  deliverySales: number;
  cancelledInvoices: number;
  cancelledTotal: number;
  cancelledList: { invoice_number: string; total: number }[];
  topProducts: { name: string; units: number; total: number }[];
  last7Days: { day: string; sales: number }[];
  yesterdayIncome: number;
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getDayBounds(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function DashboardPage() {
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
      ] = await Promise.all([
        supabase
          .from("sales")
          .select("id, total, payment_method, amount_cash, amount_transfer, is_delivery, status, invoice_number")
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
          .select("total, created_at")
          .eq("branch_id", branchId)
          .eq("status", "completed")
          .gte("created_at", (() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 6);
            d.setHours(0, 0, 0, 0);
            return d.toISOString();
          })())
          .lte("created_at", end),
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
      }>;
      const completed = sales.filter((s) => s.status === "completed");
      const totalIncome = completed.reduce((a, s) => a + Number(s.total), 0);
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
          if (ac + at > 0) {
            cash += ac;
            transfer += at;
          } else {
            cash += t;
          }
        }
      });
      if (totalIncome > cash + transfer) {
        cash += totalIncome - cash - transfer;
      }
      const physicalSales = completed.filter((s) => !s.is_delivery).length;
      const deliverySales = completed.filter((s) => s.is_delivery).length;
      const cancelledSales = sales.filter((s) => s.status === "cancelled");
      const cancelledTotal = cancelledSales.reduce((a, s) => a + Number(s.total), 0);
      const cancelledList = cancelledSales.map((s) => ({ invoice_number: s.invoice_number, total: Number(s.total) }));
      const yesterdayIncome = (salesYesterday ?? []).reduce((a, s) => a + Number((s as { total: number }).total), 0);

      const byDay: Record<string, number> = {};
      const last7Start = new Date(selectedDate);
      last7Start.setDate(last7Start.getDate() - 6);
      last7Start.setHours(0, 0, 0, 0);
      (salesLast7 ?? []).forEach((s: { total: number; created_at: string }) => {
        const d = new Date(s.created_at).toDateString();
        byDay[d] = (byDay[d] ?? 0) + Number(s.total);
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
      let items: Array<{ product_id: string; quantity: number; unit_price: number; discount_percent: number; discount_amount: number; products: { name: string } | null }> = [];
      if (completedIds.length > 0) {
        const { data: itemsDay } = await supabase
          .from("sale_items")
          .select("product_id, quantity, unit_price, discount_percent, discount_amount, products(name)")
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

      setDashboardData({
        totalIncome,
        cash,
        transfer,
        totalSales: completed.length,
        physicalSales,
        deliverySales,
        cancelledInvoices: cancelledSales.length,
        cancelledTotal,
        cancelledList,
        topProducts,
        last7Days,
        yesterdayIncome,
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
    cash: 0,
    transfer: 0,
    totalSales: 0,
    physicalSales: 0,
    deliverySales: 0,
    cancelledInvoices: 0,
    cancelledTotal: 0,
    cancelledList: [],
    topProducts: [],
    last7Days: DAY_LABELS.map((day) => ({ day, sales: 0 })),
    yesterdayIncome: 0,
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

      {/* Métricas principales - Primera fila (3 cards) */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Ingreso total */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Ingreso total
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
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                  Efectivo:
                </span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                  {formatSensitiveValue(data.cash)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                  Transferencia:
                </span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                  {formatSensitiveValue(data.transfer)}
                </span>
              </div>
              {!hideSensitiveInfo && data.yesterdayIncome > 0 && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Comparación con ayer
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatSensitiveValue(data.totalIncome - data.yesterdayIncome)} (
                    {data.yesterdayIncome > 0 ? Math.round(((data.totalIncome - data.yesterdayIncome) / data.yesterdayIncome) * 100) : 0}
                    %)
                  </p>
                </div>
              )}
            </div>
          </div>
        </details>

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
                  Ventas en efectivo: {hideSensitiveInfo ? "***" : data.physicalSales}
                </p>
                {!hideSensitiveInfo && (
                  <p className="mt-1 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Ticket promedio:{" "}
                    {formatSensitiveValue(
                      data.physicalSales > 0 ? Math.round(data.cash / data.physicalSales) : 0
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
                  Ventas con transferencia: {hideSensitiveInfo ? "***" : data.deliverySales}
                </p>
                {!hideSensitiveInfo && (
                  <p className="mt-1 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Ticket promedio:{" "}
                    {formatSensitiveValue(
                      data.deliverySales > 0 ? Math.round(data.transfer / data.deliverySales) : 0
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
        {/* Total ventas */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Total ventas
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                {hideSensitiveInfo ? "***" : data.totalSales}
              </p>
              {!hideSensitiveInfo && (
                <div className="mt-1 flex gap-2 text-[10px] font-medium">
                  <span className="text-slate-600 dark:text-slate-400">
                    {data.physicalSales} físicas
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">·</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {data.deliverySales} domicilio
                  </span>
                </div>
              )}
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
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Ventas físicas
                  </p>
                  <p className="mt-1 text-[16px] font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : data.physicalSales}
                  </p>
                  {!hideSensitiveInfo && (
                    <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {data.totalSales > 0 ? Math.round((data.physicalSales / data.totalSales) * 100) : 0}% del total
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Ventas a domicilio
                  </p>
                  <p className="mt-1 text-[16px] font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : data.deliverySales}
                  </p>
                  {!hideSensitiveInfo && (
                    <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {data.totalSales > 0 ? Math.round((data.deliverySales / data.totalSales) * 100) : 0}% del total
                    </p>
                  )}
                </div>
              </div>
              {!hideSensitiveInfo && (
                <div className="mt-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950">
                  <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                    Ticket promedio:{" "}
                    {formatSensitiveValue(
                      data.totalSales > 0 ? Math.round(data.totalIncome / data.totalSales) : 0
                    )}
                  </p>
                </div>
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

              {/* Días */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between">
                {data.last7Days.map((day, i) => (
                  <div key={i} className="group relative flex-1 text-center">
                    {!hideSensitiveInfo && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-slate-700 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-300">
                        {formatSensitiveValue(day.sales)}
                      </span>
                    )}
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

