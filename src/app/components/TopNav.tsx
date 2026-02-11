"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Notifications from "./Notifications";

const iconClass = "h-5 w-5 shrink-0";

function NavIconHome() {
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function NavIconCart() {
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function NavIconShield() {
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function NavIconUsers() {
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function NavIconBox() {
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
function NavIconClipboard() {
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function NavIconUserGroup() {
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function NavIconBuilding() {
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  items?: { label: string; href: string; icon?: React.ReactNode }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <NavIconHome /> },
  {
    label: "Ventas",
    href: "/ventas",
    icon: <NavIconCart />,
    items: [
      { label: "Ver ventas", href: "/ventas" },
      { label: "Nueva venta", href: "/ventas/nueva" },
    ],
  },
  {
    label: "Garantías",
    href: "/garantias",
    icon: <NavIconShield />,
    items: [
      { label: "Ver garantías", href: "/garantias" },
      { label: "Nueva garantía", href: "/garantias/nueva" },
    ],
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: <NavIconUsers />,
    items: [
      { label: "Ver clientes", href: "/clientes" },
      { label: "Nuevo cliente", href: "/clientes/nueva" },
    ],
  },
  {
    label: "Inventario",
    href: "/inventario",
    icon: <NavIconBox />,
    items: [
      { label: "Listado de productos", href: "/inventario" },
      { label: "Nuevo producto", href: "/inventario/nuevo" },
      { label: "Categorías", href: "/inventario/categorias" },
      { label: "Actualizar stock", href: "/inventario/actualizar-stock" },
      { label: "Transferir stock", href: "/inventario/transferir" },
    ],
  },
  { label: "Actividades", href: "/actividades", icon: <NavIconClipboard /> },
  {
    label: "Roles",
    href: "/roles",
    icon: <NavIconUserGroup />,
    items: [
      { label: "Ver roles", href: "/roles" },
      { label: "Nuevo empleado", href: "/roles/nuevo" },
    ],
  },
  {
    label: "Sucursales",
    href: "/sucursales",
    icon: <NavIconBuilding />,
    items: [
      { label: "Ver sucursales", href: "/sucursales" },
      { label: "Configurar sucursal", href: "/sucursales/configurar" },
      { label: "Nueva sucursal", href: "/sucursales/nueva" },
    ],
  },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("name, email")
          .eq("id", authUser.id)
          .single();
        if (userData) {
          setUser(userData);
        }
      }
    }
    loadUser();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && !ref.contains(target) && !target.closest("a")) setOpenDropdown(null);
      });
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
    };
    if (openDropdown || userMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown, userMenuOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-14 min-h-[3.5rem] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex shrink-0 items-center gap-1 font-logo">
          <svg className="h-6 w-6 shrink-0 text-slate-900 dark:text-slate-50 sm:h-7 sm:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
            NOU
          </span>
        </Link>

        {/* Tablet (md–lg): menú arriba solo con iconos, separados. Desktop (lg+): solo texto, sin iconos */}
        <div className="hidden items-center gap-2 md:flex md:gap-3 lg:gap-1 xl:gap-2">
          {navItems.map((item) => {
            const hasDropdown = item.items && item.items.length > 0;
            const isItemActive = isActive(item.href);
            const isOpen = openDropdown === item.label;

            return (
              <div
                key={item.label}
                className="relative"
                ref={(el) => {
                  dropdownRefs.current[item.label] = el;
                }}
              >
                {hasDropdown ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                      title={item.label}
                      aria-label={item.label}
                      className={`flex items-center gap-1 rounded-lg px-2 py-2 text-[13px] font-medium transition-colors md:px-3 md:py-2.5 lg:px-4 lg:py-2 xl:text-[14px] ${
                        isItemActive
                          ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-50"
                          : "text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-50"
                      }`}
                    >
                      <span className="lg:hidden">{item.icon}</span>
                      <span className="hidden lg:inline">{item.label}</span>
                      <svg
                        className={`hidden h-3 w-3 shrink-0 lg:block ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        {item.items?.map((subItem) => {
                          const isSubItemActive = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={() => setOpenDropdown(null)}
                              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                isSubItemActive
                                  ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-50"
                                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-50"
                              }`}
                            >
                              {subItem.icon}
                              {subItem.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    title={item.label}
                    aria-label={item.label}
                    className={`flex items-center gap-1 rounded-lg px-2 py-2 md:px-3 md:py-2.5 lg:px-4 lg:py-2 text-[13px] font-medium transition-colors xl:text-[14px] ${
                      isItemActive
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                        : "text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                    }`}
                  >
                    <span className="lg:hidden">{item.icon}</span>
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: notificaciones y usuario (visible en mobile, tablet y desktop) */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Notifications />
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Perfil"
              aria-expanded={userMenuOpen}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-slate-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="max-w-[120px] truncate text-[13px] font-medium sm:max-w-[140px] lg:max-w-none">
                {user?.name || user?.email || "Usuario"}
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${userMenuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={async () => {
                    setUserMenuOpen(false);
                    await supabase.auth.signOut();
                    router.push("/login");
                    router.refresh();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
