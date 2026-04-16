"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadOrgPlanSnapshot, type OrgPlanSnapshot } from "@/lib/org-plan-snapshot";
import { PlanLimitHeaderNote, PLAN_LIMIT_DISABLED_BUTTON_CLASS } from "@/app/components/PlanLimitNotice";
import { setActiveBranchId } from "@/lib/active-branch";

type Branch = {
  id: string;
  name: string;
  nit: string | null;
  address: string | null;
  phone: string | null;
  responsable_iva: boolean;
  logo_url: string | null;
};

const primaryCtaClass =
  "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:w-auto";

function BranchLogo({ logoUrl, branchName }: { logoUrl: string | null; branchName: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = logoUrl && !failed;
  const initial = branchName.trim().slice(0, 1).toUpperCase() || "S";
  return (
    <div className="relative shrink-0">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xl font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        {showImg ? (
          <img
            src={logoUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        ) : (
          initial
        )}
      </div>
      <span
        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[color:var(--shell-sidebar)] dark:border-slate-900 dark:bg-zinc-300"
        title="Sucursal activa"
      />
    </div>
  );
}

export default function SucursalesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [licenseLine, setLicenseLine] = useState<string | null>(null);
  const [planSnapshot, setPlanSnapshot] = useState<OrgPlanSnapshot | null>(null);
  const [openingBranchId, setOpeningBranchId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if (!userData?.organization_id || cancelled) {
        setLoading(false);
        return;
      }
      const orgId = userData.organization_id;

      // Cargar primero lo crítico para pintar la lista rápido.
      const { data: rows, error } = await supabase
        .from("branches")
        .select("id, name, nit, address, phone, responsable_iva, logo_url")
        .eq("organization_id", orgId)
        .order("name");
      if (cancelled) return;
      if (!error && rows) {
        setBranches(rows as Branch[]);
      }
      setLoading(false);

      // Cargas secundarias en paralelo (no bloquean el render inicial).
      void (async () => {
        try {
          const [snap, licRes] = await Promise.all([
            loadOrgPlanSnapshot(supabase, orgId),
            fetch("/api/auth/license-status", { credentials: "include" }),
          ]);
          if (cancelled) return;
          setPlanSnapshot(snap);
          const licJson = (await licRes.json().catch(() => ({}))) as {
            license_period_end?: string | null;
            organization?: { subscription_status?: string | null; trial_ends_at?: string | null } | null;
          };
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
        } catch {
          if (!cancelled) setLicenseLine(null);
        }
      })();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openBranchDashboard(branchId: string) {
    if (openingBranchId) return;
    setOpeningBranchId(branchId);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_branches").upsert({ user_id: user.id, branch_id: branchId }, { onConflict: "user_id,branch_id" });
      setActiveBranchId(branchId);
      router.push(`/sucursales/reportes?branchId=${branchId}`);
    } finally {
      setOpeningBranchId(null);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Sucursales
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Cada sucursal tiene sus propios datos, numeración de ventas y configuración.
            </p>
            {licenseLine ? (
              <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-500">
                {licenseLine}
              </p>
            ) : null}
          </div>
          <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
            {planSnapshot && !planSnapshot.canCreateBranch ? (
              <span
                className={`${PLAN_LIMIT_DISABLED_BUTTON_CLASS} w-full sm:w-auto`}
                title="Límite de sucursales alcanzado"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva sucursal
              </span>
            ) : (
              <Link href="/sucursales/nueva" className={`${primaryCtaClass} w-full justify-center sm:w-auto`}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva sucursal
              </Link>
            )}
            {planSnapshot && !planSnapshot.canCreateBranch ? (
              <PlanLimitHeaderNote kind="branches" planId={planSnapshot.planId} className="sm:justify-end" />
            ) : null}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="min-h-[280px] animate-pulse rounded-3xl bg-white dark:bg-slate-900" aria-hidden />
      ) : branches.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-10 text-center dark:bg-slate-900">
          <p className="text-[15px] font-medium text-slate-600 dark:text-slate-300">Aún no hay sucursales</p>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
            Crea tu primera sucursal desde el onboarding o con el botón &quot;Nueva sucursal&quot;.
          </p>
          <div className="mt-4 flex justify-center">
            {planSnapshot && !planSnapshot.canCreateBranch ? (
              <span className={`${PLAN_LIMIT_DISABLED_BUTTON_CLASS} w-full max-w-xs justify-center sm:w-auto`}>
                Nueva sucursal
              </span>
            ) : (
              <Link href="/sucursales/nueva" className={`${primaryCtaClass} justify-center`}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva sucursal
              </Link>
            )}
          </div>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {branches.map((suc) => {
              const descParts = [suc.address?.trim(), suc.phone?.trim()].filter(Boolean);
              const description =
                descParts.length > 0 ? descParts.join(" · ") : "Sin dirección ni teléfono registrados.";
              return (
                <div
                  key={suc.id}
                  className="cursor-pointer rounded-3xl bg-white px-5 py-4 transition-colors hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-900/80"
                  onClick={() => void openBranchDashboard(suc.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void openBranchDashboard(suc.id);
                    }
                  }}
                  aria-label={`Entrar a ${suc.name}`}
                >
                  <div className="flex gap-3">
                    <BranchLogo logoUrl={suc.logo_url} branchName={suc.name} />
                    <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
                      <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-50">
                        {suc.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500 dark:text-slate-400">
                        NIT {suc.nit ?? "—"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[12px] text-slate-500 dark:text-slate-400">
                        {description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-300/90 bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--shell-sidebar)] dark:border-zinc-600/40 dark:bg-zinc-800/55 dark:text-zinc-300">
                          Sucursal
                        </span>
                        {suc.responsable_iva ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/45 dark:bg-emerald-950/25 dark:text-emerald-300">
                            IVA
                          </span>
                        ) : null}
                        <Link
                          href={`/sucursales/configurar?branchId=${suc.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          Configurar
                        </Link>
                        {openingBranchId === suc.id ? (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Abriendo...</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
