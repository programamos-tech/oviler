"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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

type ExpenseDetail = {
  id: string;
  branch_id: string;
  user_id: string;
  amount: number;
  payment_method: "cash" | "transfer";
  concept: string;
  notes: string | null;
  status: "active" | "cancelled";
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  users: { name: string } | null;
};

function isAutomaticWarrantyRefund(expense: Pick<ExpenseDetail, "concept" | "notes"> | null): boolean {
  if (!expense) return false;
  const concept = String(expense.concept ?? "");
  const notes = String(expense.notes ?? "");
  return (
    concept.startsWith("Devolución garantía ") ||
    notes.includes("Reembolso automático al procesar garantía tipo devolución")
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelFormOpen, setCancelFormOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, users!user_id(name)")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setExpense(null);
      } else {
        setExpense(data as ExpenseDetail);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function handleCancelExpense() {
    if (!expense || expense.status === "cancelled" || cancelling) return;
    if (isAutomaticWarrantyRefund(expense)) {
      setActionError("Este egreso automático de garantía no se puede anular.");
      return;
    }
    const supabase = createClient();
    setActionError(null);
    setCancelling(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("No se pudo validar tu sesión.");
      }

      const payload = {
        status: "cancelled" as const,
        cancelled_at: new Date().toISOString(),
        cancelled_by: authData.user.id,
        cancellation_reason: cancelReason.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", expense.id)
        .eq("status", "active")
        .select("*, users!user_id(name)")
        .single();

      if (error) throw error;
      if (!data) throw new Error("No se pudo anular el egreso.");
      setExpense(data as ExpenseDetail);
      setCancelFormOpen(false);
      setCancelReason("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo anular el egreso.";
      setActionError(message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Egresos", href: "/egresos" }, { label: "Detalle" }]} />
        <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-white p-8 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">Cargando egreso...</p>
        </div>
      </div>
    );
  }

  if (notFound || !expense) {
    return (
      <div className="space-y-4 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Egresos", href: "/egresos" }, { label: "Detalle" }]} />
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">Egreso no encontrado</p>
          <Link href="/egresos" className="mt-4 inline-block text-ov-pink hover:underline text-[14px]">
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  const shortId = expense.id.slice(0, 8).toUpperCase();
  const isAutoWarrantyExpense = isAutomaticWarrantyRefund(expense);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
        <Breadcrumb
          items={[
            { label: "Egresos", href: "/egresos" },
            { label: `Egreso #${shortId}` },
          ]}
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              Egreso #{shortId}
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              {formatDate(expense.created_at)} · {formatTime(expense.created_at)}
              {expense.users?.name && <> · Registrado por {expense.users.name}</>}
            </p>
            <p
              className={`mt-1 text-[12px] font-semibold ${
                expense.status === "cancelled"
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              Estado: {expense.status === "cancelled" ? "Anulado" : "Activo"}
            </p>
          </div>
          <Link
            href="/egresos"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 shrink-0"
            title="Volver a egresos"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>

        {actionError && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-[13px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {actionError}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-start gap-4 sm:gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Concepto</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">
              {expense.concept}
            </p>
          </div>
          <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Monto</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl tabular-nums">
              $ {formatMoney(expense.amount)}
            </p>
          </div>
          <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Forma de pago</p>
            <p className="mt-0.5 text-lg font-medium text-slate-700 dark:text-slate-300 sm:text-xl">
              {PAYMENT_LABELS[expense.payment_method]}
            </p>
          </div>
          <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Fecha y hora</p>
            <p className="mt-0.5 text-[14px] font-medium text-slate-700 dark:text-slate-300">
              {formatDate(expense.created_at)} · {formatTime(expense.created_at)}
            </p>
          </div>
          {expense.users?.name && (
            <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Registrado por</p>
              <p className="mt-0.5 text-[14px] font-medium text-slate-700 dark:text-slate-300">
                {expense.users.name}
              </p>
            </div>
          )}
        </div>

        {expense.notes && expense.notes.trim() && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Notas</p>
            <p className="mt-2 text-[14px] font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {expense.notes.trim()}
            </p>
          </div>
        )}

        {expense.status === "cancelled" ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900/50 dark:bg-red-900/10">
            <p className="text-[12px] font-semibold text-red-700 dark:text-red-300">Este egreso fue anulado.</p>
            <p className="mt-1 text-[12px] text-red-700/90 dark:text-red-300/90">
              {expense.cancelled_at ? `Fecha: ${formatDate(expense.cancelled_at)} · ${formatTime(expense.cancelled_at)}` : "Sin fecha registrada"}
            </p>
            {expense.cancellation_reason?.trim() && (
              <p className="mt-1 text-[12px] text-red-700/90 dark:text-red-300/90">
                Motivo: {expense.cancellation_reason.trim()}
              </p>
            )}
          </div>
        ) : isAutoWarrantyExpense ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
            <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-300">
              Este egreso fue creado automáticamente por una devolución de garantía.
            </p>
            <p className="mt-1 text-[12px] text-amber-700/90 dark:text-amber-300/90">
              No se puede anular desde egresos para mantener la trazabilidad contable de la garantía.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Anular egreso</p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                  El egreso no se elimina, pero deja de contar en reportes y cierres.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelFormOpen((prev) => !prev)}
                className="inline-flex h-9 items-center rounded-lg border border-red-300 bg-white px-3 text-[13px] font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                {cancelFormOpen ? "Cerrar" : "Anular egreso"}
              </button>
            </div>
            {cancelFormOpen && (
              <div className="mt-3 space-y-3">
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Motivo de la anulación (opcional)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-red-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleCancelExpense}
                  disabled={cancelling}
                  className="inline-flex h-9 items-center rounded-lg bg-red-600 px-4 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {cancelling ? "Anulando..." : "Confirmar anulación"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
