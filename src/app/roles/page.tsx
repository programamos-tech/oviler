"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import { loadOrgPlanSnapshot, type OrgPlanSnapshot } from "@/lib/org-plan-snapshot";
import { PlanLimitHeaderNote, PLAN_LIMIT_DISABLED_BUTTON_CLASS } from "@/app/components/PlanLimitNotice";
import { getAvatarVariant } from "@/app/components/app-nav-data";
import { PRODUCT_DISPLAY_NAME, PRODUCT_INTERNAL_NAME } from "@/lib/permissions";

const REPORTS_SURFACE = "berea-reports-surface";

const bereaBadgeBase = "inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset";

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

const roles: Role[] = [
  {
    id: "owner",
    name: "Dueño",
    description: "Acceso completo a todas las funcionalidades del sistema",
    color: "emerald",
    permissions: [],
  },
  {
    id: "cashier",
    name: "Cajero",
    description: "Registra ventas, pedidos y realiza cierres de caja",
    color: "blue",
    permissions: [
      "sales.view",
      "sales.create",
      "sales.cancel",
      "customers.view",
      "customers.edit",
      "warranties.view",
      "dashboard.view",
    ],
  },
  {
    id: "delivery",
    name: "Inventario",
    description: "Gestiona el inventario, productos, categorías, stock y ubicaciones",
    color: "purple",
    permissions: [
      "inventory.view",
      "inventory.create",
      "inventory.edit",
      "inventory.categories",
      "inventory.stock_update",
      "inventory.transfer",
      "inventory.locations",
      "inventory.waste",
    ],
  },
  {
    id: "admin",
    name: "Administrador",
    description: "Configura productos, inventario y usuarios",
    color: "orange",
    permissions: [
      "sales.view",
      "inventory.view",
      "inventory.edit",
      "inventory.adjust",
      "customers.view",
      "customers.edit",
      "warranties.view",
      "warranties.approve",
      "dashboard.view",
      "reports.view",
      "users.manage",
    ],
  },
];

