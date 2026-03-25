"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Branch = {
  id: string;
  name: string;
  nit: string | null;
  address: string | null;
  phone: string | null;
  responsable_iva: boolean;
  logo_url: string | null;
};

type BranchStats = {
  totalSales: number;
  completedSales: number;
  cancelledSales: number;
  lastSaleAt: string | null;
};

function BranchLogo({ logoUrl, branchName }: { logoUrl: string | null; branchName: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = logoUrl && !failed;
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-bold text-slate-500 ring-2 ring-ov-pink/35 dark:bg-slate-800 dark:text-slate-400 dark:ring-ov-pink/35">
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
  const [branchStats, setBranchStats] = useState<Record<string, BranchStats>>({});
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
        if (branchIds.length > 0) {
          const { data: salesRows } = await supabase
            .from("sales")
            .select("branch_id, status, created_at")
            .in("branch_id", branchIds);
          if (!cancelled && salesRows) {
            const statsMap: Record<string, BranchStats> = Object.fromEntries(
              branchIds.map((id) => [
                id,
                { totalSales: 0, completedSales: 0, cancelledSales: 0, lastSaleAt: null },
              ])
            );
            for (const sale of salesRows as Array<{ branch_id: string; status: string; created_at: string }>) {
              const stat = statsMap[sale.branch_id];
              if (!stat) continue;
              stat.totalSales += 1;
              if (sale.status === "completed" || sale.status === "delivered") stat.completedSales += 1;
              if (sale.status === "cancelled") stat.cancelledSales += 1;
              if (!stat.lastSaleAt || new Date(sale.created_at).getTime() > new Date(stat.lastSaleAt).getTime()) {
                stat.lastSaleAt = sale.created_at;
              }
            }
            setBranchStats(statsMap);
          }
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Sucursales
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Cada sucursal tiene sus propios datos, numeración de ventas y configuración.
            </p>
            {licenseLine ? (
              <p className="mt-1 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">{licenseLine}</p>
            ) : null}
          </div>
          <Link
            href="/sucursales/nueva"
            className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover sm:w-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva sucursal
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="text-[14px] text-slate-500 dark:text-slate-400">Cargando sucursales…</p>
      ) : branches.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[15px] font-medium text-slate-600 dark:text-slate-300">Aún no hay sucursales</p>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
            Crea tu primera sucursal desde el onboarding o con el botón &quot;Nueva sucursal&quot;.
          </p>
          <Link
            href="/sucursales/nueva"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white hover:bg-ov-pink-hover"
          >
            Nueva sucursal
          </Link>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((suc) => (
            <Link
              key={suc.id}
              href={`/sucursales/configurar?branchId=${suc.id}`}
              className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-ov-pink/35 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-ov-pink/35"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-ov-pink/90 via-ov-pink to-transparent opacity-80" />
              <div className="flex flex-col items-start gap-3">
                <BranchLogo logoUrl={suc.logo_url} branchName={suc.name} />
                <div className="min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                      {suc.name}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-ov-pink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ov-pink">
                      Sucursal
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    NIT {suc.nit ?? "—"}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                    {suc.address ?? "Dirección sin registrar"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                    {suc.phone ?? "Teléfono sin registrar"}
                  </p>
                  {suc.responsable_iva && (
                    <span className="mt-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                      Responsable de IVA
                    </span>
                  )}
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Ventas totales</p>
                      <p className="mt-1 text-[15px] font-bold text-slate-900 dark:text-slate-100">
                        {branchStats[suc.id]?.totalSales ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Finalizadas</p>
                      <p className="mt-1 text-[15px] font-bold text-slate-900 dark:text-slate-100">
                        {branchStats[suc.id]?.completedSales ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Anuladas</p>
                      <p className="mt-1 text-[15px] font-bold text-slate-900 dark:text-slate-100">
                        {branchStats[suc.id]?.cancelledSales ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Última venta</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                        {branchStats[suc.id]?.lastSaleAt
                          ? new Date(branchStats[suc.id].lastSaleAt as string).toLocaleDateString("es-CO")
                          : "Sin ventas"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
