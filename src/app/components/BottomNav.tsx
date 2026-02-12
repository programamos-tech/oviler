"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

const masItems = [
  {
    label: "Actividades",
    href: "/actividades",
    icon: IconActividades,
    items: [],
  },
  {
    label: "Roles",
    href: "/roles",
    icon: IconRoles,
    items: [
      { label: "Ver roles", href: "/roles", icon: IconList },
      { label: "Nuevo empleado", href: "/roles/nuevo", icon: IconUserPlus },
    ],
  },
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
];

const tabs = [
  { label: "Inicio", href: "/dashboard", icon: HomeIcon },
  { label: "Ventas", href: "/ventas", icon: CartIcon },
  { label: "Clientes", href: "/clientes", icon: UsersIcon },
  { label: "Inventario", href: "/inventario", icon: BoxIcon },
  { label: "Más", href: "#", icon: MoreIcon, isMore: true },
];

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
function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [masOpen, setMasOpen] = useState(false);

  useEffect(() => {
    setMasOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (masOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [masOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return href !== "#" && pathname.startsWith(href);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-sm md:hidden dark:border-slate-800 dark:bg-slate-900/95"
        aria-label="Navegación principal"
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          if (tab.isMore) {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setMasOpen(true)}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 transition-colors ${
                  active ? "text-ov-pink dark:text-ov-pink-muted" : "text-slate-500 dark:text-slate-400"
                }`}
                aria-label="Más opciones"
              >
                <tab.icon active={active} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 transition-colors ${
                active ? "text-ov-pink dark:text-ov-pink-muted" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <tab.icon active={active} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sheet "Más" */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${masOpen ? "visible" : "invisible pointer-events-none"}`}
        aria-hidden={!masOpen}
      >
        <div
          className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60"
          onClick={() => setMasOpen(false)}
        />
        <div
          className={`absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out dark:border-slate-800 dark:bg-slate-900 ${
            masOpen ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[13px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Más
            </span>
            <button
              type="button"
              onClick={() => setMasOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="py-3">
            {masItems.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.label} className="mb-4 px-3">
                  <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    <Link
                      href={group.href}
                      onClick={() => setMasOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium ${
                        pathname === group.href
                          ? "bg-ov-pink/10 text-ov-pink-hover dark:bg-ov-pink/20 dark:text-ov-pink-muted"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <GroupIcon />
                      {group.items?.length ? group.items[0]?.label ?? group.label : group.label}
                    </Link>
                    {group.items?.slice(1).map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMasOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 pl-5 text-[14px] font-medium ${
                            pathname === sub.href
                              ? "bg-ov-pink/10 text-ov-pink-hover dark:bg-ov-pink/20 dark:text-ov-pink-muted"
                              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          }`}
                        >
                          {SubIcon ? <SubIcon /> : <IconList />}
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
