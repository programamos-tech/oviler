"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addCreditPaymentSplits, cashTransferFromLine, type CreditPaymentSplitRow } from "@/lib/cash-transfer-from-line";

type Branch = {
  id: string;
  name: string;
  nit: string | null;
  address: string | null;
  phone: string | null;
  responsable_iva: boolean;
  logo_url: string | null;
};

type BranchMoney = {
  cash: number;
  transfer: number;
  total: number;
};

function getDayBounds(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

const BTN_BRAND =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:w-auto";

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function BranchLogo({ logoUrl, branchName }: { logoUrl: string | null; branchName: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = logoUrl && !failed;
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-300/50 bg-white/45 text-lg font-bold text-zinc-600 shadow-sm ring-2 ring-[color:var(--shell-sidebar)]/25 backdrop-blur-md dark:border-white/12 dark:bg-black/35 dark:text-zinc-200 dark:ring-[color:var(--shell-sidebar)]/35 dark:backdrop-blur-md">
      {showImg ? (
        <img
          src={logoUrl}
          alt={`Logo ${branchName}`}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        "S"
      )}
    </div>
  );
}

export default function SucursalesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMoney, setBranchMoney] = useState<Record<string, BranchMoney>>({});
  const [loading, setLoading] = useState(true);
  const [licenseLine, setLicenseLine] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      try {
        const licRes = await fetch("/api/auth/license-status", { credentials: "include" });
        const licJson = (await licRes.json().catch(() => ({}))) as {
          license_period_end?: string | null;
          organization?: { subscription_status?: string | null; trial_ends_at?: string | null } | null;
        };
        if (!cancelled) {
          const status = licJson.organization?.subscription_status ?? null;
          const periodEnd = licJson.license_period_end ?? null;
          const trialEnd = licJson.organization?.trial_ends_at ?? null;
          if (status === "active" && periodEnd) {
            setLicenseLine(
              `Licencia activa hasta ${new Date(periodEnd).toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}`
            );
          } else if (status === "trial" && trialEnd) {
            setLicenseLine(
              `Prueba gratis activa hasta ${new Date(trialEnd).toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}`
            );
          } else if (status === "suspended") {
            setLicenseLine("Licencia suspendida");
          } else if (status === "cancelled") {
            setLicenseLine("Licencia cancelada");
          } else {
            setLicenseLine(null);
          }
        }
      } catch {
        if (!cancelled) setLicenseLine(null);
      }
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if (!userData?.organization_id || cancelled) {
        setLoading(false);
        return;
      }
      const { data: rows, error } = await supabase
        .from("branches")
        .select("id, name, nit, address, phone, responsable_iva, logo_url")
        .eq("organization_id", userData.organization_id)
        .order("name");
      if (cancelled) return;
      if (!error && rows) {
        const branchRows = rows as Branch[];
        setBranches(branchRows);

        const branchIds = branchRows.map((b) => b.id);
        const emptyMoney = (): BranchMoney => ({ cash: 0, transfer: 0, total: 0 });
        const moneyMap: Record<string, BranchMoney> = Object.fromEntries(branchIds.map((id) => [id, emptyMoney()]));

        if (branchIds.length > 0) {
          const { start, end } = getDayBounds(new Date());
          const { data: salesRows } = await supabase
            .from("sales")
            .select("branch_id, status, total, payment_method, amount_cash, amount_transfer, delivery_fee, payment_pending")
            .in("branch_id", branchIds)
            .eq("status", "completed")
            .gte("created_at", start)
            .lte("created_at", end);
          if (!cancelled && salesRows) {
            for (const s of salesRows as Array<{
              branch_id: string;
              total: number;
              payment_method: string;
              amount_cash: number | null;
              amount_transfer: number | null;
              delivery_fee: number | null;
              payment_pending?: boolean | null;
            }>) {
              if (s.payment_pending) continue;
              const m = moneyMap[s.branch_id];
              if (!m) continue;
              const inc = cashTransferFromLine(
                Number(s.total),
                Number(s.delivery_fee) || 0,
                s.payment_method,
                s.amount_cash,
                s.amount_transfer
              );
              m.cash += inc.cash;
              m.transfer += inc.transfer;
            }
          }

          const { data: payRows } = await supabase
            .from("credit_payments")
            .select(
              "amount, payment_method, amount_cash, amount_transfer, payment_source, customer_credits!inner(branch_id)"
            )
            .in("customer_credits.branch_id", branchIds)
            .gte("created_at", start)
            .lte("created_at", end);
          if (!cancelled && payRows) {
            const byBranch = new Map<string, CreditPaymentSplitRow[]>();
            for (const p of payRows as Array<
              CreditPaymentSplitRow & { customer_credits: { branch_id: string } | { branch_id: string }[] }
            >) {
              const c = p.customer_credits;
              const row = Array.isArray(c) ? c[0] : c;
              const bid = row?.branch_id;
              if (!bid) continue;
              const { amount, payment_method, amount_cash, amount_transfer, payment_source } = p;
              const list = byBranch.get(bid) ?? [];
              list.push({ amount, payment_method, amount_cash, amount_transfer, payment_source });
              byBranch.set(bid, list);
            }
            for (const bid of branchIds) {
              const m = moneyMap[bid];
              const list = byBranch.get(bid);
              if (list?.length) {
                const r = addCreditPaymentSplits(list, m.cash, m.transfer);
                m.cash = r.cash;
                m.transfer = r.transfer;
              }
              m.total = m.cash + m.transfer;
            }
          } else if (!cancelled) {
            for (const bid of branchIds) {
              const m = moneyMap[bid];
              m.total = m.cash + m.transfer;
            }
          }
        }
        if (!cancelled) setBranchMoney(moneyMap);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Sucursales
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-zinc-600 dark:text-zinc-400">
              Cada sucursal tiene sus propios datos, numeración de ventas y configuración.
            </p>
            {licenseLine ? (
              <p className="mt-1 text-[12px] font-semibold text-[color:var(--shell-sidebar)] dark:text-[color:var(--shell-sidebar-accent)]">
                {licenseLine}
              </p>
            ) : null}
          </div>
          <Link href="/sucursales/nueva" className={`${BTN_BRAND} w-full`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva sucursal
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="text-[14px] text-zinc-600 dark:text-zinc-400">Cargando sucursales…</p>
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-zinc-300/60 bg-white/55 p-8 text-center shadow-sm backdrop-blur-md dark:border-white/12 dark:bg-black/40 dark:backdrop-blur-xl">
          <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-300">Aún no hay sucursales</p>
          <p className="mt-1 text-[13px] text-zinc-600 dark:text-zinc-400">
            Crea tu primera sucursal desde el onboarding o con el botón &quot;Nueva sucursal&quot;.
          </p>
          <Link href="/sucursales/nueva" className={`${BTN_BRAND} mt-4`}>
            Nueva sucursal
          </Link>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((suc) => {
            const m = branchMoney[suc.id] ?? { cash: 0, transfer: 0, total: 0 };
            return (
              <Link
                key={suc.id}
                href={`/sucursales/configurar?branchId=${suc.id}`}
                className="group relative overflow-hidden rounded-2xl border border-zinc-300/60 bg-white/52 p-4 shadow-sm backdrop-blur-md backdrop-saturate-150 transition-all hover:-translate-y-0.5 hover:border-[color:var(--shell-sidebar)]/30 hover:shadow-md dark:border-white/12 dark:bg-black/42 dark:backdrop-blur-xl dark:hover:border-[color:var(--shell-sidebar-accent)]/35"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[color:var(--shell-sidebar)] via-[color:var(--shell-sidebar)]/80 to-transparent opacity-90" />
                <div className="flex flex-row items-start gap-4">
                  <div className="shrink-0">
                    <BranchLogo logoUrl={suc.logo_url} branchName={suc.name} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50">{suc.name}</p>
                      <span className="inline-flex items-center rounded-full bg-[color:var(--shell-sidebar)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--shell-sidebar)] dark:bg-zinc-700/45 dark:text-zinc-300">
                        Sucursal
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] font-medium text-zinc-600 dark:text-zinc-400">
                      NIT {suc.nit ?? "—"}
                    </p>
                    <p className="mt-1 text-[12px] text-zinc-700 dark:text-zinc-300">
                      {suc.address ?? "Dirección sin registrar"}
                    </p>
                    <p className="mt-0.5 text-[12px] text-zinc-600 dark:text-zinc-400">
                      {suc.phone ?? "Teléfono sin registrar"}
                    </p>
                    {suc.responsable_iva && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                        Responsable de IVA
                      </span>
                    )}

                    <div className="mt-4 w-full max-w-full rounded-xl border border-zinc-300/55 bg-white/40 px-3 py-3 text-left shadow-inner backdrop-blur-md dark:border-white/12 dark:bg-black/35 dark:backdrop-blur-lg">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                        Ingreso de hoy
                      </p>
                      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                        {formatMoney(m.total)}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-300/45 pt-3 dark:border-white/12">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                            Efectivo
                          </p>
                          <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                            {formatMoney(m.cash)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                            Transferencia
                          </p>
                          <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                            {formatMoney(m.transfer)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
