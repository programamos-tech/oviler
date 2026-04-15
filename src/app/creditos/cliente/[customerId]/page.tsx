"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/app/components/Breadcrumb";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import { getAvatarVariant } from "@/app/components/app-nav-data";
import { MdReceiptLong } from "react-icons/md";
import {
  creditLineDisplayStatus,
  creditRowPending,
  creditStatusChip,
  formatDateShort,
  formatMoney,
  type CreditStatus,
} from "../../credit-ui";

type CreditRow = {
  id: string;
  public_ref: string;
  total_amount: number;
  amount_paid: number;
  due_date: string;
  status: CreditStatus;
  cancelled_at: string | null;
  sale_id: string | null;
  sales: { invoice_number: string } | null;
};

type CustomerRow = { id: string; name: string };

/** Número de venta visible con # (sin duplicar si ya viene con #). */
function ventaLinkLabel(invoiceNumber: string | undefined | null): string {
  const raw = String(invoiceNumber ?? "").trim();
  if (!raw || raw === "—") return "—";
  return raw.startsWith("#") ? raw : `#${raw}`;
}

export default function CreditosClientePage() {
  const params = useParams();
  const customerId = String(params.customerId ?? "");
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (!ub?.branch_id) {
        setError("Sin sucursal asignada.");
        setLoading(false);
        return;
      }
      const { data: cust, error: cErr } = await supabase.from("customers").select("id, name").eq("id", customerId).eq("branch_id", ub.branch_id).maybeSingle();
      if (cancelled) return;
      if (cErr || !cust) {
        setError("Cliente no encontrado en esta sucursal.");
        setCustomer(null);
        setCredits([]);
        setLoading(false);
        return;
      }
      setCustomer(cust as CustomerRow);
      const { data: cr, error: crErr } = await supabase
        .from("customer_credits")
        .select("id, public_ref, total_amount, amount_paid, due_date, status, cancelled_at, sale_id, sales(invoice_number)")
        .eq("branch_id", ub.branch_id)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (crErr) setError(crErr.message);
      setCredits((cr ?? []) as unknown as CreditRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const totalCred = credits.reduce((s, c) => s + Number(c.total_amount), 0);
  const totalPag = credits.reduce((s, c) => s + Number(c.amount_paid), 0);
  const totalPend = credits.reduce(
    (s, c) => s + creditRowPending(Number(c.total_amount), Number(c.amount_paid), Boolean(c.cancelled_at)),
    0
  );

  const th = "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500";
  const actionIconClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-[color:var(--shell-sidebar)] dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-zinc-300";

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb items={[{ label: "Créditos", href: "/creditos" }, { label: "Cliente" }]} />
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {customer && (
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                  <WorkspaceCharacterAvatar
                    seed={`${customer.id}-${getAvatarVariant(null)}`}
                    size={96}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">{customer.name}</h1>
                  <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">Créditos de este cliente en la sucursal</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/creditos"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ← Créditos
            </Link>
            <Link
              href={`/creditos/nuevo?cliente=${customerId}`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            >
              + Nuevo crédito
            </Link>
          </div>
        </div>

        {!loading && customer && (
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 dark:border-slate-800 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Total créditos</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">$ {formatMoney(totalCred)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Total pagado</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">$ {formatMoney(totalPag)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Total pendiente</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">$ {formatMoney(totalPend)}</p>
            </div>
          </div>
        )}
      </header>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </div>
      )}

      <section className="space-y-4 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Créditos del cliente</h2>
        {loading ? (
          <div className="min-h-[200px] animate-pulse rounded-2xl bg-slate-50 dark:bg-slate-800/40" />
        ) : credits.length === 0 ? (
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Este cliente no tiene créditos en esta sucursal.</p>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-slate-100 dark:border-zinc-800/80 xl:block">
              <div className="grid grid-cols-[minmax(100px,1fr)_minmax(90px,0.9fr)_minmax(88px,0.85fr)_minmax(88px,0.85fr)_minmax(88px,0.85fr)_minmax(100px,0.9fr)_minmax(100px,0.9fr)_minmax(88px,auto)] gap-x-3 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                <div className={th}>ID</div>
                <div className={th}>Venta</div>
                <div className={`${th} text-right`}>Total</div>
                <div className={`${th} text-right`}>Pagado</div>
                <div className={`${th} text-right`}>Pendiente</div>
                <div className={th}>Estado</div>
                <div className={th}>Vencimiento</div>
                <div className={`${th} text-right`}>Acciones</div>
              </div>
              {credits.map((c) => {
                const pend = creditRowPending(Number(c.total_amount), Number(c.amount_paid), Boolean(c.cancelled_at));
                const disp = creditLineDisplayStatus(c.status, Number(c.total_amount), Number(c.amount_paid), c.cancelled_at);
                const chip = creditStatusChip(disp);
                const inv = c.sales?.invoice_number ?? "—";
                return (
                  <div
                    key={c.id}
                    className="relative grid grid-cols-[minmax(100px,1fr)_minmax(90px,0.9fr)_minmax(88px,0.85fr)_minmax(88px,0.85fr)_minmax(88px,0.85fr)_minmax(100px,0.9fr)_minmax(100px,0.9fr)_minmax(88px,auto)] gap-x-3 border-b border-slate-100 px-4 py-4 last:border-b-0 hover:bg-slate-50/80 dark:border-zinc-800/60 dark:hover:bg-zinc-900/40"
                  >
                    <Link
                      href={`/creditos/${c.id}`}
                      className="absolute inset-0 z-0 rounded-none"
                      aria-label={`Crédito #${c.public_ref}, ver detalle`}
                    />
                    <div className="pointer-events-none relative z-[1] font-mono text-[13px] font-medium text-slate-800 dark:text-slate-100">
                      #{c.public_ref}
                    </div>
                    <div className="pointer-events-none relative z-[1] text-[13px] font-medium text-slate-700 dark:text-slate-200">
                      {c.sale_id ? (
                        <Link
                          href={`/ventas/${c.sale_id}`}
                          className="pointer-events-auto relative z-[2] inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[13px] font-semibold tabular-nums text-[color:var(--shell-sidebar)] underline-offset-2 hover:bg-[color:var(--shell-sidebar)]/12 hover:underline dark:text-zinc-300 dark:hover:bg-zinc-600/40"
                          title="Ver detalle de la venta"
                          aria-label={`Ver venta ${ventaLinkLabel(c.sales?.invoice_number)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MdReceiptLong className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                          {ventaLinkLabel(c.sales?.invoice_number)}
                        </Link>
                      ) : (
                        <span>{inv}</span>
                      )}
                    </div>
                    <div className="pointer-events-none relative z-[1] text-right text-[13px] font-medium tabular-nums">
                      $ {formatMoney(Number(c.total_amount))}
                    </div>
                    <div className="pointer-events-none relative z-[1] text-right text-[13px] font-medium tabular-nums">
                      $ {formatMoney(Number(c.amount_paid))}
                    </div>
                    <div className="pointer-events-none relative z-[1] text-right text-[13px] font-medium tabular-nums">
                      $ {formatMoney(pend)}
                    </div>
                    <div className="pointer-events-none relative z-[1]">
                      <span className={chip.className}>{chip.label}</span>
                    </div>
                    <div className="pointer-events-none relative z-[1] text-[13px] font-medium text-slate-600 dark:text-slate-300">
                      {formatDateShort(c.due_date)}
                    </div>
                    <div className="pointer-events-none relative z-10 flex items-center justify-end gap-0.5">
                      {pend > 0.005 && !c.cancelled_at && (
                        <button
                          type="button"
                          onClick={() => router.push(`/creditos/${c.id}?abonar=1`)}
                          className={`${actionIconClass} pointer-events-auto`}
                          title="Registrar abono"
                          aria-label="Registrar abono"
                        >
                          <span className="text-[13px] font-bold">$</span>
                        </button>
                      )}
                      <span className={`${actionIconClass} pointer-events-none`} aria-hidden="true">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-3 xl:hidden">
              {credits.map((c) => {
                const pend = creditRowPending(Number(c.total_amount), Number(c.amount_paid), Boolean(c.cancelled_at));
                const disp = creditLineDisplayStatus(c.status, Number(c.total_amount), Number(c.amount_paid), c.cancelled_at);
                const chip = creditStatusChip(disp);
                return (
                  <div key={c.id} className="relative rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
                    <Link
                      href={`/creditos/${c.id}`}
                      className="absolute inset-0 z-0 rounded-2xl"
                      aria-label={`Crédito #${c.public_ref}, ver detalle`}
                    />
                    <div className="pointer-events-none relative z-[1] flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[14px] font-semibold text-slate-900 dark:text-slate-50">#{c.public_ref}</p>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                          {c.sale_id ? (
                            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span className="text-slate-500 dark:text-slate-400">Venta</span>
                              <Link
                                href={`/ventas/${c.sale_id}`}
                                className="pointer-events-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[12px] font-semibold tabular-nums text-[color:var(--shell-sidebar)] underline-offset-2 hover:bg-[color:var(--shell-sidebar)]/12 hover:underline dark:text-zinc-300 dark:hover:bg-zinc-600/40"
                                title="Ver detalle de la venta"
                                aria-label={`Ver venta ${ventaLinkLabel(c.sales?.invoice_number)}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MdReceiptLong className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                                {ventaLinkLabel(c.sales?.invoice_number)}
                              </Link>
                            </span>
                          ) : (
                            "Sin venta vinculada"
                          )}
                        </p>
                      </div>
                      <span className={chip.className}>{chip.label}</span>
                    </div>
                    <div className="pointer-events-none relative z-[1] mt-3 grid grid-cols-2 gap-2 text-[13px]">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Total</span>{" "}
                        <span className="font-medium tabular-nums">$ {formatMoney(Number(c.total_amount))}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 dark:text-slate-400">Pendiente</span>{" "}
                        <span className="font-medium tabular-nums">$ {formatMoney(pend)}</span>
                      </div>
                    </div>
                    {pend > 0.005 && !c.cancelled_at ? (
                      <div className="relative z-10 mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-zinc-800">
                        <Link
                          href={`/creditos/${c.id}?abonar=1`}
                          className="pointer-events-auto text-[13px] font-medium text-[color:var(--shell-sidebar)] dark:text-zinc-300"
                        >
                          Abonar
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
