"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/app/components/Breadcrumb";
import { workspaceFormInputMdClass } from "@/lib/workspace-field-classes";
import { logActivity } from "@/lib/activities";
import { MdBadge, MdBusiness, MdPerson, MdSchedule, MdStorefront } from "react-icons/md";
import { getPaymentListChipClass, getStatusListChipClass } from "@/app/ventas/sales-mode";
import {
  creditLineDisplayStatus,
  creditRowPending,
  creditStatusChip,
  formatDateShort,
  formatDateTime,
  formatMoney,
  paymentMethodLabel,
  type CreditStatus,
} from "../credit-ui";

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

function first<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

type SaleItemRow = {
  id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  products: { name: string; sku: string | null } | null;
};

type SaleEmbed = {
  id: string;
  invoice_number: string;
  payment_method: string;
  payment_pending: boolean | null;
  status: string;
  users: { name: string } | null;
  sale_items: SaleItemRow[];
};

type CreditDetail = {
  id: string;
  public_ref: string;
  total_amount: number;
  amount_paid: number;
  due_date: string;
  status: CreditStatus;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  customer_id: string;
  sale_id: string | null;
  branch_id: string;
  customers: { id: string; name: string } | null;
  branches: { name: string } | null;
  created_by_profile: { name: string } | null;
  sales: SaleEmbed | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  payment_method: "cash" | "transfer" | "mixed";
  amount_cash: number | null;
  amount_transfer: number | null;
  payment_source?: "customer_payment" | "warranty_refund" | string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  users?: { name: string } | null;
};

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

