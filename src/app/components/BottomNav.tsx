"use client";

import { useState, useEffect, useMemo, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canAccessNavModule, canAccessPath, type AppRole } from "@/lib/permissions";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";

const SHOW_BODEGA_IN_SIDEBAR = false;
const SHOW_SUCURSALES_MODULE = true;
const SHOW_CIERRES_MODULE = false;
const SHOW_COMERCIAL_CATALOGO_MODULE = true;

/* Iconos del panel "Más" */
function IconGarantias() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function IconList() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
function IconActividades() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function IconRoles() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function IconUserPlus() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}
function IconSucursales() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function IconCog() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconEgresos() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}
function IconCredits() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}
function IconCierres() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  );
}
function IconBodega() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconCatalogNav() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
      <rect x="3.5" y="4" width="5" height="4.5" rx="1" strokeWidth={2} />
      <path strokeWidth={2} d="M11 6h9M11 8.5h6" />
      <rect x="3.5" y="10" width="5" height="4.5" rx="1" strokeWidth={2} />
      <path strokeWidth={2} d="M11 12h9M11 14.5h6" />
      <rect x="3.5" y="16" width="5" height="4.5" rx="1" strokeWidth={2} />
      <path strokeWidth={2} d="M11 18h9M11 20.5h6" />
    </svg>
  );
}

const masItems = [
  {
    label: "Garantías",
    href: "/garantias",
    icon: IconGarantias,
    items: [
      { label: "Ver garantías", href: "/garantias", icon: IconList },
      { label: "Nueva garantía", href: "/garantias/nueva", icon: IconPlus },
    ],
  },
  {
    label: "Créditos",
    href: "/creditos",
    icon: IconCredits,
    items: [
      { label: "Ver créditos", href: "/creditos", icon: IconList },
      { label: "Nuevo crédito", href: "/creditos/nuevo", icon: IconPlus },
    ],
  },
  {
    label: "Egresos",
    href: "/egresos",
    icon: IconEgresos,
    items: [],
  },
  ...(SHOW_CIERRES_MODULE
    ? [
        {
          label: "Cierres",
          href: "/cierre-caja",
          icon: IconCierres,
          items: [
            { label: "Ver cierres", href: "/cierre-caja", icon: IconList },
            { label: "Nuevo cierre", href: "/cierre-caja/nuevo", icon: IconPlus },
          ],
        },
      ]
    : []),
  ...(SHOW_BODEGA_IN_SIDEBAR
    ? [{
        label: "Bodega",
        href: "/inventario/ubicaciones",
        icon: IconBodega,
        items: [],
      }]
    : []),
  {
    label: "Actividades",
    href: "/actividades",
    icon: IconActividades,
    items: [],
  },
  ...(SHOW_COMERCIAL_CATALOGO_MODULE
    ? [
        {
          label: "Catálogo",
          href: "/catalogo",
          icon: IconCatalogNav,
          items: [{ label: "Catálogo", href: "/catalogo", icon: IconCatalogNav }],
        },
      ]
    : []),
  {
    label: "Roles",
    href: "/roles",
    icon: IconRoles,
    items: [
      { label: "Ver roles", href: "/roles", icon: IconList },
      { label: "Nuevo colaborador", href: "/roles/nuevo", icon: IconUserPlus },
    ],
  },
  ...(SHOW_SUCURSALES_MODULE
    ? [
        {
          label: "Sucursales",
          href: "/sucursales",
          icon: IconSucursales,
          items: [
            { label: "Ver sucursales", href: "/sucursales", icon: IconList },
            { label: "Configurar sucursal", href: "/sucursales/configurar", icon: IconCog },
            { label: "Nueva sucursal", href: "/sucursales/nueva", icon: IconPlus },
          ],
        },
        {
          label: "Cuenta",
          href: "/cuenta",
          icon: IconCog,
          items: [],
        },
      ]
    : []),
];

const primaryTabs = [
  { label: "Reportes", href: "/dashboard", icon: HomeIcon },
  { label: "Ventas", href: "/ventas", icon: CartIcon },
  { label: "Clientes", href: "/clientes", icon: UsersIcon },
  { label: "Productos", href: "/inventario", icon: BoxIcon },
] as const;

function masIconToNavIcon(MasIcon: ComponentType<object>) {
  return function NavIcon({ active }: { active: boolean }) {
    return (
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center text-current transition-opacity [&_svg]:h-6 [&_svg]:w-6 [&_svg]:shrink-0 ${active ? "opacity-100" : "opacity-80"}`}
      >
        <MasIcon />
      </span>
    );
  };
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function CartIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function UsersIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function BoxIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
export default function BottomNav() {
  const pathname = usePathname();
  const [showExpenses, setShowExpenses] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadBranchState = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const resolvedBranchId = await resolveActiveBranchId(supabase, user.id);
      if (!resolvedBranchId || cancelled) return;
      const { data: branch } = await supabase.from("branches").select("show_expenses").eq("id", resolvedBranchId).single();
      const { data: me } = await supabase.from("users").select("role, permissions").eq("id", user.id).single();
      if (!cancelled && branch) {
        setShowExpenses(branch.show_expenses !== false);
        setUserRole((me?.role ?? null) as AppRole | null);
        setUserPermissions((me as { permissions?: string[] | null } | null)?.permissions ?? null);
      }
    };
    const handleBranchChange = () => {
      void loadBranchState();
    };
    void loadBranchState();
    if (typeof window !== "undefined") {
      window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, handleBranchChange);
    }
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, handleBranchChange);
      }
    };
  }, []);

  const displayMasItems = useMemo(
    () =>
      (showExpenses === false ? masItems.filter((g) => g.label !== "Egresos") : masItems)
        .filter((group) => canAccessNavModule(userRole, group.label, userPermissions))
        .map((group) => ({
          ...group,
          items: (group.items ?? []).filter((sub) => canAccessPath(userRole, sub.href, userPermissions)),
        }))
        .filter((group) => canAccessPath(userRole, group.href, userPermissions) || (group.items?.length ?? 0) > 0),
    [showExpenses, userRole, userPermissions]
  );

  const bottomNavItems = useMemo(() => {
    const primary = primaryTabs
      .filter((t) => canAccessPath(userRole, t.href, userPermissions))
      .map((t) => ({ label: t.label, href: t.href, Icon: t.icon }));
    const extra = displayMasItems.map((g) => ({
      label: g.label,
      href: g.href,
      Icon: masIconToNavIcon(g.icon),
    }));
    return [...primary, ...extra];
  }, [userRole, userPermissions, displayMasItems]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/sucursales/reportes" || pathname === "/";
    return href !== "#" && pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 min-w-0 max-w-full border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] pt-2 text-slate-700 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-200 lg:hidden"
      aria-label="Navegación principal"
    >
      {/* Scroll horizontal en el contenedor; fila interna centrada cuando cabe (w-max min-w-full). */}
      <div className="bottom-nav-scroll w-full min-w-0 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 pb-1">
        <div className="flex w-max min-w-full snap-x snap-mandatory flex-nowrap items-end justify-center gap-0.5">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.Icon;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`flex min-w-[4.5rem] max-w-[5.25rem] shrink-0 snap-start flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-center transition-colors sm:min-w-[4.75rem] ${
                  active ? "text-[color:var(--shell-sidebar)] dark:text-zinc-300" : "text-slate-400 dark:text-slate-500"
                }`}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon active={active} />
                <span className="line-clamp-2 w-full text-[10px] font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
