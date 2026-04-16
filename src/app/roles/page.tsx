"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import { loadOrgPlanSnapshot, type OrgPlanSnapshot } from "@/lib/org-plan-snapshot";
import { PlanLimitHeaderNote, PLAN_LIMIT_DISABLED_BUTTON_CLASS } from "@/app/components/PlanLimitNotice";
import { getAvatarVariant } from "@/app/components/app-nav-data";
import { PRODUCT_DISPLAY_NAME, PRODUCT_INTERNAL_NAME } from "@/lib/permissions";

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
      emerald:
        "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/45 dark:bg-emerald-950/25 dark:text-emerald-300",
      blue: "border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/45 dark:bg-blue-950/25 dark:text-blue-300",
      purple: "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-300",
      orange: "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/45 dark:bg-amber-950/25 dark:text-amber-300",
    };
    return colors[color] || colors.blue;
  };

  const getRole = (roleId: string) => roles.find((r) => r.id === roleId);

  const initials = (name: string) =>
    name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Usuarios y roles
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Gestiona colaboradores, roles y permisos en {PRODUCT_DISPLAY_NAME}{" "}
              <span className="text-slate-400 dark:text-slate-500">({PRODUCT_INTERNAL_NAME})</span>.
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
            {planSnapshot && !planSnapshot.canCreateUser ? (
              <span
                className={`${PLAN_LIMIT_DISABLED_BUTTON_CLASS} w-full sm:w-auto`}
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
                className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:w-auto"
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
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
        <details className="group">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-slate-800 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              Quién puede hacer qué en {PRODUCT_DISPLAY_NAME}
              <svg
                className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </summary>
          <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
            <p>
              <strong className="font-semibold text-slate-800 dark:text-slate-200">{PRODUCT_DISPLAY_NAME}</strong> es el
              producto que usas en el negocio; en documentación interna también se llama{" "}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">{PRODUCT_INTERNAL_NAME}</strong>. Cada
              colaborador tiene un <strong className="font-semibold">rol</strong> (Dueño, Administrador, Cajero o Inventario)
              con permisos por defecto; al editar un usuario puedes marcar permisos concretos y sustituir ese paquete.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Dueño:</strong> acceso completo a módulos y
                permisos (incluye usuarios, sucursales, inventario, ventas, créditos, catálogo, etc.).
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Administrador:</strong> ventas, clientes, egresos,
                inventario (productos, stock, transferencias, bodega, merma), créditos y actividades. Por defecto{" "}
                <strong className="font-semibold">no</strong> incluye gestión de colaboradores ni de sucursales, salvo que
                actives esos permisos al editarlo.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Cajero:</strong> ventas, clientes, egresos,
                consulta de inventario, créditos y actividades; orientado a caja y operación diaria sin inventario avanzado
                por defecto.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Inventario</strong> (rol técnico{" "}
                <code className="rounded bg-slate-100 px-1 text-[12px] dark:bg-slate-800">delivery</code>): inventario y
                bodega (productos, categorías, stock, transferencias, ubicaciones, merma) y actividades; por defecto sin
                ventas ni clientes.
              </li>
            </ul>
          </div>
        </details>
      </div>

      {loading ? (
        <div className="min-h-[280px] animate-pulse rounded-3xl bg-white dark:bg-slate-900" aria-hidden />
      ) : users.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-10 text-center dark:bg-slate-900">
          <p className="text-[15px] font-medium text-slate-600 dark:text-slate-300">No hay usuarios en tu organización</p>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
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
                  className="rounded-3xl bg-white px-5 py-4 transition-colors hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-900/80"
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
                      <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-50">
                        {user.name || user.email}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[12px] text-slate-500 dark:text-slate-400">
                        {userRole?.description || "Sin descripción de rol."}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${isActive ? "border border-slate-300/90 bg-slate-200/70 text-[color:var(--shell-sidebar)] dark:border-zinc-600/40 dark:bg-zinc-800/55 dark:text-zinc-300" : "border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                          {isActive ? "Activo" : "Inactivo"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getRoleColor(
                            userRole?.color || "blue"
                          )}`}
                        >
                          {userRole?.name || user.role || "Sin rol"}
                        </span>
                        <Link
                          href={`/roles/${user.id}/editar`}
                          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
