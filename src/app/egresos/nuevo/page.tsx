"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import { InfoTip } from "@/app/components/InfoTip";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { workspaceFormInputClass } from "@/lib/workspace-field-classes";

const DEFAULT_CONCEPTS = [
  "Pago servicios",
  "Compra de inventario (mercancía)",
  "Compra insumos",
  "Pago a proveedores",
  "Nómina",
  "Arriendo",
  "Servicios públicos",
  "Transporte y flete",
  "Mantenimiento",
  "Publicidad",
  "Suministros de oficina",
];
const OTHER_VALUE = "__other__";

/** Formatea solo dígitos con punto para miles (es-CO). */
function formatAmountDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return Number(digits).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

type ConceptOption = { id: string; name: string };

export default function NewExpensePage() {
  const router = useRouter();
  const [conceptOptions, setConceptOptions] = useState<ConceptOption[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<string>("");
  const [customConcept, setCustomConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) return;
      const { data: rows } = await supabase
        .from("expense_concepts")
        .select("id, name")
        .eq("organization_id", userRow.organization_id)
        .order("display_order", { ascending: true });
      if (!cancelled) {
        if (rows?.length) {
          setConceptOptions(rows as ConceptOption[]);
          setSelectedConcept(rows[0].id);
        } else {
          setSelectedConcept(DEFAULT_CONCEPTS[0] ?? "");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectOptions =
    conceptOptions.length > 0
      ? conceptOptions
      : DEFAULT_CONCEPTS.map((name) => ({ id: name, name }));

  const effectiveConcept =
    selectedConcept === OTHER_VALUE
      ? customConcept.trim()
      : selectOptions.find((c) => c.id === selectedConcept)?.name ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const conceptTrim = effectiveConcept;
    if (!conceptTrim) {
      setError("El concepto es obligatorio.");
      return;
    }
    const amountNum = parseFloat(amount.replace(/\./g, "").replace(",", ".")) || 0;
    if (amountNum <= 0) {
      setError("Indica un monto válido mayor a 0.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Debes iniciar sesión.");
      setSaving(false);
      return;
    }
    const { data: ub } = await supabase
      .from("user_branches")
      .select("branch_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (!ub?.branch_id) {
      setError("No tienes sucursal asignada.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("expenses").insert({
      branch_id: ub.branch_id,
      user_id: user.id,
      amount: amountNum,
      payment_method: paymentMethod,
      concept: conceptTrim,
      notes: notes.trim() || null,
    });

    if (insertError) {
      setError(insertError.message || "No se pudo registrar el egreso.");
      setSaving(false);
      return;
    }

    router.push("/egresos");
  }

  const amountNum = parseFloat(amount.replace(/\./g, "").replace(",", ".")) || 0;
  const paymentLabel = paymentMethod === "cash" ? "Efectivo" : "Transferencia";
  const inputClass = `${workspaceFormInputClass} dark:accent-zinc-500`;
  const textareaClass = `${workspaceFormInputClass.replace("h-10 ", "min-h-[5.5rem] py-3 ")} resize-y`;
  const labelClass = "mb-2 block text-[12px] font-semibold text-slate-700 dark:text-slate-300";
  const requiredMarkClass = "text-[color:var(--shell-sidebar)] dark:text-zinc-300";

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb items={[{ label: "Egresos", href: "/egresos" }, { label: "Nuevo egreso" }]} />
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
                Nuevo egreso o gasto
              </h1>
              <InfoTip ariaLabel="Cómo encaja con los reportes">
                Este egreso reduce el <strong className="font-semibold">dinero disponible</strong> (neto en caja en
                reportes). El <strong className="font-semibold">margen bruto</strong> se calcula al vender usando el{" "}
                <strong className="font-semibold">costo del producto</strong> en el catálogo: conviene actualizarlo cuando
                compras mercancía para que ambos números reflejen la misma realidad.
              </InfoTip>
            </div>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registra una salida de dinero (efectivo o transferencia).
            </p>
          </div>
          <Link
            href="/egresos"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
            title="Volver a egresos"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[13px] font-medium text-red-800 dark:border-red-900/45 dark:bg-red-900/30 dark:text-red-200" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Datos del egreso
            </p>
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="expense-concept" className={labelClass}>
                  Concepto <span className={requiredMarkClass}>*</span>
                </label>
                <select
                  id="expense-concept"
                  value={selectedConcept}
                  onChange={(e) => setSelectedConcept(e.target.value)}
                  className={inputClass}
                >
                  {selectOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                  <option value={OTHER_VALUE}>Otro (especificar)</option>
                </select>
                {selectedConcept === OTHER_VALUE && (
                  <input
                    type="text"
                    value={customConcept}
                    onChange={(e) => setCustomConcept(e.target.value)}
                    placeholder="Escribe el concepto"
                    className={`mt-2 ${inputClass}`}
                  />
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="expense-amount" className={labelClass}>
                    Monto <span className={requiredMarkClass}>*</span>
                  </label>
                  <input
                    id="expense-amount"
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(formatAmountDisplay(e.target.value))}
                    placeholder="Ej. 50.000"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="expense-payment" className={labelClass}>
                    Forma de pago
                  </label>
                  <select
                    id="expense-payment"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as "cash" | "transfer")}
                    className={inputClass}
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="expense-notes" className={labelClass}>
                  Notas (opcional)
                </label>
                <textarea
                  id="expense-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalle adicional si lo necesitas"
                  className={textareaClass}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Registrar egreso"}
              </button>
              <Link
                href="/egresos"
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </Link>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Resumen
            </p>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/40 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/25">
                <span className="text-slate-600 dark:text-slate-400">Concepto</span>
                <span className="max-w-[180px] truncate text-right font-medium text-slate-900 dark:text-slate-100" title={effectiveConcept || undefined}>
                  {effectiveConcept || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/40 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/25">
                <span className="text-slate-600 dark:text-slate-400">Monto</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-50">
                  {amountNum > 0 ? `$ ${amountNum.toLocaleString("es-CO")}` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/40 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/25">
                <span className="text-slate-600 dark:text-slate-400">Forma de pago</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{paymentLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