export default function RolesPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [planSnapshot, setPlanSnapshot] = useState<OrgPlanSnapshot | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || cancelled) {
        setLoading(false);
        return;
      }
      const { data: me } = await supabase.from("users").select("organization_id").eq("id", authUser.id).single();
      if (!me?.organization_id || cancelled) {
        setLoading(false);
        return;
      }
      const snap = await loadOrgPlanSnapshot(supabase, me.organization_id);
      if (!cancelled) setPlanSnapshot(snap);
      const { data: rows, error } = await supabase
        .from("users")
        .select("id, name, email, role, status, avatar_url, created_at, updated_at")
        .eq("organization_id", me.organization_id)
        .order("name");
      if (cancelled) return;
      if (!error && rows) setUsers((rows || []) as UserRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);
  const getRoleColor = (color: string) => {
    const colors: Record<string, string> = {
      emerald: `${bereaBadgeBase} bg-emerald-100 text-emerald-900 ring-emerald-300`,
      blue: `${bereaBadgeBase} bg-sky-100 text-sky-950 ring-sky-300`,
      purple: `${bereaBadgeBase} bg-violet-100 text-violet-900 ring-violet-300`,
      orange: `${bereaBadgeBase} bg-amber-100 text-amber-950 ring-amber-300`,
    };
    return colors[color] || colors.blue;
  };

  const statusBadge = (active: boolean) =>
    active
      ? `${bereaBadgeBase} bg-emerald-100 text-emerald-900 ring-emerald-300`
      : `${bereaBadgeBase} bg-slate-100 text-[var(--berea-ink-muted)] ring-[var(--berea-card-border)]`;

  const getRole = (roleId: string) => roles.find((r) => r.id === roleId);

  const initials = (name: string) =>
    name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 text-[15px] text-[var(--berea-ink)] sm:space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">
            Usuarios y roles
          </h1>
          <p className="mt-0.5 text-[14px] text-[var(--berea-ink-muted)]">
            Gestiona colaboradores, roles y permisos en {PRODUCT_DISPLAY_NAME}{" "}
            <span className="text-[var(--berea-ink-subtle)]">({PRODUCT_INTERNAL_NAME})</span>.
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
          {planSnapshot && !planSnapshot.canCreateUser ? (
            <span
              className={`${PLAN_LIMIT_DISABLED_BUTTON_CLASS} inline-flex h-10 items-center gap-2 rounded-lg px-4`}
              title="Límite de usuarios alcanzado"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo colaborador
            </span>
          ) : (
            <Link
              href="/roles/nuevo"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo colaborador
            </Link>
          )}
          {planSnapshot && !planSnapshot.canCreateUser ? (
            <PlanLimitHeaderNote kind="users" planId={planSnapshot.planId} className="sm:justify-end" />
          ) : null}
        </div>
      </header>

      <div className={`rounded-xl px-4 py-4 sm:px-6 sm:py-5 ${REPORTS_SURFACE}`}>
        <details className="group">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-[var(--berea-ink)] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              Quién puede hacer qué en {PRODUCT_DISPLAY_NAME}
              <svg
                className="h-4 w-4 shrink-0 text-[var(--berea-ink-muted)] transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </summary>
          <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-[var(--berea-ink-muted)]">
            <p>
              <strong className="font-semibold text-[var(--berea-ink)]">{PRODUCT_DISPLAY_NAME}</strong> es el
              producto que usas en el negocio; en documentación interna también se llama{" "}
              <strong className="font-semibold text-[var(--berea-ink)]">{PRODUCT_INTERNAL_NAME}</strong>. Cada
              colaborador tiene un <strong className="font-semibold">rol</strong> (Dueño, Administrador, Cajero o Inventario)
              con permisos por defecto; al editar un usuario puedes marcar permisos concretos y sustituir ese paquete.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-[var(--berea-ink)]">Dueño:</strong> acceso completo a módulos y
                permisos (incluye usuarios, sucursales, inventario, ventas, créditos, catálogo, etc.).
              </li>
              <li>
                <strong className="text-[var(--berea-ink)]">Administrador:</strong> ventas, clientes, egresos,
                inventario (productos, stock, transferencias, bodega, merma), créditos y actividades. Por defecto{" "}
                <strong className="font-semibold">no</strong> incluye gestión de colaboradores ni de sucursales, salvo que
                actives esos permisos al editarlo.
              </li>
              <li>
                <strong className="text-[var(--berea-ink)]">Cajero:</strong> ventas, clientes, egresos,
                consulta de inventario, créditos y actividades; orientado a caja y operación diaria sin inventario avanzado
                por defecto.
              </li>
              <li>
                <strong className="text-[var(--berea-ink)]">Inventario</strong> (rol técnico{" "}
                <code className="rounded-md bg-[var(--shell-workspace)] px-1.5 py-0.5 text-[12px] text-[var(--berea-ink)]">delivery</code>): inventario y
                bodega (productos, categorías, stock, transferencias, ubicaciones, merma) y actividades; por defecto sin
                ventas ni clientes.
              </li>
            </ul>
          </div>
        </details>
      </div>

      {loading ? (
        <div className={`min-h-[280px] animate-pulse rounded-xl ${REPORTS_SURFACE}`} aria-hidden />
      ) : users.length === 0 ? (
        <div className={`rounded-xl px-6 py-10 text-center ${REPORTS_SURFACE}`}>
          <p className="text-[15px] font-medium text-[var(--berea-ink-muted)]">No hay usuarios en tu organización</p>
          <p className="mt-1 text-[13px] text-[var(--berea-ink-muted)]">
            El usuario con el que creaste la cuenta debería aparecer aquí. Si no ves a nadie, revisa que estés en la organización correcta.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {users.map((user) => {
              const userRole = getRole(user.role);
              const isActive = (user.status ?? "active") === "active";
              return (
                <div
                  key={user.id}
                  className={`rounded-xl px-5 py-4 transition-colors hover:bg-[var(--shell-workspace)] ${REPORTS_SURFACE}`}
                >
                  <div className="flex gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xl font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {user.avatar_url && !user.avatar_url.startsWith("avatar:") ? (
                          <>
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                            <span className={`absolute inset-0 hidden items-center justify-center ${user.avatar_url ? "bg-slate-200 dark:bg-slate-700" : ""}`} style={user.avatar_url ? { display: "none" } : undefined}>
                              {initials(user.name)}
                            </span>
                          </>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full">
                            <WorkspaceCharacterAvatar
                              seed={`${user.email || user.id}-${getAvatarVariant(user.avatar_url)}`}
                              size={112}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          isActive ? "bg-[color:var(--shell-sidebar)] dark:bg-zinc-300" : "bg-slate-400"
                        }`}
                        title={isActive ? "Activo" : "Inactivo"}
                      />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
                      <p className="truncate text-[15px] font-semibold text-[var(--berea-ink)]">
                        {user.name || user.email}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-[var(--berea-ink-muted)]">
                        {user.email}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[12px] text-[var(--berea-ink-muted)]">
                        {userRole?.description || "Sin descripción de rol."}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={statusBadge(isActive)}>
                          {isActive ? "Activo" : "Inactivo"}
                        </span>
                        <span
                          className={`${getRoleColor(
                            userRole?.color || "blue"
                          )}`}
                        >
                          {userRole?.name || user.role || "Sin rol"}
                        </span>
                        <Link
                          href={`/roles/${user.id}/editar`}
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[12px] font-semibold text-[var(--berea-ink)] transition-colors hover:bg-[var(--shell-workspace)] ${REPORTS_SURFACE}`}
                        >
                          Editar
                        </Link>
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
