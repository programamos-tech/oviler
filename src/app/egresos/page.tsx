"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

type ExpenseRow = {
  id: string;
  branch_id: string;
  user_id: string;
  amount: number;
  payment_method: "cash" | "transfer";
  concept: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  users: { name: string } | null;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
};

type PaymentFilter = "all" | "cash" | "transfer";

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

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
      const { data: ub } = await supabase
        .from("user_branches")
        .select("branch_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (!ub?.branch_id || cancelled) {
        setLoading(false);
        return;
      }

      let q = supabase
        .from("expenses")
        .select("*, users!user_id(name)")
        .eq("branch_id", ub.branch_id)
        .order("created_at", { ascending: false });

      if (paymentFilter !== "all") {
        q = q.eq("payment_method", paymentFilter);
      }

      const { data: expensesData, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error("Error loading expenses:", error);
        setLoadError(error.message || "Error al cargar egresos");
        setExpenses([]);
      } else {
        setExpenses((expensesData ?? []) as ExpenseRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentFilter]);

  const filteredExpenses = expenses.filter((e) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const matchConcept = e.concept?.toLowerCase().includes(q);
      const matchNotes = e.notes?.toLowerCase().includes(q);
      const matchId = e.id.toLowerCase().includes(q);
      if (!matchConcept && !matchNotes && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Egresos" }]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Egresos y gastos
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registro de salidas de dinero de la sucursal. Busca por concepto o notas y filtra por forma de pago.
            </p>
          </div>
          <Link
            href="/egresos/nuevo"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo egreso
          </Link>
        </div>
      </header>

      {loadError && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-medium">Error al cargar egresos</p>
          <p className="mt-1 text-[13px]">{loadError}</p>
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1 min-w-0 max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por concepto o notas..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-[14px] text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">Pago:</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Todas</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>
        </div>
      )}

      <section className="space-y-3">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400">Cargando egresos...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
              {expenses.length === 0
                ? (paymentFilter === "all" ? "Aún no hay egresos registrados" : `No hay egresos con pago "${PAYMENT_LABELS[paymentFilter]}"`)
                : "Ningún egreso coincide con la búsqueda"}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {expenses.length === 0
                ? (paymentFilter === "all" ? "Registra el primer egreso o gasto para verlo aquí." : "Prueba cambiando el filtro de pago.")
                : "Prueba cambiando la búsqueda o el filtro."}
            </p>
            {expenses.length === 0 && paymentFilter === "all" && (
              <Link
                href="/egresos/nuevo"
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
              >
                Nuevo egreso
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/egresos/${expense.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/egresos/${expense.id}`);
                  }
                }}
                className="rounded-xl shadow-sm ring-1 cursor-pointer transition-all bg-white ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
              >
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-x-3 gap-y-2 sm:gap-x-4 sm:gap-y-0 items-center px-4 py-3 sm:px-5 sm:py-4">
                  <div className="col-span-2 sm:col-span-1 min-w-0 flex items-center gap-2">
                    <svg className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <p className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tabular-nums truncate">
                      #{expense.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {formatTime(expense.created_at)} · {formatDateShort(expense.created_at)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                      {expense.concept}
                    </p>
                    {expense.notes && (
                      <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 truncate">
                        {expense.notes}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">
                      {PAYMENT_LABELS[expense.payment_method]}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                      $ {formatMoney(expense.amount)}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 min-w-0 flex items-center justify-end gap-2">
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
                      {expense.users?.name ?? "—"}
                    </p>
                    <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/egresos/${expense.id}`}
                        className="inline-flex shrink-0 items-center justify-center p-1 text-ov-pink hover:text-ov-pink-hover dark:text-ov-pink dark:hover:text-ov-pink-hover"
                        aria-label="Ver detalle"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
