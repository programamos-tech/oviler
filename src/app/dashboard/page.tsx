"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hideSensitiveInfo, setHideSensitiveInfo] = useState(false);
  const [branch, setBranch] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [hasSales, setHasSales] = useState<boolean | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    async function loadBranchAndSales() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id) return;
      const { data: branchData } = await supabase.from("branches").select("name, logo_url").eq("id", ub.branch_id).single();
      if (branchData) setBranch({ name: branchData.name, logo_url: branchData.logo_url ?? null });
      const { count } = await supabase.from("sales").select("*", { count: "exact", head: true }).eq("branch_id", ub.branch_id);
      setHasSales((count ?? 0) > 0);
    }
    loadBranchAndSales();
  }, []);

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

  // Datos: en sucursal nueva (sin ventas) todo en cero; si hay ventas, datos de ejemplo
  const isTodaySelected = isToday;
  const isEmptyBranch = hasSales === false;
  const mockData = isEmptyBranch
    ? {
        totalIncome: 0,
        cash: 0,
        transfer: 0,
        warrantiesToday: 0,
        cancelledInvoices: 0,
        totalSales: 0,
        physicalSales: 0,
        deliverySales: 0,
        topProducts: [] as { name: string; units: number; total: number }[],
        last7Days: [
          { day: "Lun", sales: 0 },
          { day: "Mar", sales: 0 },
          { day: "Mié", sales: 0 },
          { day: "Jue", sales: 0 },
          { day: "Vie", sales: 0 },
          { day: "Sáb", sales: 0 },
          { day: "Dom", sales: 0 },
        ],
      }
    : {
        totalIncome: isTodaySelected ? 1250000 : 980000,
        cash: isTodaySelected ? 750000 : 580000,
        transfer: isTodaySelected ? 500000 : 400000,
        warrantiesToday: isTodaySelected ? 3 : 2,
        cancelledInvoices: isTodaySelected ? 1 : 0,
        totalSales: isTodaySelected ? 24 : 18,
        physicalSales: isTodaySelected ? 15 : 12,
        deliverySales: isTodaySelected ? 9 : 6,
        topProducts: [
          { name: "Aceite 1L", units: 45, total: 1012500 },
          { name: "Coca-Cola 1.5L", units: 32, total: 176000 },
          { name: "Pan francés", units: 28, total: 140000 },
          { name: "Arroz 1kg", units: 22, total: 55000 },
          { name: "Azúcar 1kg", units: 18, total: 45000 },
        ],
        last7Days: [
          { day: "Lun", sales: 1080000 },
          { day: "Mar", sales: 1150000 },
          { day: "Mié", sales: 1350000 },
          { day: "Jue", sales: 1200000 },
          { day: "Vie", sales: 1250000 },
          { day: "Sáb", sales: 1380000 },
          { day: "Dom", sales: isTodaySelected ? 1390000 : 1390000 },
        ],
      };


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
      {/* Header con navegación temporal */}
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                {branch?.logo_url ? (
                  <img src={branch.logo_url} alt="" className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-lg font-bold text-slate-400 dark:text-slate-500">
                    {branch?.name?.charAt(0)?.toUpperCase() || "S"}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Estás en
                </p>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                  {branch?.name || "Dashboard"}
                </h1>
                <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-neutral-400">
                  Resumen de ventas y métricas del negocio
                </p>
              </div>
            </div>
          </div>

          {/* Controles del dashboard */}
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
        </div>
      </header>

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
                {formatSensitiveValue(mockData.totalIncome)}
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
                  {formatSensitiveValue(mockData.cash)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                  Transferencia:
                </span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                  {formatSensitiveValue(mockData.transfer)}
                </span>
              </div>
              {!hideSensitiveInfo && !isEmptyBranch && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Comparación con ayer
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatSensitiveValue(mockData.totalIncome - 980000)} (
                    {980000 > 0 ? Math.round(((mockData.totalIncome - 980000) / 980000) * 100) : 0}
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
                {formatSensitiveValue(mockData.cash)}
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
                  {mockData.totalIncome > 0 ? Math.round((mockData.cash / mockData.totalIncome) * 100) : 0}%
                </span>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                  Ventas en efectivo: {hideSensitiveInfo ? "***" : mockData.physicalSales}
                </p>
                {!hideSensitiveInfo && (
                  <p className="mt-1 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Ticket promedio:{" "}
                    {formatSensitiveValue(
                      mockData.physicalSales > 0 ? Math.round(mockData.cash / mockData.physicalSales) : 0
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
                {formatSensitiveValue(mockData.transfer)}
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
                  {mockData.totalIncome > 0 ? Math.round((mockData.transfer / mockData.totalIncome) * 100) : 0}%
                </span>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                  Ventas con transferencia: {hideSensitiveInfo ? "***" : mockData.deliverySales}
                </p>
                {!hideSensitiveInfo && (
                  <p className="mt-1 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Ticket promedio:{" "}
                    {formatSensitiveValue(
                      mockData.deliverySales > 0 ? Math.round(mockData.transfer / mockData.deliverySales) : 0
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
                {hideSensitiveInfo ? "***" : mockData.totalSales}
              </p>
              {!hideSensitiveInfo && (
                <div className="mt-1 flex gap-2 text-[10px] font-medium">
                  <span className="text-slate-600 dark:text-slate-400">
                    {mockData.physicalSales} físicas
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">·</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {mockData.deliverySales} domicilio
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
                    {hideSensitiveInfo ? "***" : mockData.physicalSales}
                  </p>
                  {!hideSensitiveInfo && (
                    <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {mockData.totalSales > 0 ? Math.round((mockData.physicalSales / mockData.totalSales) * 100) : 0}% del total
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Ventas a domicilio
                  </p>
                  <p className="mt-1 text-[16px] font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : mockData.deliverySales}
                  </p>
                  {!hideSensitiveInfo && (
                    <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {mockData.totalSales > 0 ? Math.round((mockData.deliverySales / mockData.totalSales) * 100) : 0}% del total
                    </p>
                  )}
                </div>
              </div>
              {!hideSensitiveInfo && (
                <div className="mt-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950">
                  <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                    Ticket promedio:{" "}
                    {formatSensitiveValue(
                      mockData.totalSales > 0 ? Math.round(mockData.totalIncome / mockData.totalSales) : 0
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
                {hideSensitiveInfo ? "***" : mockData.warrantiesToday}
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
                        {isTodaySelected ? 1 : 0}
                      </p>
                      <p className="text-[10px] font-medium text-orange-600 dark:text-orange-400">
                        Pendientes
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2 text-center dark:bg-emerald-950">
                      <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                        {isTodaySelected ? 1 : 1}
                      </p>
                      <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Aprobadas
                      </p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-center dark:bg-red-950">
                      <p className="text-[12px] font-bold text-red-700 dark:text-red-300">
                        {isTodaySelected ? 1 : 1}
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
                    Valor total en garantías: {formatSensitiveValue(28000)}
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
                {hideSensitiveInfo ? "***" : mockData.cancelledInvoices}
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
              {mockData.cancelledInvoices > 0 ? (
                <>
                  <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950">
                    <p className="text-[12px] font-bold text-red-800 dark:text-red-200">
                      Venta #VTA-1023
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-red-700 dark:text-red-300">
                      Anulada por: Juan Pérez
                    </p>
                    {!hideSensitiveInfo && (
                      <p className="mt-1 text-[11px] font-medium text-red-700 dark:text-red-300">
                        Valor: {formatSensitiveValue(45000)}
                      </p>
                    )}
                  </div>
                  {!hideSensitiveInfo && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                        Impacto en ingresos: -{formatSensitiveValue(45000)}
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
          {/* Gráfica completamente nueva */}
          <div className="relative h-56">
            {/* Eje Y */}
            <div className="absolute left-0 top-0 flex h-full flex-col justify-between pr-3 text-[10px] font-medium text-slate-400 dark:text-slate-500">
              <span>{hideSensitiveInfo ? "***" : "$1.4M"}</span>
              <span>{hideSensitiveInfo ? "***" : "$1.2M"}</span>
              <span>{hideSensitiveInfo ? "***" : "$1.0M"}</span>
              <span>{hideSensitiveInfo ? "***" : "$800k"}</span>
              <span>{hideSensitiveInfo ? "***" : "$600k"}</span>
              <span className="text-slate-300 dark:text-slate-600">$0</span>
            </div>

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
                {mockData.last7Days.map((day, i) => (
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
                {hideSensitiveInfo ? "***" : isEmptyBranch ? "$0" : "$1.042.857"}
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total semana:{" "}
              <span className="font-bold text-slate-900 dark:text-slate-50">
                {hideSensitiveInfo ? "***" : isEmptyBranch ? "$0" : "$7.300.000"}
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
            {mockData.topProducts.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 py-6 text-center text-[13px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                Aún no hay productos más vendidos. Las ventas aparecerán aquí.
              </p>
            ) : mockData.topProducts.map((product, index) => (
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

