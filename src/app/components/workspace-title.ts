import { STORE_TECH_COPY } from "@/lib/store-tech-copy";

const W = STORE_TECH_COPY.workspace;

/** Título de página para la barra superior (desktop), según la ruta. */
export function workspaceTitleFromPath(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/" || pathname.startsWith("/sucursales/reportes")) return W.reportes;
  if (pathname.startsWith("/interno")) return "Berea backOffice";
  if (pathname.startsWith("/ventas/nueva")) return W.ventasNueva;
  if (pathname.startsWith("/ventas/") && pathname !== "/ventas") return W.ventasDetalle;
  if (pathname.startsWith("/ventas")) return W.ventas;
  if (pathname.startsWith("/clientes/nueva")) return W.clientesNueva;
  if (pathname.startsWith("/clientes/") && pathname.includes("/editar")) return W.clientesEditar;
  if (pathname.startsWith("/clientes/") && pathname !== "/clientes") return W.clientesDetalle;
  if (pathname.startsWith("/clientes")) return W.clientes;
  if (pathname.startsWith("/inventario/nuevo")) return W.inventarioNuevo;
  if (pathname.startsWith("/inventario/") && pathname.includes("/editar")) return W.inventarioEditar;
  if (pathname.startsWith("/inventario/") && pathname !== "/inventario") return W.inventarioDetalle;
  if (pathname.startsWith("/inventario")) return W.inventario;
  if (pathname.startsWith("/catalogo/configuracion")) return "Configuración de catálogo";
  if (pathname.startsWith("/catalogo")) return "Catálogo";
  if (pathname.startsWith("/egresos/nuevo")) return W.egresosNuevo;
  if (pathname.startsWith("/egresos/") && pathname !== "/egresos") return W.egresosDetalle;
  if (pathname.startsWith("/egresos")) return W.egresos;
  if (pathname.startsWith("/garantias/nueva")) return W.garantiasNueva;
  if (pathname.startsWith("/garantias/") && pathname !== "/garantias") return W.garantiasDetalle;
  if (pathname.startsWith("/creditos/nuevo")) return W.creditosNuevo;
  if (pathname.startsWith("/creditos/cliente/")) return W.creditosCliente;
  if (pathname.startsWith("/creditos/") && pathname !== "/creditos") return W.creditosDetalle;
  if (pathname === "/creditos" || pathname === "/creditos/") return W.creditos;
  if (pathname.startsWith("/creditos")) return W.creditos;
  if (pathname.startsWith("/garantias")) return W.garantias;
  if (pathname.startsWith("/cierre-caja/nuevo")) return "Cierre de caja";
  if (pathname.startsWith("/cierre-caja/") && pathname !== "/cierre-caja") return "Cierre de caja";
  if (pathname.startsWith("/cierre-caja")) return "Cierres de caja";
  if (pathname.startsWith("/roles/nuevo")) return W.rolesNuevo;
  if (pathname.startsWith("/roles/") && pathname.includes("/editar")) return "Editar rol";
  if (pathname.startsWith("/roles")) return W.roles;
  if (pathname.startsWith("/actividades")) return W.actividades;
  if (pathname.startsWith("/sucursales/nueva")) return "Nueva sucursal";
  if (pathname.startsWith("/cuenta")) return "Cuenta";
  if (pathname.startsWith("/sucursales/configurar")) return "Configurar sucursal";
  if (pathname.startsWith("/sucursales")) return "Sucursales";
  return W.panel;
}

/** Nombre visible: tabla `users`, si falta metadata de auth (OAuth / registro). Nunca el correo completo en primera línea. */
export function workspaceUserDisplayName(
  row: { name?: string | null; email?: string | null } | null | undefined,
  authMetadata?: Record<string, unknown> | null
): string {
  if (!row) return "Usuario";
  const fromRow = (row.name ?? "").trim();
  if (fromRow) return fromRow;
  const meta = authMetadata ?? {};
  for (const key of ["full_name", "name", "display_name", "preferred_username"] as const) {
    const v = meta[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "Usuario";
}

/** Rol de plataforma en español (valores en BD suelen ir en inglés). */
export function workspaceRoleLabel(role: string | null | undefined): string {
  const r = String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const labels: Record<string, string> = {
    owner: "Propietario",
    admin: "Administrador",
    super_admin: "Super administrador",
    superadmin: "Super administrador",
    cashier: "Caja",
    caja: "Caja",
    delivery: "Repartidor",
    readonly: "Solo lectura",
    viewer: "Solo lectura",
  };
  if (labels[r]) return labels[r];
  if (r) {
    return r
      .split("_")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return "Cuenta";
}
