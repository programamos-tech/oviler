"use client";

import Link from "next/link";
import Breadcrumb from "@/app/components/Breadcrumb";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
}

type CashClosingRow = {
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

export default function CashClosingsPage() {
  const [closings, setClosings] = useState<CashClosingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase
        .from("user_branches")
        .select("branch_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (!ub?.branch_id || cancelled) return;

      const { data: closingsData, error: queryError } = await supabase
        .from("cash_closings")
        .select("*, users!user_id(name)")
        .eq("branch_id", ub.branch_id)
        .order("closing_date", { ascending: false })
        .limit(100);

      if (cancelled) return;
      if (queryError) {
        setLoadError(queryError.message);
        setClosings([]);
      } else {
        setLoadError(null);
        setClosings((closingsData ?? []) as CashClosingRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Cierres de caja", href: "/cierre-caja" },
        ]}
      />

      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Cierres de caja
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Historial de cierres de caja diarios
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">Cargando cierres de caja...</p>
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-medium">Error al cargar cierres de caja</p>
          <p className="mt-1 text-sm">{loadError}</p>
        </div>
      ) : closings.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">
            No hay cierres de caja registrados aún.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Responsable
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Efectivo esperado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Efectivo ingresado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Diferencia efectivo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Transferencia esperada
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Transferencia ingresada
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Diferencia transferencia
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total ventas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {closings.map((closing) => {
                  const cashDiff = closing.cash_difference;
                  const transferDiff = closing.transfer_difference;
                  return (
                    <tr
                      key={closing.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 dark:text-slate-50">
                        {formatDate(closing.closing_date)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {closing.users?.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-slate-900 dark:text-slate-50">
                        ${formatMoney(closing.expected_cash)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-slate-900 dark:text-slate-50">
                        ${formatMoney(closing.actual_cash)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-6 py-4 text-right text-sm font-semibold ${
                          cashDiff === 0
                            ? "text-green-600 dark:text-green-400"
                            : cashDiff < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {cashDiff >= 0 ? "+" : ""}
                        ${formatMoney(cashDiff)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-slate-900 dark:text-slate-50">
                        ${formatMoney(closing.expected_transfer)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-slate-900 dark:text-slate-50">
                        ${formatMoney(closing.actual_transfer)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-6 py-4 text-right text-sm font-semibold ${
                          transferDiff === 0
                            ? "text-green-600 dark:text-green-400"
                            : transferDiff < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {transferDiff >= 0 ? "+" : ""}
                        ${formatMoney(transferDiff)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-slate-600 dark:text-slate-400">
                        {closing.total_sales}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                        <Link
                          href={`/cierre-caja/${closing.id}`}
                          className="text-ov-pink hover:text-ov-pink-hover font-medium"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
