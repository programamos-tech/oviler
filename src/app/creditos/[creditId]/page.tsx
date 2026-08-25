"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/app/components/Breadcrumb";
import { logActivity } from "@/lib/activities";
import {
  fetchCreditoDetailBundle,
  getCachedCreditoDetail,
  invalidateCreditoDetail,
  type CreditPaymentRow,
} from "@/lib/creditos-detail-cache";
import type { CreditDetailPayload } from "@/lib/creditos-normalize";
import { MdBadge, MdBusiness, MdPerson, MdSchedule, MdStorefront } from "react-icons/md";
import { getPedidoPaymentMethodChipClass } from "@/app/ventas/sales-mode";
import {
  creditLineDisplayStatus,
  creditPaymentStateChip,
  creditRowPending,
  creditStatusChip,
  formatDateShort,
  formatDateTime,
  formatMoney,
  paymentMethodChipClass,
  paymentMethodLabel,
} from "../credit-ui";

const REPORTS_SURFACE = "berea-reports-surface";

const bereaFieldClass =
  "h-11 w-full rounded-xl border border-[var(--shell-workspace-search-border)] bg-[var(--shell-workspace-search-bg)] text-[14px] text-[var(--berea-ink)] shadow-[inset_0_0_0_0.5px_rgba(44,40,36,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--berea-ink-muted)] focus:border-[rgba(44,40,36,0.22)] focus:ring-0 dark:border-[var(--shell-nav-border)] dark:bg-[var(--shell-nav-card-bg)] dark:text-[var(--shell-nav-fg)] dark:placeholder:text-[var(--shell-nav-fg-subtle)]";

const bereaSectionLabel = "text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  mixed: "Mixto",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function displayInvoiceNumber(invoiceNumber: string) {
  if (!invoiceNumber) return invoiceNumber;
  const sin = invoiceNumber.replace(/^FV-?\s*/i, "").trim();
  return sin || invoiceNumber;
}

type SaleItemRow = {
  id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  products: { name: string; sku: string | null } | null;
};

type CreditDetail = CreditDetailPayload;
type PaymentRow = CreditPaymentRow;

function lineItemSubtotal(it: SaleItemRow): number {
  const raw = it.quantity * it.unit_price;
  const byPercent = (raw * (Number(it.discount_percent) || 0)) / 100;
  const byAmount = Number(it.discount_amount) || 0;
  return Math.max(0, Math.round(raw - byPercent - byAmount));
}

function hasLineDiscount(it: SaleItemRow): boolean {
  return (Number(it.discount_percent) || 0) > 0 || (Number(it.discount_amount) || 0) > 0;
}

function lineDiscountLabel(it: SaleItemRow): string {
  const pct = Number(it.discount_percent) || 0;
  const amt = Number(it.discount_amount) || 0;
  if (pct > 0 && amt > 0) return `${pct}% · $ ${formatMoney(amt)}`;
  if (pct > 0) return `${pct}%`;
  if (amt > 0) return `$ ${formatMoney(amt)}`;
  return "";
}

const moneyInputFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
  useGrouping: true,
});

/**
 * Miles con `.` y decimales con `,` (es-CO), alineado con `formatMoney`.
 * Solo dígitos; una coma como separador decimal; máximo 2 decimales.
 */
function sanitizeFormattedMoneyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, "");
  if (cleaned === "") return "";
  const comma = cleaned.indexOf(",");
  const intDigits = (comma === -1 ? cleaned : cleaned.slice(0, comma)).replace(/\D/g, "");
  const fracDigits = comma === -1 ? "" : cleaned.slice(comma + 1).replace(/\D/g, "").slice(0, 2);
  const trailingComma = comma >= 0 && cleaned.endsWith(",") && fracDigits === "";

  if (intDigits === "" && fracDigits === "" && !trailingComma) return "";

  const intNum = intDigits === "" ? 0 : parseInt(intDigits, 10);
  if (!Number.isFinite(intNum)) return "";
  const intPart = moneyInputFormatter.format(intNum);

  if (!trailingComma && fracDigits === "") return intPart;
  if (trailingComma && fracDigits === "") return `${intPart},`;
  return `${intPart},${fracDigits}`;
}

