"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MdDomain,
  MdSchedule,
  MdPerson,
  MdBusiness,
  MdStore,
  MdWarning,
  MdPayments,
  MdWorkspacePremium,
} from "react-icons/md";
import Breadcrumb from "@/app/components/Breadcrumb";
import { formatLastSeenLabel, isUserOnline, ONLINE_WINDOW_MS } from "@/lib/presence";
import DatePickerCard from "@/app/components/DatePickerCard";
import {
  billingStatusClass,
  billingStatusLabel,
  dateInputLocalToIso,
  dateToYmdLocal,
  isoToDateInputLocal,
  licensePeriodEndIso,
  parseYmdLocal,
} from "@/lib/internal-billing";
import { PLAN_CATALOG, normalizePlanType, planPriceLabel, type PlanId } from "@/lib/plan-catalog";
import { licenseClass, licenseLabel } from "@/lib/subscription-status";

type OrgDetail = {
  id: string;
  name: string;
  plan_type: string;
  subscription_status: string | null;
  created_at: string;
  updated_at: string | null;
  max_branches: number;
  max_users: number;
  max_products: number;
  trial_ends_at: string | null;
  user_count: number;
  branch_count: number;
  product_count: number;
  customer_count: number;
  sale_count: number;
  expense_count: number;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string | null;
  created_at: string;
  last_seen_at: string | null;
};

type BranchRow = {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
};

