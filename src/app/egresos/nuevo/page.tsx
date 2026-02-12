"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_CONCEPTS = [
  "Pago servicios",
  "Compra insumos",
  "Nómina",
  "Arriendo",
  "Servicios públicos",
  "Transporte y flete",
  "Mantenimiento",
  "Publicidad",
  "Suministros de oficina",
  "Pago a proveedores",
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

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Egresos", href: "/egresos" }, { label: "Nuevo egreso" }]} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Nuevo egreso o gasto
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registra una salida de dinero: pago a proveedor, gasto operativo, etc.
            </p>
          </div>
          <Link
            href="/egresos"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a egresos"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-[14px] font-medium text-red-800 dark:bg-red-900/30 dark:text-red-200" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Datos del egreso
            </p>
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="expense-concept" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Concepto <span className="text-red-500">*</span>
                </label>
                <select
                  id="expense-concept"
                  value={selectedConcept}
                  onChange={(e) => setSelectedConcept(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                    className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="expense-amount" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Monto <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="expense-amount"
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(formatAmountDisplay(e.target.value))}
                    placeholder="Ej. 50.000"
                    required
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="expense-payment" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Forma de pago
                  </label>
                  <select
                    id="expense-payment"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as "cash" | "transfer")}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="expense-notes" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Notas (opcional)
                </label>
                <textarea
                  id="expense-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalle adicional si lo necesitas"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-ov-pink px-5 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:opacity-60 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              >
                {saving ? "Guardando…" : "Registrar egreso"}
              </button>
              <Link
                href="/egresos"
                className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </Link>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen
            </p>
            <div className="mt-3 space-y-2 text-[14px]">
              <div className="flex justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Concepto</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right truncate max-w-[180px]" title={effectiveConcept || undefined}>
                  {effectiveConcept || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Monto</span>
                <span className="font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                  {amountNum > 0 ? `$ ${amountNum.toLocaleString("es-CO")}` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
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
