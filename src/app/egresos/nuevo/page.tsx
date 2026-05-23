"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import { InfoTip } from "@/app/components/InfoTip";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activities";
const REPORTS_SURFACE = "berea-reports-surface";

const bereaFieldClass =
  "h-11 w-full rounded-xl border border-[var(--shell-workspace-search-border)] bg-[var(--shell-workspace-search-bg)] text-[14px] text-[var(--berea-ink)] shadow-[inset_0_0_0_0.5px_rgba(44,40,36,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--berea-ink-muted)] focus:border-[rgba(44,40,36,0.22)] focus:ring-0 dark:border-[var(--shell-nav-border)] dark:bg-[var(--shell-nav-card-bg)] dark:text-[var(--shell-nav-fg)] dark:placeholder:text-[var(--shell-nav-fg-subtle)]";

const bereaFilterLabel = "block text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]";

const bereaSectionLabel = "text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]";

const bereaCardClass = `rounded-xl p-4 sm:p-5 ${REPORTS_SURFACE}`;

const bereaBadgeBase = "inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset";

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

    const { data: userRow } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const { data: inserted, error: insertError } = await supabase
      .from("expenses")
      .insert({
        branch_id: ub.branch_id,
        user_id: user.id,
        amount: amountNum,
        payment_method: paymentMethod,
        concept: conceptTrim,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message || "No se pudo registrar el egreso.");
      setSaving(false);
      return;
    }

    if (userRow?.organization_id) {
      void logActivity(supabase, {
        organizationId: userRow.organization_id,
        branchId: ub.branch_id,
        userId: user.id,
        action: "expense_created",
        entityType: "expense",
        entityId: inserted?.id ?? null,
        summary: `${conceptTrim} · $${amountNum.toLocaleString("es-CO")} (${paymentMethod === "cash" ? "efectivo" : "transferencia"})`,
        metadata: { amount: amountNum, concept: conceptTrim, payment_method: paymentMethod },
      });
    }

    router.push("/egresos");
  }

  const amountNum = parseFloat(amount.replace(/\./g, "").replace(",", ".")) || 0;
  const paymentLabel = paymentMethod === "cash" ? "Efectivo" : "Transferencia";
  const inputClass = bereaFieldClass;
  const textareaClass = `${bereaFieldClass.replace("h-11 ", "min-h-[5.5rem] py-3 ")} resize-y`;
  const labelClass = `mb-1.5 block ${bereaSectionLabel}`;
  const requiredMarkClass = "text-[color:var(--shell-sidebar)]";

  return (
    <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 text-[15px] text-[var(--berea-ink)] sm:space-y-6">
      <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Breadcrumb items={[{ label: "Egresos", href: "/egresos" }, { label: "Nuevo egreso" }]} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">
                Nuevo egreso o gasto
              </h1>
              <InfoTip ariaLabel="Cómo encaja con los reportes">
                Este egreso reduce el <strong className="font-semibold">dinero disponible</strong> (neto en caja en
                reportes). El <strong className="font-semibold">margen bruto</strong> se calcula al vender usando el{" "}
                <strong className="font-semibold">costo del producto</strong> en el catálogo: conviene actualizarlo cuando
                compras mercancía para que ambos números reflejen la misma realidad.
              </InfoTip>
            </div>
            <p className="mt-0.5 text-[14px] text-[var(--berea-ink-muted)]">
              Registra una salida de dinero (efectivo o transferencia).
            </p>
          </div>
          <Link
            href="/egresos"
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] hover:text-[var(--berea-ink)] ${REPORTS_SURFACE}`}
            title="Volver a egresos"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-900 ring-1 ring-inset ring-red-300 dark:border-red-900/45 dark:bg-red-900/30 dark:text-red-200" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className={bereaCardClass}>
            <p className={bereaSectionLabel}>
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
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Registrar egreso"}
              </button>
              <Link
                href="/egresos"
                className={`inline-flex h-10 items-center rounded-lg px-4 text-[13px] font-semibold text-[var(--berea-ink)] transition-colors hover:bg-[var(--shell-workspace)] ${REPORTS_SURFACE}`}
              >
                Cancelar
              </Link>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className={bereaCardClass}>
            <p className={bereaSectionLabel}>
              Resumen
            </p>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between gap-2 rounded-xl bg-[var(--shell-workspace)] px-3 py-2.5">
                <span className="text-[var(--berea-ink-muted)]">Concepto</span>
                <span className="max-w-[180px] truncate text-right font-medium text-[var(--berea-ink)]" title={effectiveConcept || undefined}>
                  {effectiveConcept || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2 rounded-xl bg-[var(--shell-workspace)] px-3 py-2.5">
                <span className="text-[var(--berea-ink-muted)]">Monto</span>
                <span className="tabular-nums font-semibold text-[var(--berea-ink)]">
                  {amountNum > 0 ? `$ ${amountNum.toLocaleString("es-CO")}` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2 rounded-xl bg-[var(--shell-workspace)] px-3 py-2.5">
                <span className="text-[var(--berea-ink-muted)]">Forma de pago</span>
                <span className="font-medium text-[var(--berea-ink)]">{paymentLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