type BillingFormState = {
  startDate: string;
  months: number;
  status: "paid" | "pending" | "overdue";
  notes: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

const PLAN_CLASS: Record<string, string> = {
  free: "font-semibold text-sky-600 dark:text-sky-400",
  basic: "font-semibold text-slate-800 dark:text-slate-100",
  pro: "font-semibold text-violet-600 dark:text-violet-400",
};

function planLabel(p: string) {
  return PLAN_CATALOG[normalizePlanType(p)].label;
}

export default function InternoClienteDetailPage() {
  const params = useParams();
  const orgId = typeof params.orgId === "string" ? params.orgId : "";

  const [organization, setOrganization] = useState<OrgDetail | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patching, setPatching] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [billingForm, setBillingForm] = useState<BillingFormState>({
    startDate: "",
    months: 12,
    status: "pending",
    notes: "",
  });
  const [planDraft, setPlanDraft] = useState<PlanId>("basic");
  const [planTrialEnd, setPlanTrialEnd] = useState<Date | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  /** Tras guardar, el formulario se pliega y se muestra resumen + Editar */
  const [membershipEditing, setMembershipEditing] = useState(true);
  const [billingEditing, setBillingEditing] = useState(true);
  const [toastPlan, setToastPlan] = useState<string | null>(null);
  const [toastBilling, setToastBilling] = useState<string | null>(null);
  /** Texto plano devuelto una sola vez al guardar cobro (clave para el cliente). */
  const [billingUnlockCode, setBillingUnlockCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/internal/organizations/${orgId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        setOrganization(null);
        return;
      }
      const org = json.organization as OrgDetail;
      setOrganization(org);
      setPlanDraft(normalizePlanType(org.plan_type));
      setPlanTrialEnd(org.trial_ends_at ? new Date(org.trial_ends_at) : null);
      setUsers(json.users ?? []);
      setBranches(json.branches ?? []);
      const b = json.billing as
        | {
            license_period_start: string | null;
            license_period_months: number;
            billing_status: string;
            notes: string | null;
          }
        | undefined;
      if (b) {
        setBillingForm({
          startDate: isoToDateInputLocal(b.license_period_start),
          months: b.license_period_months ?? 12,
          status:
            b.billing_status === "paid" || b.billing_status === "overdue" ? b.billing_status : "pending",
          notes: b.notes ?? "",
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toastPlan) return;
    const t = window.setTimeout(() => setToastPlan(null), 9000);
    return () => window.clearTimeout(t);
  }, [toastPlan]);

  useEffect(() => {
    if (!toastBilling) return;
    const t = window.setTimeout(() => setToastBilling(null), 9000);
    return () => window.clearTimeout(t);
  }, [toastBilling]);

  const ownerOrFirst = useMemo(() => {
    const owner = users.find((u) => u.role === "owner");
    return owner?.name ?? users[0]?.name ?? "—";
  }, [users]);

  const onlineUserCount = useMemo(
    () => users.filter((u) => isUserOnline(u.last_seen_at)).length,
    [users]
  );

  const billingPeriodEndIso = useMemo(() => {
    const iso = dateInputLocalToIso(billingForm.startDate);
    if (!iso) return null;
    return licensePeriodEndIso(iso, billingForm.months);
  }, [billingForm.startDate, billingForm.months]);

  const periodStartDateValue = useMemo(() => parseYmdLocal(billingForm.startDate), [billingForm.startDate]);

  const patchStatus = async (subscription_status: "trial" | "active" | "suspended" | "cancelled") => {
    if (!orgId || patching) return;
    const messages: Record<string, string> = {
      trial: "¿Marcar la licencia como prueba gratis? (Estado típico antes de activar con clave o plan de pago.)",
      suspended: "¿Suspender la licencia? Los usuarios no podrán usar la app hasta reactivar.",
      active: "¿Marcar la licencia como activa?",
      cancelled: "¿Marcar la suscripción como cancelada? (Acción fuerte; confirma con el cliente.)",
    };
    if (!window.confirm(messages[subscription_status] ?? "¿Continuar?")) return;

    setPatching(true);
    try {
      const res = await fetch(`/api/internal/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscription_status }),
      });
      const json = await res.json();
      if (!res.ok) {
        window.alert(json.error ?? "No se pudo actualizar");
        return;
      }
      if (json.organization) {
        setOrganization((prev) =>
          prev
            ? {
                ...prev,
                subscription_status: json.organization.subscription_status,
                updated_at: json.organization.updated_at ?? prev.updated_at,
              }
            : null
        );
      }
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error");
    } finally {
      setPatching(false);
    }
  };

  const saveBilling = async () => {
    if (!orgId || savingBilling) return;
    setSavingBilling(true);
    try {
      const license_period_start = dateInputLocalToIso(billingForm.startDate);
      const res = await fetch(`/api/internal/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          billing: {
            license_period_start,
            license_period_months: billingForm.months,
            billing_status: billingForm.status,
            notes: billingForm.notes.trim() || null,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        window.alert(json.error ?? "No se pudo guardar");
        return;
      }
      if (json.billing) {
        const b = json.billing as {
          license_period_start: string | null;
          license_period_months: number;
          billing_status: string;
          notes: string | null;
        };
        setBillingForm({
          startDate: isoToDateInputLocal(b.license_period_start),
          months: b.license_period_months ?? 12,
          status:
            b.billing_status === "paid" || b.billing_status === "overdue" ? b.billing_status : "pending",
          notes: b.notes ?? "",
        });
      }
      const startLabel = billingForm.startDate
        ? formatDate(`${billingForm.startDate}T12:00:00`)
        : "sin fecha";
      setToastBilling(
        `Listo: la organización quedó con cobro "${billingStatusLabel(billingForm.status)}" · inicio ${startLabel} · ${billingForm.months} mes(es). Período comercial actualizado.`
      );
      if (typeof json.license_unlock_code === "string" && json.license_unlock_code.length > 0) {
        setBillingUnlockCode(json.license_unlock_code);
      }
      setBillingEditing(false);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSavingBilling(false);
    }
  };

  const savePlan = async () => {
    if (!orgId || savingPlan) return;
    if (
      !window.confirm(
        "Se actualizarán los límites técnicos (referencias, usuarios, sucursales) según el plan elegido. ¿Continuar?"
      )
    ) {
      return;
    }
    setSavingPlan(true);
    try {
      const payload: { plan_type: PlanId; trial_ends_at?: string } = { plan_type: planDraft };
      if (planDraft === "free" && planTrialEnd) {
        payload.trial_ends_at = planTrialEnd.toISOString();
      }
      const res = await fetch(`/api/internal/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        window.alert(json.error ?? "No se pudo guardar el plan");
        return;
      }
      const lim = PLAN_CATALOG[planDraft];
      const refL = lim.maxProducts >= 999999 ? "∞" : String(lim.maxProducts);
      const usrL = lim.maxUsers >= 999999 ? "∞" : String(lim.maxUsers);
      const brL = lim.maxBranches >= 999999 ? "∞" : String(lim.maxBranches);
      setToastPlan(
        `Listo: la organización quedó en plan ${lim.label} (${refL} referencias, ${usrL} usuarios, ${brL} sucursales). Los límites ya aplican en la base.`
      );
      setMembershipEditing(false);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSavingPlan(false);
    }
  };

  if (!orgId) {
    return null;
  }

  if (loading && !organization) {
    return (
      <div className="space-y-4">
        <div className="min-h-[260px]" aria-hidden />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">{error ?? "No encontramos esta organización."}</p>
        <Link href="/interno" className="text-[14px] font-medium text-ov-pink hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const st = organization.subscription_status;
  const normalizedPlan = normalizePlanType(organization.plan_type);
  const planClass = PLAN_CLASS[normalizedPlan] ?? "font-semibold text-slate-800 dark:text-slate-100";
  const maxProd = organization.max_products ?? 999999;
  const refCap = maxProd >= 999999 ? "∞" : String(maxProd);
  const savedCfg = PLAN_CATALOG[normalizedPlan];
  const breadcrumbTitle =
    organization.name.length > 42 ? `${organization.name.slice(0, 40)}…` : organization.name;

  return (
    <div className="min-w-0 space-y-6">
      {/* Card principal: mismo patrón que detalle de venta */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
        <Breadcrumb
          items={[
            { label: "Clientes NOU", href: "/interno" },
            { label: breadcrumbTitle },
          ]}
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <MdDomain className="h-6 w-6 shrink-0 text-ov-pink dark:text-ov-pink-muted" aria-hidden />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                {organization.name}
              </h1>
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-500">ID: {organization.id}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-slate-500 dark:text-slate-400 sm:text-[13px]">
              <span className="inline-flex items-center gap-1">
                <MdSchedule className="h-4 w-4 shrink-0" aria-hidden />
                {formatDate(organization.created_at)} · {formatTime(organization.created_at)}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1">
                <MdPerson className="h-4 w-4 shrink-0" aria-hidden />
                {ownerOrFirst}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1">
                <MdBusiness className="h-4 w-4 shrink-0" aria-hidden />
                {organization.branch_count} sucursal{organization.branch_count === 1 ? "" : "es"} · {organization.user_count}{" "}
                usuario{organization.user_count === 1 ? "" : "s"}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/interno"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Volver a clientes NOU"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:flex-wrap sm:gap-4 sm:gap-y-0">
            <div className="min-w-0 p-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Plan</p>
              <p className={`mt-0.5 text-lg sm:text-xl ${planClass}`}>{planLabel(organization.plan_type)}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{planPriceLabel(normalizedPlan)}</p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Licencia</p>
              <p className={`mt-0.5 text-lg sm:text-xl ${licenseClass(st)}`}>{licenseLabel(st)}</p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ventas</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl tabular-nums">
                {organization.sale_count}
              </p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Referencias · CRM
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl tabular-nums">
                {organization.product_count} / {refCap} · {organization.customer_count}
              </p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Egresos (reg.)</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50 sm:text-xl">
                {organization.expense_count}
              </p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Límites plan</p>
              <p className="mt-0.5 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                {refCap} ref. ·{" "}
                {organization.max_branches >= 999999 ? "∞" : organization.max_branches} suc. ·{" "}
                {organization.max_users >= 999999 ? "∞" : organization.max_users} usu.
              </p>
            </div>
            {normalizedPlan === "free" && organization.trial_ends_at && (
              <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Prueba hasta
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-sky-700 dark:text-sky-300">
                  {new Date(organization.trial_ends_at).toLocaleString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                En línea (~{Math.round(ONLINE_WINDOW_MS / 60000)} min)
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-xl">
                {onlineUserCount}
                <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {" "}
                  / {organization.user_count}
                </span>
              </p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cobro (interno)</p>
              <p className={`mt-0.5 text-lg sm:text-xl ${billingStatusClass(billingForm.status)}`}>
                {billingStatusLabel(billingForm.status)}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[200px] sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Acciones de licencia</p>
            <div className="flex flex-col gap-2">
              {(st === "active" || st === "trial") && (
                <button
                  type="button"
                  disabled={patching}
                  onClick={() => patchStatus("suspended")}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-amber-800 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-amber-200 dark:hover:bg-slate-700"
                >
                  Suspender licencia
                </button>
              )}
              {st === "suspended" && (
                <button
                  type="button"
                  disabled={patching}
                  onClick={() => patchStatus("active")}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Reactivar licencia
                </button>
              )}
              {st !== "cancelled" && (
                <button
                  type="button"
                  disabled={patching}
                  onClick={() => patchStatus("cancelled")}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-300 bg-white px-3 text-[13px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  Marcar cancelada
                </button>
              )}
              {st === "cancelled" && (
                <button
                  type="button"
                  disabled={patching}
                  onClick={() => patchStatus("active")}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-ov-pink px-3 text-[13px] font-medium text-white shadow-sm hover:bg-ov-pink-hover disabled:opacity-50"
                >
                  Reabrir como activa
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-md border border-slate-200/90 bg-slate-50/90 py-2 pl-2 pr-3 dark:border-slate-600/70 dark:bg-slate-800/50">
          <MdWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p className="min-w-0 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">Prueba gratis</span> = cuenta en trial;{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">Activa</span> = ya ingresó la clave, pagó (cobro al
            día) o tiene plan Basic/Pro. Las acciones afectan a todos los usuarios de la organización.
          </p>
        </div>

        <p className="mt-4 text-[12px] text-slate-500 dark:text-slate-400">
          {organization.updated_at
            ? `Última actualización: ${new Date(organization.updated_at).toLocaleString("es-CO")}`
            : null}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
        {/* Membresía */}
        <section className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700/90 dark:bg-[#111118] dark:shadow-none dark:ring-1 dark:ring-white/[0.06]">
          {toastPlan && (
            <div
              role="status"
              className="mb-4 flex gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/[0.12] px-3 py-2.5 text-[13px] text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/35 dark:text-emerald-50"
            >
              <span className="shrink-0 text-base leading-none" aria-hidden>
                ✓
              </span>
              <p className="min-w-0 flex-1 leading-snug">{toastPlan}</p>
              <button
                type="button"
                className="shrink-0 text-[12px] font-medium text-emerald-800 underline underline-offset-2 hover:opacity-80 dark:text-emerald-200"
                onClick={() => setToastPlan(null)}
              >
                Cerrar
              </button>
            </div>
          )}

          {!membershipEditing ? (
            <div className="flex flex-1 flex-col">
              <div className="border-b border-slate-200/90 pb-4 dark:border-slate-700/80">
                <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  <MdWorkspacePremium className="h-4 w-4 shrink-0 text-ov-pink dark:text-ov-pink-muted" aria-hidden />
                  Membresía y límites
                </h2>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Plan guardado en la organización
                </p>
                <p className={`mt-1 text-[18px] font-bold tracking-tight ${planClass}`}>{savedCfg.label}</p>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{planPriceLabel(normalizedPlan)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-900 dark:text-sky-100">
                    {savedCfg.maxProducts >= 999999 ? "Referencias: ∞" : `${savedCfg.maxProducts} ref.`}
                  </span>
                  <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-900 dark:text-sky-100">
                    {savedCfg.maxUsers >= 999999 ? "Usuarios: ∞" : `${savedCfg.maxUsers} usuarios`}
                  </span>
                  <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-900 dark:text-sky-100">
                    {savedCfg.maxBranches >= 999999 ? "Sucursales: ∞" : `${savedCfg.maxBranches} suc.`}
                  </span>
                </div>
                {normalizedPlan === "free" && organization.trial_ends_at && (
                  <p className="mt-3 text-[12px] text-slate-600 dark:text-slate-300">
                    Prueba hasta:{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {new Date(organization.trial_ends_at).toLocaleString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                )}
                <p className="mt-3 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{savedCfg.blurb}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200/90 pt-4 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => {
                    setPlanDraft(normalizePlanType(organization.plan_type));
                    setPlanTrialEnd(organization.trial_ends_at ? new Date(organization.trial_ends_at) : null);
                    setMembershipEditing(true);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Editar membresía
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200/90 pb-4 dark:border-slate-700/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      <MdWorkspacePremium className="h-4 w-4 shrink-0 text-ov-pink dark:text-ov-pink-muted" aria-hidden />
                      Membresía y límites
                    </h2>
                    <p className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {PLAN_CATALOG[planDraft].label}
                      {normalizePlanType(organization.plan_type) !== planDraft && (
                        <span className="ml-2 inline-flex rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                          Sin guardar
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {planPriceLabel(planDraft)} · Los límites se guardan en la base al aplicar.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
                    {PLAN_CATALOG[planDraft].maxProducts >= 999999
                      ? "Referencias: ∞"
                      : `${PLAN_CATALOG[planDraft].maxProducts} ref.`}
                  </span>
                  <span className="rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
                    {PLAN_CATALOG[planDraft].maxUsers >= 999999
                      ? "Usuarios: ∞"
                      : `${PLAN_CATALOG[planDraft].maxUsers} usuarios`}
                  </span>
                  <span className="rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
                    {PLAN_CATALOG[planDraft].maxBranches >= 999999
                      ? "Sucursales: ∞"
                      : `${PLAN_CATALOG[planDraft].maxBranches} suc.`}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
                <span className="font-medium text-slate-600 dark:text-slate-400">Referencia rápida:</span> Prueba — 15 días, 50
                ref., 1 usuario, 1 suc. · Basic — {planPriceLabel("basic")} · Pro — {planPriceLabel("pro")}.
              </p>

              <div className="mt-4 grid flex-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Plan</span>
                  <select
                    value={planDraft}
                    onChange={(e) => setPlanDraft(e.target.value as PlanId)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[13px] font-medium text-slate-900 outline-none transition-colors focus:border-ov-pink/50 focus:ring-2 focus:ring-ov-pink/25 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-100"
                  >
                    <option value="free">Prueba (15 días)</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                  </select>
                </label>
                {planDraft === "free" && (
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Fin de la prueba (opcional)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500">
                      Vacío = 15 días desde hoy al guardar.
                    </p>
                    <DatePickerCard
                      id="interno-plan-trial-end"
                      value={planTrialEnd}
                      onChange={(d) => setPlanTrialEnd(d)}
                      placeholder="dd/mm/aaaa"
                      allowClear
                      size="md"
                      fullWidth
                      aria-label="Fin del período de prueba"
                    />
                  </label>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-900/40">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Vista previa</p>
                <p className="mt-1 text-[12px] leading-snug text-slate-600 dark:text-slate-300">{PLAN_CATALOG[planDraft].blurb}</p>
              </div>

              <div className="mt-4 mt-auto flex flex-wrap items-center gap-3 border-t border-slate-200/90 pt-4 dark:border-slate-700/80">
                <button
                  type="button"
                  disabled={savingPlan}
                  onClick={savePlan}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  {savingPlan ? "Aplicando…" : "Aplicar plan y límites"}
                </button>
                <button
                  type="button"
                  disabled={savingPlan}
                  onClick={() => {
                    setPlanDraft(normalizePlanType(organization.plan_type));
                    setPlanTrialEnd(organization.trial_ends_at ? new Date(organization.trial_ends_at) : null);
                    setMembershipEditing(false);
                  }}
                  className="inline-flex h-10 items-center rounded-xl px-3 text-[13px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </section>

        {/* Cobro */}
        <section className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700/90 dark:bg-[#111118] dark:shadow-none dark:ring-1 dark:ring-white/[0.06]">
          {toastBilling && (
            <div
              role="status"
              className="mb-4 flex gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/[0.12] px-3 py-2.5 text-[13px] text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/35 dark:text-emerald-50"
            >
              <span className="shrink-0 text-base leading-none" aria-hidden>
                ✓
              </span>
              <p className="min-w-0 flex-1 leading-snug">{toastBilling}</p>
              <button
                type="button"
                className="shrink-0 text-[12px] font-medium text-emerald-800 underline underline-offset-2 hover:opacity-80 dark:text-emerald-200"
                onClick={() => setToastBilling(null)}
              >
                Cerrar
              </button>
            </div>
          )}

          {!billingEditing ? (
            <div className="flex flex-1 flex-col">
              <div className="border-b border-slate-200/90 pb-4 dark:border-slate-700/80">
                <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  <MdPayments className="h-4 w-4 shrink-0 text-ov-pink dark:text-ov-pink-muted" aria-hidden />
                  Cobro y período de licencia
                </h2>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Datos guardados (seguimiento interno)
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] ring-1 ${
                      billingForm.status === "paid"
                        ? "bg-emerald-500/15 ring-emerald-500/25"
                        : billingForm.status === "overdue"
                          ? "bg-rose-500/15 ring-rose-500/25"
                          : "bg-amber-500/15 ring-amber-500/30"
                    } ${billingStatusClass(billingForm.status)}`}
                  >
                    {billingStatusLabel(billingForm.status)}
                  </span>
                  {billingForm.startDate ? (
                    <span className="text-[12px] text-slate-600 dark:text-slate-300">
                      Inicio {formatDate(`${billingForm.startDate}T12:00:00`)} · {billingForm.months}{" "}
                      {billingForm.months === 1 ? "mes" : "meses"}
                    </span>
                  ) : (
                    <span className="text-[12px] text-slate-500">Sin fecha de inicio registrada</span>
                  )}
                </div>
                {billingPeriodEndIso && (
                  <div className="mt-3 rounded-xl border border-ov-pink/25 bg-ov-pink/[0.06] px-3 py-2.5 dark:bg-ov-pink/10">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Fin del período (calculado)
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-slate-900 dark:text-slate-50">
                      {new Date(billingPeriodEndIso).toLocaleString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
                {billingForm.notes.trim() ? (
                  <p className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2 text-[12px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Notas: </span>
                    {billingForm.notes}
                  </p>
                ) : null}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200/90 pt-4 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setBillingEditing(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Editar cobro y período
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200/90 pb-4 dark:border-slate-700/80">
                <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  <MdPayments className="h-4 w-4 shrink-0 text-ov-pink dark:text-ov-pink-muted" aria-hidden />
                  Cobro y período de licencia
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] ring-1 ${
                      billingForm.status === "paid"
                        ? "bg-emerald-500/15 ring-emerald-500/25"
                        : billingForm.status === "overdue"
                          ? "bg-rose-500/15 ring-rose-500/25"
                          : "bg-amber-500/15 ring-amber-500/30"
                    } ${billingStatusClass(billingForm.status)}`}
                  >
                    {billingStatusLabel(billingForm.status)}
                  </span>
                  {billingForm.startDate ? (
                    <span className="text-[12px] text-slate-600 dark:text-slate-300">
                      Inicio {formatDate(`${billingForm.startDate}T12:00:00`)} · {billingForm.months}{" "}
                      {billingForm.months === 1 ? "mes" : "meses"}
                    </span>
                  ) : (
                    <span className="text-[12px] text-slate-500 dark:text-slate-500">Define inicio y duración abajo</span>
                  )}
                </div>
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
                Periodo comercial interno (pago, renovación). El fin se calcula con inicio + meses.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Estado de cobro
                  </span>
                  <select
                    value={billingForm.status}
                    onChange={(e) =>
                      setBillingForm((f) => ({
                        ...f,
                        status: e.target.value as BillingFormState["status"],
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-ov-pink/50 focus:ring-2 focus:ring-ov-pink/25 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-100"
                  >
                    <option value="paid">Al día (pagó)</option>
                    <option value="pending">Pendiente</option>
                    <option value="overdue">Debe / en mora</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Duración (meses)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={billingForm.months}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!Number.isNaN(n)) setBillingForm((f) => ({ ...f, months: Math.min(120, Math.max(1, n)) }));
                    }}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[13px] text-slate-900 outline-none focus:border-ov-pink/50 focus:ring-2 focus:ring-ov-pink/25 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Inicio del período
                  </span>
                  <DatePickerCard
                    id="interno-license-period-start"
                    value={periodStartDateValue}
                    onChange={(d) =>
                      setBillingForm((f) => ({
                        ...f,
                        startDate: d ? dateToYmdLocal(d) : "",
                      }))
                    }
                    placeholder="dd/mm/aaaa"
                    allowClear
                    size="md"
                    fullWidth
                    aria-label="Inicio del período de licencia"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-xl border border-ov-pink/25 bg-ov-pink/[0.06] px-3 py-3 dark:bg-ov-pink/10">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Fin del período (calculado)
                </p>
                <p className="mt-1 text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {billingPeriodEndIso
                    ? new Date(billingPeriodEndIso).toLocaleString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "— Elige fecha de inicio"}
                </p>
              </div>

              <label className="mt-4 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Notas internas</span>
                <textarea
                  value={billingForm.notes}
                  onChange={(e) => setBillingForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Referencia de pago, valor, acuerdos…"
                  className="resize-y rounded-xl border border-slate-300 bg-slate-50/80 px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-ov-pink/50 focus:ring-2 focus:ring-ov-pink/25 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </label>

              <div className="mt-4 mt-auto flex flex-wrap items-center gap-3 border-t border-slate-200/90 pt-4 dark:border-slate-700/80">
                <button
                  type="button"
                  disabled={savingBilling}
                  onClick={saveBilling}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-ov-pink px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:opacity-50"
                >
                  {savingBilling ? "Guardando…" : "Guardar cobro y período"}
                </button>
                <button
                  type="button"
                  disabled={savingBilling}
                  onClick={async () => {
                    await load();
                    setBillingEditing(false);
                  }}
                  className="inline-flex h-10 items-center rounded-xl px-3 text-[13px] font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Usuarios: tabla estilo ventas */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Usuarios de la organización</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Nombre</th>
                <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Email</th>
                <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Rol</th>
                <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Presencia</th>
                <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[14px] text-slate-500 dark:text-slate-400">
                    Sin usuarios
                  </td>
                </tr>
              ) : (
                users.map((u, rowIndex) => {
                  const rowEven = rowIndex % 2 === 0;
                  const online = isUserOnline(u.last_seen_at);
                  const title =
                    u.last_seen_at != null
                      ? new Date(u.last_seen_at).toLocaleString("es-CO")
                      : undefined;
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        rowEven ? "bg-slate-50/90 dark:bg-slate-800/50" : "bg-white dark:bg-slate-800/20"
                      }`}
                    >
                      <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{u.name}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{u.email}</td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">{u.role}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{u.status ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        {online ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                            En línea
                          </span>
                        ) : (
                          <span className="text-[13px] text-slate-500 dark:text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400" title={title}>
                        {formatLastSeenLabel(u.last_seen_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sucursales */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          <MdStore className="h-4 w-4 text-ov-pink dark:text-ov-pink-muted" aria-hidden />
          Sucursales
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[400px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Nombre</th>
                <th className="px-3 pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-[14px] text-slate-500 dark:text-slate-400">
                    Sin sucursales
                  </td>
                </tr>
              ) : (
                branches.map((b, rowIndex) => {
                  const rowEven = rowIndex % 2 === 0;
                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        rowEven ? "bg-slate-50/90 dark:bg-slate-800/50" : "bg-white dark:bg-slate-800/20"
                      }`}
                    >
                      <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{b.name}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{b.phone ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {billingUnlockCode ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="interno-unlock-code-title"
        >
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-600 dark:bg-slate-900">
            <h2
              id="interno-unlock-code-title"
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50"
            >
              Clave de acceso para el cliente
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
              Envíala por WhatsApp (programamos) u otro canal seguro al cliente.{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">Solo funciona para esta organización</span> y
              con la sesión de un usuario de esa tienda. Solo se muestra ahora: al usarla se invalida; guardá cobro de nuevo
              para generar otra.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-950/80">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Código</p>
              <p className="mt-1 font-mono text-[18px] font-semibold tracking-wider text-slate-900 dark:text-slate-50">
                {billingUnlockCode}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center rounded-xl bg-ov-pink px-4 text-[13px] font-semibold text-white hover:bg-ov-pink-hover"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(billingUnlockCode);
                  } catch {
                    window.alert("No se pudo copiar. Selecciona el código manualmente.");
                  }
                }}
              >
                Copiar
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={() => setBillingUnlockCode(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
