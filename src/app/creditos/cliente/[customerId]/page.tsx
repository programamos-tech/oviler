"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";
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

const REPORTS_SURFACE = "berea-reports-surface";

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

function ventaLinkLabel(invoiceNumber: string | undefined | null): string {
  const raw = String(invoiceNumber ?? "").trim();
  if (!raw || raw === "—") return "—";
  return raw.startsWith("#") ? raw : `#${raw}`;
}

const actionIconClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] hover:text-[var(--berea-ink)]";

export default function CreditosClientePage() {
  const params = useParams();
  const customerId = String(params.customerId ?? "");
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBranchEpoch, setActiveBranchEpoch] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBranch = () => setActiveBranchEpoch((n) => n + 1);
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
  }, []);

  useEffect(() => {
    if (!customerId) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const currentBranch = await resolveActiveBranchId(supabase, user.id);
      if (!currentBranch) {
        setError("Sin sucursal asignada.");
        setLoading(false);
        return;
      }
      const [custRes, crRes] = await Promise.all([
        supabase.from("customers").select("id, name").eq("id", customerId).eq("branch_id", currentBranch).maybeSingle(),
        supabase
          .from("customer_credits")
          .select("id, public_ref, total_amount, amount_paid, due_date, status, cancelled_at, sale_id, sales(invoice_number)")
          .eq("branch_id", currentBranch)
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (custRes.error || !custRes.data) {
        setError("Cliente no encontrado en esta sucursal.");
        setCustomer(null);
        setCredits([]);
        setLoading(false);
        return;
      }
      setCustomer(custRes.data as CustomerRow);
      if (crRes.error) setError(crRes.error.message);
      setCredits((crRes.data ?? []) as unknown as CreditRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, activeBranchEpoch]);

  const totalCred = credits.reduce((s, c) => s + Number(c.total_amount), 0);
  const totalPag = credits.reduce((s, c) => s + Number(c.amount_paid), 0);
  const totalPend = credits.reduce(
    (s, c) => s + creditRowPending(Number(c.total_amount), Number(c.amount_paid), Boolean(c.cancelled_at)),
    0
  );

  return (
    <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 text-[15px] text-[var(--berea-ink)] sm:space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {customer ? (
            <Link
              href={`/clientes/${customer.id}`}
              className="group flex min-w-0 items-center gap-3 rounded-xl outline-none transition-colors hover:bg-[var(--shell-workspace)]/60 focus-visible:ring-2 focus-visible:ring-[color:var(--shell-sidebar)]"
              title="Ver ficha del cliente"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--shell-workspace)] ring-1 ring-[var(--berea-card-border)]">
                <WorkspaceCharacterAvatar
                  seed={`${customer.id}-${getAvatarVariant(null)}`}
                  size={96}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">
                  Créditos / Cliente
                </p>
                <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem] group-hover:text-[color:var(--shell-sidebar)]">
                  {customer.name}
                </h1>
                <p className="mt-0.5 text-[14px] text-[var(--berea-ink-muted)]">Créditos de este cliente en la sucursal</p>
              </div>
            </Link>
          ) : (
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">Cliente</h1>
              <p className="mt-0.5 text-[14px] text-[var(--berea-ink-muted)]">Créditos en la sucursal</p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/creditos"
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold text-[var(--berea-ink)] hover:bg-[var(--shell-workspace)] ${REPORTS_SURFACE}`}
          >
            ← Créditos
          </Link>
          <Link
            href={`/creditos/nuevo?cliente=${customerId}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
          >
            + Nuevo crédito
          </Link>
        </div>
      </header>

      {!loading && customer && (
        <div className={`grid grid-cols-1 gap-4 rounded-xl p-5 sm:grid-cols-3 sm:p-6 ${REPORTS_SURFACE}`}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Total créditos</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--berea-ink)]">$ {formatMoney(totalCred)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Total pagado</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--berea-ink)]">$ {formatMoney(totalPag)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Total pendiente</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--berea-ink)]">$ {formatMoney(totalPend)}</p>
          </div>
        </div>
      )}

      {error && (
        <div className={`rounded-xl px-6 py-4 text-[14px] font-medium text-amber-900 ${REPORTS_SURFACE}`}>{error}</div>
      )}

      <section className={`space-y-4 rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Créditos del cliente</h2>
        {loading ? (
          <div className="min-h-[200px] animate-pulse rounded-xl bg-[var(--shell-workspace)]/50" />
        ) : credits.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-[var(--berea-ink-muted)]">Este cliente no tiene créditos en esta sucursal.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[920px] border-collapse text-left text-[14px] leading-relaxed">
                <thead>
                  <tr className="border-b border-[var(--berea-card-border)] text-[13px] text-[var(--berea-ink-muted)]">
                    <th className="pb-3 pr-4 font-semibold">ID</th>
                    <th className="pb-3 pr-4 font-semibold">Venta</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Total</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Pagado</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Pendiente</th>
                    <th className="pb-3 pr-4 font-semibold">Estado</th>
                    <th className="pb-3 pr-4 font-semibold">Vencimiento</th>
                    <th className="pb-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.map((c) => {
                    const pend = creditRowPending(Number(c.total_amount), Number(c.amount_paid), Boolean(c.cancelled_at));
                    const disp = creditLineDisplayStatus(c.status, Number(c.total_amount), Number(c.amount_paid), c.cancelled_at);
                    const chip = creditStatusChip(disp);
                    return (
                      <tr
                        key={c.id}
                        role="link"
                        tabIndex={0}
                        className="cursor-pointer border-b border-[var(--berea-card-border)]/60 transition-colors last:border-b-0 hover:bg-[var(--shell-workspace)]/70"
                        onClick={() => router.push(`/creditos/${c.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/creditos/${c.id}`);
                          }
                        }}
                      >
                        <td className="py-3.5 pr-4 font-mono font-medium text-[var(--berea-ink)]">#{c.public_ref}</td>
                        <td className="py-3.5 pr-4">
                          {c.sale_id ? (
                            <Link
                              href={`/ventas/${c.sale_id}`}
                              className="inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[13px] font-semibold tabular-nums text-[color:var(--shell-sidebar)] underline-offset-2 hover:underline"
                              title="Ver detalle de la venta"
                              aria-label={`Ver venta ${ventaLinkLabel(c.sales?.invoice_number)}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MdReceiptLong className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                              {ventaLinkLabel(c.sales?.invoice_number)}
                            </Link>
                          ) : (
                            <span className="text-[var(--berea-ink-muted)]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-right tabular-nums">$ {formatMoney(Number(c.total_amount))}</td>
                        <td className="py-3.5 pr-4 text-right tabular-nums">$ {formatMoney(Number(c.amount_paid))}</td>
                        <td className="py-3.5 pr-4 text-right tabular-nums font-medium">$ {formatMoney(pend)}</td>
                        <td className="py-3.5 pr-4">
                          <span className={chip.className}>{chip.label}</span>
                        </td>
                        <td className="py-3.5 pr-4 text-[var(--berea-ink-muted)]">{formatDateShort(c.due_date)}</td>
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {pend > 0.005 && !c.cancelled_at && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/creditos/${c.id}?abonar=1`);
                                }}
                                className={actionIconClass}
                                title="Registrar abono"
                                aria-label="Registrar abono"
                              >
                                <span className="text-[13px] font-bold">$</span>
                              </button>
                            )}
                            <span className={actionIconClass} aria-hidden="true">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 xl:hidden">
              {credits.map((c) => {
                const pend = creditRowPending(Number(c.total_amount), Number(c.amount_paid), Boolean(c.cancelled_at));
                const disp = creditLineDisplayStatus(c.status, Number(c.total_amount), Number(c.amount_paid), c.cancelled_at);
                const chip = creditStatusChip(disp);
                return (
                  <div key={c.id} className={`rounded-xl p-4 ${REPORTS_SURFACE}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[15px] font-semibold text-[var(--berea-ink)]">#{c.public_ref}</p>
                        <p className="mt-0.5 text-[13px] text-[var(--berea-ink-muted)]">
                          {c.sale_id ? (
                            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span>Venta</span>
                              <Link
                                href={`/ventas/${c.sale_id}`}
                                className="inline-flex items-center gap-1 font-mono text-[13px] font-semibold tabular-nums text-[color:var(--shell-sidebar)] underline-offset-2 hover:underline"
                                title="Ver detalle de la venta"
                                aria-label={`Ver venta ${ventaLinkLabel(c.sales?.invoice_number)}`}
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
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[14px]">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Total</span>
                        <p className="mt-0.5 font-medium tabular-nums">$ {formatMoney(Number(c.total_amount))}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Pendiente</span>
                        <p className="mt-0.5 font-medium tabular-nums">$ {formatMoney(pend)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--berea-card-border)] pt-3">
                      <span className="text-[13px] text-[var(--berea-ink-muted)]">Vence {formatDateShort(c.due_date)}</span>
                      <div className="flex items-center gap-2">
                        {pend > 0.005 && !c.cancelled_at && (
                          <Link
                            href={`/creditos/${c.id}?abonar=1`}
                            className="text-[13px] font-semibold text-[color:var(--shell-sidebar)]"
                          >
                            Abonar
                          </Link>
                        )}
                        <Link href={`/creditos/${c.id}`} className="text-[13px] font-semibold text-[var(--berea-ink)]">
                          Ver detalle
                        </Link>
                      </div>
                    </div>
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
