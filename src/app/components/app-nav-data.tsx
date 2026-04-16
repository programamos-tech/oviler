import type React from "react";

const iconClass = "h-5 w-5 shrink-0";
const SHOW_BODEGA_IN_SIDEBAR = false;
const SHOW_SUCURSALES_MODULE = true;
const SHOW_CIERRES_MODULE = false;
/** Catálogo en línea (/catalogo): siempre visible; el acceso funcional depende del plan (Lite bloqueado en pantalla). */
const SHOW_COMERCIAL_CATALOGO_MODULE = true;

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

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  items?: { label: string; href: string; icon?: React.ReactNode; description?: string }[];
}

function IconList() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
function IconCategory() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}
function IconStock() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
function IconTransfer() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}
function IconLocation() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconEgresos() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}
function IconCredits() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}
/** Lista con miniatura + líneas (catálogo de referencias / vitrina). */
function IconCatalogNav() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
      <rect x="3.5" y="4" width="5" height="4.5" rx="1" strokeWidth={2} />
      <path strokeWidth={2} d="M11 6h9M11 8.5h6" />
      <rect x="3.5" y="10" width="5" height="4.5" rx="1" strokeWidth={2} />
      <path strokeWidth={2} d="M11 12h9M11 14.5h6" />
      <rect x="3.5" y="16" width="5" height="4.5" rx="1" strokeWidth={2} />
      <path strokeWidth={2} d="M11 18h9M11 20.5h6" />
    </svg>
  );
}

/** Shell: COMERCIAL, OPERACIÓN (incluye egresos), CONFIGURACIÓN. TopNav / sidebar comparten esta lista. */
export const navItems: NavItem[] = [
  {
    label: "COMERCIAL",
    href: "/dashboard",
    icon: <NavIconCart />,
    items: [
      { label: "Reportes", href: "/dashboard", icon: <IconChart />, description: "Indicadores y resumen" },
      { label: "Ventas", href: "/ventas", icon: <IconList />, description: "Facturas y pedidos" },
      { label: "Clientes", href: "/clientes", icon: <NavIconUsers />, description: "Directorio de clientes" },
      { label: "Garantías", href: "/garantias", icon: <NavIconShield />, description: "Garantías y devoluciones" },
      { label: "Créditos", href: "/creditos", icon: <IconCredits />, description: "Créditos y cobros a clientes" },
      ...(SHOW_COMERCIAL_CATALOGO_MODULE
        ? [
            {
              label: "Catálogo",
              href: "/catalogo",
              icon: <IconCatalogNav />,
              description: "Vista, enlace y configuración del catálogo en línea",
            },
          ]
        : []),
      ...(SHOW_CIERRES_MODULE
        ? [{ label: "Cierres", href: "/cierre-caja", icon: <IconList />, description: "Cierres de caja" }]
        : []),
    ],
  },
  {
    label: "OPERACIÓN",
    href: "/inventario",
    icon: <NavIconBox />,
    items: [
      { label: "Productos", href: "/inventario", icon: <IconList />, description: "Catálogo e inventario" },
      ...(SHOW_BODEGA_IN_SIDEBAR
        ? [{ label: "Bodega", href: "/inventario/ubicaciones", icon: <IconLocation />, description: "Ubicaciones y bodega" }]
        : []),
      { label: "Roles", href: "/roles", icon: <NavIconUserGroup />, description: "Colaboradores y permisos" },
      { label: "Actividades", href: "/actividades", icon: <NavIconClipboard />, description: "Actividad de la sucursal" },
      { label: "Egresos", href: "/egresos", icon: <IconEgresos />, description: "Gastos y salidas de efectivo" },
    ],
  },
  ...(SHOW_SUCURSALES_MODULE
    ? [
        {
          label: "CONFIGURACIÓN",
          href: "/sucursales",
          icon: <NavIconBuilding />,
          items: [
            { label: "Sucursales", href: "/sucursales", icon: <IconList />, description: "Sucursales de la organización" },
            { label: "Cuenta", href: "/cuenta", icon: <IconSettings />, description: "Perfil del propietario y avatar" },
          ],
        },
      ]
    : []),
];

export function getAvatarVariant(avatarUrl?: string | null): "beam" | "marble" | "pixel" {
  if (!avatarUrl?.startsWith("avatar:")) return "beam";
  const variant = avatarUrl.replace("avatar:", "");
  if (variant === "beam" || variant === "marble" || variant === "pixel") return variant;
  return "beam";
}

/** Misma semilla que el avatar del navbar (TopNav / AppDesktopHeader) para WorkspaceCharacterAvatar. */
export function workspaceAvatarSeed(
  email: string | null | undefined,
  name: string | null | undefined,
  avatarUrl: string | null | undefined
): string {
  const identity =
    (typeof email === "string" && email.trim()) || (typeof name === "string" && name.trim()) || "usuario";
  return `${identity}-${getAvatarVariant(avatarUrl)}`;
}

export function navPathIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/sucursales/reportes";
  if (href === "/inventario/ubicaciones") {
    return pathname === "/inventario/ubicaciones" || pathname.startsWith("/inventario/ubicaciones/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
