"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "boring-avatars";

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

function getAvatarVariant(avatarUrl?: string | null): "beam" | "marble" | "pixel" {
  if (!avatarUrl?.startsWith("avatar:")) return "beam";
  const variant = avatarUrl.replace("avatar:", "");
  if (variant === "beam" || variant === "marble" || variant === "pixel") return variant;
  return "beam";
}

export default function RolesPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

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
      emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      purple: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
      orange: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    };
    return colors[color] || colors.blue;
  };

  const getRole = (roleId: string) => roles.find((r) => r.id === roleId);

  const initials = (name: string) =>
    name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Usuarios y roles
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Gestiona colaboradores, roles y permisos. Define quién puede hacer qué en NOU Tiendas.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/roles/nuevo"
              className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo colaborador
            </Link>
          </div>
        </div>
      </header>

      {loading ? (
        <p className="text-[14px] text-slate-500 dark:text-slate-400">Cargando usuarios…</p>
      ) : users.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[15px] font-medium text-slate-600 dark:text-slate-300">No hay usuarios en tu organización</p>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
            El usuario con el que creaste la cuenta debería aparecer aquí. Si no ves a nadie, revisa que estés en la organización correcta.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => {
              const userRole = getRole(user.role);
              const isActive = (user.status ?? "active") === "active";
              return (
                <div
                  key={user.id}
                  className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
                >
                  <div className="flex gap-4">
                    <div className="relative shrink-0">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-2xl font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
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
                          <div className="flex h-24 w-24 items-center justify-center rounded-full">
                            <Avatar
                              size={92}
                              name={`${user.name || user.email || user.id}-${getAvatarVariant(user.avatar_url)}`}
                              variant={getAvatarVariant(user.avatar_url)}
                              colors={["#FF7F50", "#FFA07A", "#FFB300", "#00BFA5", "#5C6BC0"]}
                            />
                          </div>
                        )}
                      </div>
                      <span
                        className={`absolute bottom-2 right-0 h-3 w-3 -translate-y-1 -translate-x-2 rounded-full ${
                          isActive ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                        title={isActive ? "Activo" : "Inactivo"}
                      />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
                      <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                        {user.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                        {isActive ? "Activo" : "Inactivo"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-block rounded-md px-2 py-1 text-[11px] font-bold ${getRoleColor(
                            userRole?.color || "blue"
                          )}`}
                        >
                          {userRole?.name || user.role || "Sin rol"}
                        </span>
                        <Link
                          href={`/roles/${user.id}/editar`}
                          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
