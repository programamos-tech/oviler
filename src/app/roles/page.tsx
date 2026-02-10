"use client";

import { useState } from "react";
import Link from "next/link";

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  lastLogin: string;
  lastActivity?: string;
  avatar?: string;
  photoUrl?: string;
  username?: string;
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
    name: "Repartidor",
    description: "Ve solo los pedidos asignados y actualiza su estado",
    color: "purple",
    permissions: ["warranties.view", "dashboard.view"],
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

const users: User[] = [
  {
    id: "1",
    name: "Juan Pérez",
    email: "juan@tienda.com",
    role: "owner",
    status: "active",
    lastLogin: "Hace 5 minutos",
    lastActivity: "Viendo dashboard",
    avatar: "JP",
  },
  {
    id: "2",
    name: "María López",
    email: "maria@tienda.com",
    role: "cashier",
    status: "active",
    lastLogin: "Hace 1 hora",
    lastActivity: "Registró una venta hace 15 min",
    avatar: "ML",
  },
  {
    id: "3",
    name: "Carlos Gómez",
    email: "carlos@tienda.com",
    role: "delivery",
    status: "active",
    lastLogin: "Hace 2 horas",
    lastActivity: "Entregando pedido #1024",
    avatar: "CG",
  },
  {
    id: "4",
    name: "Ana Martínez",
    email: "ana@tienda.com",
    role: "admin",
    status: "active",
    lastLogin: "Ayer",
    lastActivity: "Actualizó stock de Aceite 1L",
    avatar: "AM",
  },
  {
    id: "5",
    name: "Pedro Rodríguez",
    email: "pedro@tienda.com",
    role: "cashier",
    status: "inactive",
    lastLogin: "Hace 3 días",
    lastActivity: "Último acceso hace 3 días",
    avatar: "PR",
  },
];

export default function RolesPage() {
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Usuarios y roles
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Gestiona empleados, roles y permisos. Define quién puede hacer qué en Oviler.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/roles/nuevo"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo empleado
            </Link>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => {
            const userRole = getRole(user.role);
            const isActive = user.status === "active";
            return (
              <div
                key={user.id}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
              >
                <div className="flex gap-4">
                  {/* Avatar protagonista: grande a la izquierda */}
                  <div className="relative shrink-0">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-2xl font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (user.avatar || user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase())
                      )}
                    </div>
                    <span
                      className={`absolute bottom-2 right-0 h-3 w-3 -translate-y-1 -translate-x-2 rounded-full ${
                        isActive ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                      title={isActive ? "En línea" : "Desconectado"}
                    />
                  </div>
                  {/* Contenido a la derecha, distribuido */}
                  <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
                    <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                      {user.name}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                      {user.lastActivity || user.lastLogin}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block rounded-md px-2 py-1 text-[11px] font-bold ${getRoleColor(
                          userRole?.color || "blue"
                        )}`}
                      >
                        {userRole?.name || "Sin rol"}
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
    </div>
  );
}
