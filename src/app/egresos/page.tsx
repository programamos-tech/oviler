"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  workspaceFilterLabelClass,
  workspaceFilterSearchBoxClass,
  workspaceFilterSelectClass,
} from "@/lib/workspace-field-classes";

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
  status: "active" | "cancelled";
  created_at: string;
  updated_at: string;
  users: { name: string } | null;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
};

type PaymentFilter = "all" | "cash" | "transfer";
type StatusFilter = "all" | "active" | "cancelled";

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const statusChipClass = (status: ExpenseRow["status"]) =>
    status === "cancelled"
      ? "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/45 dark:bg-red-950/25 dark:text-red-300"
      : "inline-flex items-center rounded-full border border-slate-300/90 bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--shell-sidebar)] dark:border-zinc-600/40 dark:bg-zinc-800/55 dark:text-zinc-300";

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
      if (statusFilter !== "all") {
        q = q.eq("status", statusFilter);
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
  }, [paymentFilter, statusFilter]);

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
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb items={[{ label: "Egresos" }]} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Egresos y gastos
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registro de salidas de dinero de la sucursal. Busca por concepto o notas y filtra por forma de pago.
            </p>
          </div>
          <Link
            href="/egresos/nuevo"
            className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:w-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo egreso
          </Link>
        </div>
      </header>

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-red-800 dark:border-red-900/45 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-medium">Error al cargar egresos</p>
          <p className="mt-1 text-[13px]">{loadError}</p>
        </div>
      )}

      <section className="rounded-3xl bg-white px-4 py-4 dark:bg-slate-900 sm:px-6 sm:py-6">
        {loading ? (
          <div className="min-h-[280px] animate-pulse rounded-2xl bg-slate-50/60 dark:bg-slate-800/40" aria-hidden />
        ) : filteredExpenses.length === 0 ? (
          <>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
              <div className="relative min-w-0 w-full lg:flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por concepto o notas..."
                  className={workspaceFilterSearchBoxClass}
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:w-[22rem]">
                <div className="space-y-1 min-w-0">
                  <label className={workspaceFilterLabelClass}>Pago</label>
                  <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)} className={workspaceFilterSelectClass}>
                    <option value="all">Todas</option>
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
                <div className="space-y-1 min-w-0">
                  <label className={workspaceFilterLabelClass}>Estado</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className={workspaceFilterSelectClass}>
                    <option value="all">Todos</option>
                    <option value="active">Activos</option>
                    <option value="cancelled">Anulados</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
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
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
              >
                Nuevo egreso
              </Link>
            )}
          </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
              <div className="relative min-w-0 w-full lg:flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por concepto o notas..."
                  className={workspaceFilterSearchBoxClass}
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:w-[22rem]">
                <div className="space-y-1 min-w-0">
                  <label className={workspaceFilterLabelClass}>Pago</label>
                  <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)} className={workspaceFilterSelectClass}>
                    <option value="all">Todas</option>
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
                <div className="space-y-1 min-w-0">
                  <label className={workspaceFilterLabelClass}>Estado</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className={workspaceFilterSelectClass}>
                    <option value="all">Todos</option>
                    <option value="active">Activos</option>
                    <option value="cancelled">Anulados</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="pt-1">
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 xl:block">
              <div className="grid grid-cols-[minmax(130px,1fr)_minmax(160px,1fr)_minmax(220px,1.3fr)_minmax(140px,1fr)_minmax(130px,0.9fr)_minmax(140px,1fr)] items-center gap-x-4 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">ID</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Fecha</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Concepto</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pago / Estado</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Monto</p>
                <p className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Usuario</p>
              </div>
              {filteredExpenses.map((expense, idx) => (
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
                  className={`grid grid-cols-[minmax(130px,1fr)_minmax(160px,1fr)_minmax(220px,1.3fr)_minmax(140px,1fr)_minmax(130px,0.9fr)_minmax(140px,1fr)] items-center gap-x-4 px-5 py-3 transition-colors ${
                    idx === filteredExpenses.length - 1 ? "" : "border-b border-slate-100 dark:border-slate-800"
                  } hover:bg-slate-50 dark:hover:bg-slate-800/40`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <svg className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <p className="truncate text-[13px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                      #{expense.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">
                    {formatTime(expense.created_at)} · {formatDateShort(expense.created_at)}
                  </p>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                      {expense.concept}
                    </p>
                    {expense.notes && (
                      <p className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-slate-400">
                        {expense.notes}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                      {PAYMENT_LABELS[expense.payment_method]}
                    </p>
                    <p className={`mt-0.5 w-fit ${statusChipClass(expense.status)}`}>
                      {expense.status === "cancelled" ? "Anulado" : "Activo"}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                    $ {formatMoney(expense.amount)}
                  </p>
                  <div className="min-w-0 flex items-center justify-end gap-2">
                    <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                      {expense.users?.name ?? "—"}
                    </p>
                    <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/egresos/${expense.id}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[color:var(--shell-sidebar)] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-zinc-300"
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
              ))}
            </div>
            <div className="space-y-3 xl:hidden">
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
                className="rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50"
              >
                <div className="grid grid-cols-1 gap-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <svg className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <p className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tabular-nums truncate">
                        #{expense.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {formatTime(expense.created_at)} · {formatDateShort(expense.created_at)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50 truncate">{expense.concept}</p>
                      {expense.notes && (
                        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 truncate">{expense.notes}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tabular-nums">$ {formatMoney(expense.amount)}</p>
                      <p className={`mt-0.5 inline-flex ${statusChipClass(expense.status)}`}>
                        {expense.status === "cancelled" ? "Anulado" : "Activo"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
                      {PAYMENT_LABELS[expense.payment_method]}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="max-w-[120px] truncate text-[12px] text-slate-500 dark:text-slate-400">{expense.users?.name ?? "—"}</p>
                      <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/egresos/${expense.id}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[color:var(--shell-sidebar)] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-zinc-300" aria-label="Ver detalle">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
