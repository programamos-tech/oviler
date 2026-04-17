/** Título de página para la barra superior (desktop), según la ruta. */
export function workspaceTitleFromPath(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/" || pathname.startsWith("/sucursales/reportes")) return "Reportes";
  if (pathname.startsWith("/interno")) return "Berea backOffice";
  if (pathname.startsWith("/ventas/nueva")) return "Nueva venta";
  if (pathname.startsWith("/ventas/") && pathname !== "/ventas") return "Detalle de venta";
  if (pathname.startsWith("/ventas")) return "Ventas";
  if (pathname.startsWith("/clientes/nueva")) return "Nuevo cliente";
  if (pathname.startsWith("/clientes/") && pathname.includes("/editar")) return "Editar cliente";
  if (pathname.startsWith("/clientes/") && pathname !== "/clientes") return "Cliente";
  if (pathname.startsWith("/clientes")) return "Clientes";
  if (pathname.startsWith("/inventario/nuevo")) return "Nuevo producto";
  if (pathname.startsWith("/inventario/") && pathname.includes("/editar")) return "Editar producto";
  if (pathname.startsWith("/inventario/") && pathname !== "/inventario") return "Producto";
  if (pathname.startsWith("/inventario")) return "Productos";
  if (pathname.startsWith("/catalogo/configuracion")) return "Configuración de catálogo";
  if (pathname.startsWith("/catalogo")) return "Catálogo";
  if (pathname.startsWith("/egresos/nuevo")) return "Nuevo egreso";
  if (pathname.startsWith("/egresos/") && pathname !== "/egresos") return "Egreso";
  if (pathname.startsWith("/egresos")) return "Egresos";
  if (pathname.startsWith("/garantias/nueva")) return "Nueva garantía";
  if (pathname.startsWith("/garantias/") && pathname !== "/garantias") return "Garantía";
  if (pathname.startsWith("/creditos/nuevo")) return "Nuevo crédito";
  if (pathname.startsWith("/creditos/cliente/")) return "Créditos del cliente";
  if (pathname.startsWith("/creditos/") && pathname !== "/creditos") return "Detalle de crédito";
  if (pathname === "/creditos" || pathname === "/creditos/") return "Créditos a clientes";
  if (pathname.startsWith("/creditos")) return "Créditos";
  if (pathname.startsWith("/garantias")) return "Garantías";
  if (pathname.startsWith("/cierre-caja/nuevo")) return "Cierre de caja";
  if (pathname.startsWith("/cierre-caja/") && pathname !== "/cierre-caja") return "Cierre de caja";
  if (pathname.startsWith("/cierre-caja")) return "Cierres de caja";
  if (pathname.startsWith("/roles/nuevo")) return "Nuevo colaborador";
  if (pathname.startsWith("/roles/") && pathname.includes("/editar")) return "Editar rol";
  if (pathname.startsWith("/roles")) return "Roles";
  if (pathname.startsWith("/actividades")) return "Actividades";
  if (pathname.startsWith("/sucursales/nueva")) return "Nueva sucursal";
  if (pathname.startsWith("/cuenta")) return "Cuenta";
  if (pathname.startsWith("/sucursales/configurar")) return "Configurar sucursal";
  if (pathname.startsWith("/sucursales")) return "Sucursales";
  return "Panel";
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