function parseMoneyInput(s: string): number {
  const comma = s.indexOf(",");
  const intStr = (comma === -1 ? s : s.slice(0, comma)).replace(/\D/g, "");
  const fracStr = comma === -1 ? "" : s.slice(comma + 1).replace(/\D/g, "").slice(0, 2);
  const intVal = intStr === "" ? 0 : parseInt(intStr, 10);
  if (!Number.isFinite(intVal)) return 0;
  if (fracStr === "") return Math.round(intVal * 100) / 100;
  const fracNum = parseInt(fracStr.padEnd(2, "0"), 10) / 100;
  return Math.round((intVal + fracNum) * 100) / 100;
}

function CreditoDetalleInner() {
  const params = useParams();
  const creditId = String(params.creditId ?? "");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [credit, setCredit] = useState<CreditDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAbono, setShowAbono] = useState(false);
  const [abonoAmountStr, setAbonoAmountStr] = useState("");
  const [abonoMethod, setAbonoMethod] = useState<"cash" | "transfer" | "mixed">("transfer");
  const [cashStr, setCashStr] = useState("");
  const [transferStr, setTransferStr] = useState("");
  const [abonoNotes, setAbonoNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!creditId) return;
    let cancelled = false;

    const cached = getCachedCreditoDetail(creditId, refreshKey);
    if (cached) {
      setCredit(cached.credit);
      setPayments(cached.payments);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    (async () => {
      const bundle = await fetchCreditoDetailBundle(creditId, refreshKey);
      if (cancelled) return;
      if (!bundle) {
        setError("Crédito no encontrado.");
        setCredit(null);
        setPayments([]);
      } else {
        setCredit(bundle.credit);
        setPayments(bundle.payments);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [creditId, refreshKey]);

  useEffect(() => {
    if (searchParams.get("abonar") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowAbono(true);
    }
  }, [searchParams]);

  const pendiente = useMemo(() => {
    if (!credit) return 0;
    return creditRowPending(Number(credit.total_amount), Number(credit.amount_paid), Boolean(credit.cancelled_at));
  }, [credit]);

  const lastPayment = payments[0] ?? null;

  const saleItems = credit?.sales?.sale_items ?? [];
  const itemsSubtotal = useMemo(
    () => saleItems.reduce((s, it) => s + lineItemSubtotal(it), 0),
    [saleItems]
  );

  const paymentChipKey =
    credit?.cancelled_at
      ? ("cancelled" as const)
      : pendiente > 0.005
        ? ("pending" as const)
        : ("completed" as const);
  const paymentChip = creditPaymentStateChip(paymentChipKey);

  async function handleAbono(e: React.FormEvent) {
    e.preventDefault();
    if (!credit) return;
    const amount = parseMoneyInput(abonoAmountStr);
    if (amount <= 0) {
      setError("Indica un monto válido.");
      return;
    }
    if (amount > pendiente + 0.01) {
      setError("El abono no puede superar el saldo pendiente.");
      return;
    }
    let amount_cash: number | null = null;
    let amount_transfer: number | null = null;
    if (abonoMethod === "mixed") {
      const c = parseMoneyInput(cashStr);
      const t = parseMoneyInput(transferStr);
      if (c <= 0 || t <= 0) {
        setError("En mixto, indica efectivo y transferencia.");
        return;
      }
      if (Math.abs(c + t - amount) > 0.01) {
        setError("Efectivo + transferencia debe igualar el total del abono.");
        return;
      }
      amount_cash = c;
      amount_transfer = t;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    const { error: insErr } = await supabase.from("credit_payments").insert({
      credit_id: credit.id,
      amount,
      payment_method: abonoMethod,
      amount_cash,
      amount_transfer,
      notes: abonoNotes.trim() || null,
      created_by: user.id,
      payment_source: "customer_payment",
    });
    setSubmitting(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    const notesForLog = abonoNotes.trim() || null;
    setShowAbono(false);
    setAbonoAmountStr("");
    setCashStr("");
    setTransferStr("");
    setAbonoNotes("");
    router.replace(`/creditos/${credit.id}`);
    invalidateCreditoDetail(credit.id);
    setRefreshKey((k) => k + 1);
    void (async () => {
      const { data: orgRow } = await supabase.from("users").select("organization_id").eq("id", user.id).maybeSingle();
      const orgId = orgRow?.organization_id;
      if (!orgId) return;
      const cust = credit.customers?.name?.trim();
      await logActivity(supabase, {
        organizationId: orgId,
        branchId: credit.branch_id,
        userId: user.id,
        action: "credit_payment",
        entityType: "credit",
        entityId: credit.id,
        summary: `Abono $ ${formatMoney(amount)} · Crédito ${credit.public_ref}${cust ? ` — ${cust}` : ""}`,
        metadata: {
          amount,
          payment_method: abonoMethod,
          amount_cash,
          amount_transfer,
          payment_source: "customer_payment",
          notes: notesForLog,
          credit_public_ref: credit.public_ref,
          customer_name: cust ?? null,
        },
      });
    })().catch(() => {});
  }

  async function handleCancelarCredito() {
    if (!credit || credit.cancelled_at) return;
    if (!window.confirm("¿Anular este crédito? No podrás registrar más abonos.")) return;
    const supabase = createClient();
    setCancelling(true);
    const { error: uErr } = await supabase
      .from("customer_credits")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", credit.id);
    setCancelling(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    invalidateCreditoDetail(credit.id);
    setRefreshKey((k) => k + 1);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (uid) {
      const cust = credit.customers?.name?.trim();
      void (async () => {
        const { data: orgRow } = await supabase.from("users").select("organization_id").eq("id", uid).maybeSingle();
        const orgId = orgRow?.organization_id;
        if (!orgId) return;
        await logActivity(supabase, {
          organizationId: orgId,
          branchId: credit.branch_id,
          userId: uid,
          action: "credit_cancelled",
          entityType: "credit",
          entityId: credit.id,
          summary: `Crédito anulado ${credit.public_ref}${cust ? ` — ${cust}` : ""}`,
          metadata: {
            credit_public_ref: credit.public_ref,
            customer_name: cust ?? null,
          },
        });
      })().catch(() => {});
    }
  }

  if (loading) {
    return (
      <div className="berea-reports mx-auto min-w-0 max-w-[1600px] p-8">
        <div className={`h-40 animate-pulse rounded-xl ${REPORTS_SURFACE}`} />
      </div>
    );
  }

  if (!credit) {
    return (
      <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-4 p-6 text-[15px] text-[var(--berea-ink)]">
        <p className="font-medium">{error ?? "No encontrado"}</p>
        <Link href="/creditos" className="text-[13px] font-semibold text-[color:var(--shell-sidebar)]">
          Volver a créditos
        </Link>
      </div>
    );
  }

  const disp = creditLineDisplayStatus(credit.status, Number(credit.total_amount), Number(credit.amount_paid), credit.cancelled_at);
  const chip = creditStatusChip(disp);
  const isCreditAnnulled = disp === "cancelled" || Boolean(credit.cancelled_at);
  const customerName = credit.customers?.name ?? "—";
  const branchName = credit.branches?.name ?? "—";
  const userName = credit.sales?.users?.name ?? credit.created_by_profile?.name ?? "—";
  const salePaymentLabel = credit.sales
    ? PAYMENT_LABELS[credit.sales.payment_method] ?? credit.sales.payment_method
    : "Crédito";

  return (
    <div
      className={`berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 pb-10 pt-2 text-[15px] text-[var(--berea-ink)] sm:space-y-6 ${
        isCreditAnnulled ? "rounded-xl ring-1 ring-red-300/60" : ""
      }`}
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-[13px] text-red-800 dark:border-red-900/45 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Card principal — mismo patrón que detalle de factura */}
      <div className={`rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}`}>
        <Breadcrumb
          items={[
            { label: "Créditos", href: "/creditos" },
            { label: customerName, href: `/creditos/cliente/${credit.customer_id}` },
            { label: `Crédito #${credit.public_ref}` },
          ]}
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">
              Crédito #{credit.public_ref}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--berea-ink-muted)] sm:text-[14px]">
              <span className="inline-flex items-center gap-1">
                <MdSchedule className="h-4 w-4 shrink-0" aria-hidden />
                {formatDate(credit.created_at)} · {formatTime(credit.created_at)}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1">
                <MdPerson className="h-4 w-4 shrink-0" aria-hidden />
                {customerName}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1">
                <MdStorefront className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                Tienda
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1">
                <MdBusiness className="h-4 w-4 shrink-0" aria-hidden />
                {branchName}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1">
                <MdBadge className="h-4 w-4 shrink-0" aria-hidden />
                {userName}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                Vence {formatDateShort(credit.due_date)}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/creditos/cliente/${credit.customer_id}`}
              className="rounded-lg p-2 text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] hover:text-[var(--berea-ink)]"
              title="Volver"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:flex-wrap sm:gap-4">
            <div className="min-w-0 p-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Total</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-[var(--berea-ink)] sm:text-2xl">
                $ {formatMoney(Number(credit.total_amount))}
              </p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:dark:border-slate-700">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Método de pago (factura)</p>
              <div className="mt-1">
                <span
                  className={
                    credit.sales?.payment_method
                      ? getPedidoPaymentMethodChipClass(credit.sales.payment_method)
                      : paymentMethodChipClass(null)
                  }
                >
                  {salePaymentLabel}
                </span>
              </div>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:dark:border-slate-700">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Estado del pago</p>
              <div className="mt-1">
                <span className={paymentChip.className}>{paymentChip.label}</span>
              </div>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:dark:border-slate-700">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Estado del crédito</p>
              <div className="mt-1">
                <span className={chip.className}>{chip.label}</span>
              </div>
            </div>
            {credit.sales?.id && (
              <div className="col-span-2 min-w-0 sm:col-span-1 sm:border-l sm:border-slate-200 sm:pl-4 sm:dark:border-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Factura</p>
                <div className="mt-1">
                  <Link
                    href={`/ventas/${credit.sales.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    #{displayInvoiceNumber(credit.sales.invoice_number)}
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="grid w-full grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-[13px] dark:border-slate-800 sm:w-auto sm:border-t-0 sm:pt-0">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Pagado</p>
              <p className="mt-0.5 font-semibold tabular-nums text-[var(--berea-ink)]">
                $ {formatMoney(Number(credit.amount_paid))}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Pendiente</p>
              <p className="mt-0.5 font-semibold tabular-nums text-[var(--berea-ink)]">$ {formatMoney(pendiente)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5 border-t border-[var(--berea-card-border)] pt-4">
          {pendiente > 0.005 && !credit.cancelled_at && (
            <button
              type="button"
              onClick={() => setShowAbono(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-[14px] font-semibold text-white shadow-md shadow-emerald-900/20 transition-colors hover:bg-emerald-800"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Registrar abono
            </button>
          )}
          {!credit.cancelled_at && pendiente > 0.005 && (
            <button
              type="button"
              onClick={handleCancelarCredito}
              disabled={cancelling}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-[14px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {cancelling ? "Anulando…" : "Anular crédito"}
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-[12px] text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:grid-cols-3 sm:text-[13px]">
          <div>
            <span className="font-semibold text-slate-500 dark:text-slate-500">Creación: </span>
            {formatDateTime(credit.created_at)}
          </div>
          <div>
            <span className="font-semibold text-slate-500 dark:text-slate-500">Último abono: </span>
            {lastPayment ? formatDateTime(lastPayment.created_at) : "—"}
          </div>
          <div>
            <span className="font-semibold text-slate-500 dark:text-slate-500">Monto último abono: </span>
            {lastPayment ? `$ ${formatMoney(Number(lastPayment.amount))}` : "—"}
          </div>
        </div>

        {credit.notes && (
          <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notas</p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">{credit.notes}</p>
          </div>
        )}
      </div>

      {/* Productos — mismo contenedor que factura */}
      <div className={`rounded-xl p-4 sm:p-5 ${REPORTS_SURFACE}`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">
          Productos de la factura
        </h2>
        {saleItems.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-700">
            <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">
              {credit.sale_id ? "No hay líneas de producto en la factura vinculada." : "Este crédito no tiene factura asociada."}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-2 sm:hidden">
              {saleItems.map((it) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40"
                >
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {it.products?.name ?? "—"}{" "}
                    {it.products?.sku ? <span className="font-normal text-slate-500">({it.products.sku})</span> : null}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                    <p className="text-slate-500 dark:text-slate-400">
                      Cant.: <span className="font-medium text-slate-700 dark:text-slate-200">{it.quantity}</span>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      P. unit.: <span className="font-medium text-slate-700 dark:text-slate-200">$ {formatMoney(it.unit_price)}</span>
                    </p>
                    <p className="col-span-2 text-slate-500 dark:text-slate-400">
                      Subtotal:{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-100">$ {formatMoney(lineItemSubtotal(it))}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[520px] border-collapse text-[14px]">
                <thead>
                  <tr className="border-b border-[var(--berea-card-border)]">
                    <th className="px-3 pb-2 text-left font-semibold text-[var(--berea-ink-muted)]">Producto</th>
                    <th className="px-3 pb-2 text-left font-semibold text-[var(--berea-ink-muted)]">Cant. pedida</th>
                    <th className="whitespace-nowrap px-3 pb-2 text-left font-semibold text-[var(--berea-ink-muted)]">P. unit.</th>
                    <th className="px-3 pb-2 text-left font-semibold text-[var(--berea-ink-muted)]">Cant.</th>
                    <th className="px-3 pb-2 text-left font-semibold text-[var(--berea-ink-muted)]">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((it, rowIndex) => {
                    const rowEven = rowIndex % 2 === 0;
                    return (
                      <tr
                        key={it.id}
                        className={`border-b border-slate-100 dark:border-slate-800 ${
                          rowEven ? "bg-slate-50/90 dark:bg-slate-800/50" : "bg-white dark:bg-slate-800/20"
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-slate-800 dark:text-slate-100">
                            {it.products?.name ?? "—"}
                            {it.products?.sku && (
                              <span className="ml-1.5 text-[12px] font-normal text-slate-500 dark:text-slate-400">
                                ({it.products.sku})
                              </span>
                            )}
                          </span>
                          {hasLineDiscount(it) && (
                            <span className="mt-0.5 block w-fit rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                              Descuento: {lineDiscountLabel(it)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">{it.quantity}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">
                          $ {formatMoney(it.unit_price)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">{it.quantity}</td>
                        <td className="px-3 py-2.5 font-medium tabular-nums text-slate-800 dark:text-slate-100">
                          $ {formatMoney(lineItemSubtotal(it))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-stretch sm:justify-end">
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50 sm:max-w-[280px]">
                <div className="space-y-1 text-[12px]">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal productos</span>
                    <span className="tabular-nums text-slate-800 dark:text-slate-200">$ {formatMoney(itemsSubtotal)}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-2 dark:border-slate-600">
                  <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Total factura</span>
                  <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">
                    $ {formatMoney(Number(credit.total_amount))}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Historial de abonos */}
      <div className={`rounded-xl p-4 sm:p-5 ${REPORTS_SURFACE}`}>
        <div className="mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">
            Historial de abonos ({payments.length})
          </h2>
        </div>
        <p className="mb-4 text-[12px] font-medium text-slate-500 dark:text-slate-400">
          Abonos registrados — crédito #{credit.public_ref}
        </p>
        {payments.length === 0 ? (
          <p className="text-[13px] text-slate-500 dark:text-slate-400">Aún no hay abonos.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 border-b border-slate-200 bg-slate-50/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 sm:px-4">
              <span>Monto</span>
              <span>Método</span>
              <span className="hidden sm:inline">Registrado por</span>
              <span className="text-right sm:text-left">Fecha</span>
            </div>
            {payments.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-1 gap-1 border-b border-slate-100 px-3 py-3 last:border-0 dark:border-slate-800 sm:grid-cols-[1fr_1fr_1fr_1fr] sm:items-center sm:gap-2 sm:px-4"
              >
                <div className="flex items-center gap-1 text-[14px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  <span className="text-slate-400" aria-hidden>
                    $
                  </span>
                  {formatMoney(Number(p.amount))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={getPedidoPaymentMethodChipClass(p.payment_method)}>
                    {paymentMethodLabel(p.payment_method)}
                    {p.payment_method === "mixed" &&
                      p.amount_cash != null &&
                      p.amount_transfer != null &&
                      ` (${formatMoney(Number(p.amount_cash))} + ${formatMoney(Number(p.amount_transfer))})`}
                  </span>
                  {p.payment_source === "warranty_refund" && (
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
                      Reembolso garantía
                    </span>
                  )}
                </div>
                <div className="text-[13px] text-slate-700 dark:text-slate-200 sm:hidden">
                  <span className="text-slate-500">Por </span>
                  {p.users?.name ?? "—"}
                </div>
                <div className="hidden text-[13px] text-slate-700 dark:text-slate-200 sm:block">{p.users?.name ?? "—"}</div>
                <div className="text-[13px] text-[var(--berea-ink-muted)] sm:text-[14px] sm:text-slate-700 dark:sm:text-slate-200">
                  {formatDateTime(p.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAbono && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="abono-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 dark:bg-black/60"
            aria-label="Cerrar"
            onClick={() => {
              if (submitting) return;
              setShowAbono(false);
              router.replace(`/creditos/${credit.id}`);
            }}
          />
          <div className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl p-5 shadow-xl sm:p-6 ${REPORTS_SURFACE}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 id="abono-modal-title" className="text-[17px] font-semibold text-[var(--berea-ink)] sm:text-lg">
                  Registrar abono
                </h3>
                <p className="mt-1 text-[14px] text-[var(--berea-ink-muted)]">Saldo pendiente del crédito</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (submitting) return;
                  setShowAbono(false);
                  router.replace(`/creditos/${credit.id}`);
                }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] hover:text-[var(--berea-ink)]"
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 rounded-lg border border-[var(--berea-card-border)] bg-[var(--shell-workspace)]/50 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Pendiente</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-[var(--berea-ink)]">$ {formatMoney(pendiente)}</p>
            </div>
            <form onSubmit={handleAbono} className="mt-5 space-y-4">
              <div>
                <label htmlFor="abono-amount" className={`mb-1.5 block ${bereaSectionLabel}`}>
                  Monto
                </label>
                <input
                  id="abono-amount"
                  type="text"
                  className={bereaFieldClass}
                  value={abonoAmountStr}
                  onChange={(e) => setAbonoAmountStr(sanitizeFormattedMoneyInput(e.target.value))}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Ej. 50.000 o 12.500,50"
                  autoFocus
                />
              </div>
              <div>
                <p className={`mb-2 ${bereaSectionLabel}`}>Método</p>
                <div
                  className="flex flex-wrap gap-1 rounded-xl border border-[var(--berea-card-border)] bg-[var(--shell-workspace)]/40 p-1"
                  role="group"
                  aria-label="Método de pago del abono"
                >
                  {(["transfer", "cash", "mixed"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAbonoMethod(m)}
                      className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                        abonoMethod === m
                          ? "bg-[color:var(--shell-sidebar)] text-white shadow-sm"
                          : "text-[var(--berea-ink-muted)] hover:bg-[var(--shell-workspace)] hover:text-[var(--berea-ink)]"
                      }`}
                    >
                      {paymentMethodLabel(m)}
                    </button>
                  ))}
                </div>
              </div>
              {abonoMethod === "mixed" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="abono-cash" className={`mb-1.5 block ${bereaSectionLabel}`}>
                      Efectivo
                    </label>
                    <input
                      id="abono-cash"
                      type="text"
                      className={bereaFieldClass}
                      value={cashStr}
                      onChange={(e) => setCashStr(sanitizeFormattedMoneyInput(e.target.value))}
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label htmlFor="abono-transfer" className={`mb-1.5 block ${bereaSectionLabel}`}>
                      Transferencia
                    </label>
                    <input
                      id="abono-transfer"
                      type="text"
                      className={bereaFieldClass}
                      value={transferStr}
                      onChange={(e) => setTransferStr(sanitizeFormattedMoneyInput(e.target.value))}
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="abono-notes" className={`mb-1.5 block ${bereaSectionLabel}`}>
                  Notas (opcional)
                </label>
                <textarea
                  id="abono-notes"
                  rows={2}
                  className={`${bereaFieldClass} min-h-[4.5rem] resize-y py-2.5`}
                  value={abonoNotes}
                  onChange={(e) => setAbonoNotes(e.target.value)}
                  placeholder="Observaciones del abono…"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAbono(false);
                    router.replace(`/creditos/${credit.id}`);
                  }}
                  disabled={submitting}
                  className="h-11 rounded-lg border border-[var(--berea-card-border)] px-4 text-[13px] font-semibold text-[var(--berea-ink)] transition-colors hover:bg-[var(--shell-workspace)] disabled:opacity-50"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 rounded-xl bg-emerald-700 px-5 text-[14px] font-semibold text-white shadow-md shadow-emerald-900/20 transition-colors hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? "Guardando…" : "Guardar abono"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreditoDetallePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 dark:text-slate-400">Cargando…</div>}>
      <CreditoDetalleInner />
    </Suspense>
  );
}