function normalizeCreditRow(raw: Record<string, unknown>): CreditDetail {
  const customers = first(raw.customers as { id: string; name: string } | { id: string; name: string }[] | null);
  const branches = first(raw.branches as { name: string } | { name: string }[] | null);
  const created_by_profile = first(
    raw.created_by_profile as { name: string } | { name: string }[] | null
  );
  const saleRaw = first(raw.sales as Record<string, unknown> | Record<string, unknown>[] | null);
  let sales: SaleEmbed | null = null;
  if (saleRaw && typeof saleRaw === "object" && "id" in saleRaw) {
    const itemsRaw = saleRaw.sale_items;
    const itemsList = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw ? [itemsRaw] : [];
    const saleUsers = first(saleRaw.users as { name: string } | { name: string }[] | null);
    sales = {
      id: String(saleRaw.id),
      invoice_number: String(saleRaw.invoice_number ?? ""),
      payment_method: String(saleRaw.payment_method ?? "transfer"),
      payment_pending: saleRaw.payment_pending === true,
      status: String(saleRaw.status ?? ""),
      users: saleUsers,
      sale_items: itemsList.map((it) => {
        const row = it as Record<string, unknown>;
        const prod = first(
          row.products as { name: string; sku: string | null } | { name: string; sku: string | null }[] | null | undefined
        );
        return {
          id: String(row.id),
          quantity: Number(row.quantity) || 0,
          unit_price: Number(row.unit_price) || 0,
          discount_percent: Number(row.discount_percent) || 0,
          discount_amount: Number(row.discount_amount) || 0,
          products: prod,
        };
      }),
    };
  }
  return {
    id: String(raw.id),
    public_ref: String(raw.public_ref),
    total_amount: Number(raw.total_amount),
    amount_paid: Number(raw.amount_paid),
    due_date: String(raw.due_date),
    status: raw.status as CreditStatus,
    cancelled_at: raw.cancelled_at ? String(raw.cancelled_at) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    created_at: String(raw.created_at),
    customer_id: String(raw.customer_id),
    sale_id: raw.sale_id ? String(raw.sale_id) : null,
    branch_id: String(raw.branch_id),
    customers,
    branches,
    created_by_profile,
    sales,
  };
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

  const load = useCallback(async () => {
    if (!creditId) return;
    const supabase = createClient();
    setLoading(true);
    setError(null);
    const { data: cRow, error: cErr } = await supabase
      .from("customer_credits")
      .select(
        `id, public_ref, total_amount, amount_paid, due_date, status, cancelled_at, notes, created_at, customer_id, sale_id, branch_id, created_by,
        customers(id, name),
        branches(name),
        created_by_profile:users!customer_credits_created_by_fkey(name),
        sales(
          id,
          invoice_number,
          payment_method,
          payment_pending,
          status,
          users!user_id(name),
          sale_items(
            id,
            quantity,
            unit_price,
            discount_percent,
            discount_amount,
            products(name, sku)
          )
        )`
      )
      .eq("id", creditId)
      .maybeSingle();
    if (cErr || !cRow) {
      setError(cErr?.message ?? "Crédito no encontrado.");
      setCredit(null);
      setPayments([]);
      setLoading(false);
      return;
    }
    setCredit(normalizeCreditRow(cRow as unknown as Record<string, unknown>));
    const { data: pays, error: pErr } = await supabase
      .from("credit_payments")
      .select(
        "id, amount, payment_method, amount_cash, amount_transfer, payment_source, notes, created_at, created_by, users!credit_payments_created_by_fkey(name)"
      )
      .eq("credit_id", creditId)
      .order("created_at", { ascending: false });
    if (pErr) setError(pErr.message);
    setPayments((pays ?? []) as unknown as PaymentRow[]);
    setLoading(false);
  }, [creditId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("abonar") === "1") setShowAbono(true);
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

  const paymentChipKey = pendiente > 0.005 && !credit?.cancelled_at ? "pending" : "completed";
  const paymentChipLabel = pendiente > 0.005 && !credit?.cancelled_at ? "Pendiente" : "Pagado";

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
    try {
      const { data: orgRow } = await supabase.from("users").select("organization_id").eq("id", user.id).maybeSingle();
      const orgId = orgRow?.organization_id;
      if (orgId) {
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
            notes: abonoNotes.trim() || null,
            credit_public_ref: credit.public_ref,
            customer_name: cust ?? null,
          },
        });
      }
    } catch {
      /* no bloquear flujo */
    }
    setShowAbono(false);
    setAbonoAmountStr("");
    setCashStr("");
    setTransferStr("");
    setAbonoNotes("");
    router.replace(`/creditos/${credit.id}`);
    await load();
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
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        const { data: orgRow } = await supabase.from("users").select("organization_id").eq("id", uid).maybeSingle();
        const orgId = orgRow?.organization_id;
        if (orgId) {
          const cust = credit.customers?.name?.trim();
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
        }
      }
    } catch {
      /* no bloquear */
    }
    await load();
  }

  if (loading) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-[1600px] p-8">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (!credit) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 p-6">
        <p className="text-[15px] font-medium text-slate-700 dark:text-slate-200">{error ?? "No encontrado"}</p>
        <Link href="/creditos" className="text-[13px] font-medium text-[color:var(--shell-sidebar)] dark:text-zinc-300">
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
      className={`mx-auto w-full min-w-0 max-w-[1600px] space-y-6 px-4 pb-10 pt-2 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100 sm:px-6 ${
        isCreditAnnulled
          ? "rounded-2xl ring-1 ring-red-500/[0.11] ring-offset-0 dark:ring-red-400/[0.14]"
          : ""
      }`}
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-[13px] text-red-800 dark:border-red-900/45 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Card principal — mismo patrón que detalle de factura */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
        <Breadcrumb
          items={[
            { label: "Créditos", href: "/creditos" },
            { label: customerName, href: `/creditos/cliente/${credit.customer_id}` },
            { label: `Crédito #${credit.public_ref}` },
          ]}
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              Crédito #{credit.public_ref}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-slate-500 dark:text-slate-400 sm:text-[13px]">
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
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
                $ {formatMoney(Number(credit.total_amount))}
              </p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Método de pago (factura)</p>
              <div className="mt-1">
                <span className={getPaymentListChipClass()}>{salePaymentLabel}</span>
              </div>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Estado del pago</p>
              <div className="mt-1">
                <span className={getStatusListChipClass(paymentChipKey)}>{paymentChipLabel}</span>
              </div>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Estado del crédito</p>
              <div className="mt-1">
                <span className={chip.className}>{chip.label}</span>
              </div>
            </div>
            {credit.sales?.id && (
              <div className="col-span-2 min-w-0 sm:col-span-1 sm:border-l sm:border-slate-200 sm:pl-4 sm:dark:border-slate-700">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Factura</p>
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
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pagado</p>
              <p className="mt-0.5 font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                $ {formatMoney(Number(credit.amount_paid))}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pendiente</p>
              <p className="mt-0.5 font-semibold tabular-nums text-slate-800 dark:text-slate-100">$ {formatMoney(pendiente)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {pendiente > 0.005 && !credit.cancelled_at && (
            <button
              type="button"
              onClick={() => setShowAbono(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            >
              Registrar abono
            </button>
          )}
          {!credit.cancelled_at && pendiente > 0.005 && (
            <button
              type="button"
              onClick={handleCancelarCredito}
              disabled={cancelling}
              className="inline-flex h-9 items-center rounded-xl border border-slate-300 px-4 text-[13px] font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
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
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
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
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Producto</th>
                    <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Cant. pedida</th>
                    <th className="whitespace-nowrap px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">P. unit.</th>
                    <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Cant.</th>
                    <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Subtotal</th>
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
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
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
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12px] font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
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
                <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400 sm:text-[13px] sm:text-slate-700 dark:sm:text-slate-200">
                  {formatDateTime(p.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAbono && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 dark:bg-black/60 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">Registrar abono</h3>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Pendiente: $ {formatMoney(pendiente)}</p>
            <form onSubmit={handleAbono} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-700 dark:text-slate-300">Monto</label>
                <input
                  type="text"
                  className={workspaceFormInputMdClass}
                  value={abonoAmountStr}
                  onChange={(e) => setAbonoAmountStr(sanitizeFormattedMoneyInput(e.target.value))}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Ej. 50.000 o 12.500,50"
                />
              </div>
              <div>
                <p className="mb-2 text-[12px] font-semibold text-slate-700 dark:text-slate-300">Método</p>
                <div className="flex flex-wrap gap-2">
                  {(["transfer", "cash", "mixed"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAbonoMethod(m)}
                      className={`rounded-xl border px-3 py-2 text-[13px] font-medium ${
                        abonoMethod === m
                          ? "border-[color:var(--shell-sidebar)] bg-[color:var(--shell-sidebar)]/10 text-[color:var(--shell-sidebar)] dark:border-zinc-500/45 dark:bg-white/10 dark:text-zinc-300"
                          : "border-slate-200 text-slate-600 dark:border-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {paymentMethodLabel(m)}
                    </button>
                  ))}
                </div>
              </div>
              {abonoMethod === "mixed" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">Efectivo</label>
                    <input
                      type="text"
                      className={workspaceFormInputMdClass}
                      value={cashStr}
                      onChange={(e) => setCashStr(sanitizeFormattedMoneyInput(e.target.value))}
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">Transferencia</label>
                    <input
                      type="text"
                      className={workspaceFormInputMdClass}
                      value={transferStr}
                      onChange={(e) => setTransferStr(sanitizeFormattedMoneyInput(e.target.value))}
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-700 dark:text-slate-300">Notas (opcional)</label>
                <input className={workspaceFormInputMdClass} value={abonoNotes} onChange={(e) => setAbonoNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAbono(false);
                    router.replace(`/creditos/${credit.id}`);
                  }}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-[13px] font-medium dark:border-slate-600"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white disabled:opacity-50"
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
