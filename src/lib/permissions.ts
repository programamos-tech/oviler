export type AppRole = "owner" | "admin" | "cashier" | "delivery" | string;
export type PermissionKey =
  | "dashboard.view"
  | "sales.view"
  | "sales.create"
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "expenses.view"
  | "expenses.create"
  | "inventory.view"
  | "inventory.create"
  | "inventory.edit"
  | "inventory.categories"
  | "inventory.stock_update"
  | "inventory.transfer"
  | "inventory.locations"
  | "inventory.waste"
  | "roles.view"
  | "roles.manage"
  | "branches.view"
  | "branches.manage"
  | "activities.view"
  | "credits.view"
  | "credits.manage";

export const PERMISSION_OPTIONS: Array<{ key: PermissionKey; label: string; group: string }> = [
  { key: "dashboard.view", label: "Inicio / Reportes", group: "Inicio" },
  { key: "sales.view", label: "Ventas", group: "Ventas" },
  { key: "sales.create", label: "Crear ventas", group: "Ventas" },
  { key: "customers.view", label: "Ver clientes", group: "Clientes" },
  { key: "customers.create", label: "Crear clientes", group: "Clientes" },
  { key: "customers.edit", label: "Editar clientes", group: "Clientes" },
  { key: "expenses.view", label: "Ver egresos", group: "Egresos" },
  { key: "expenses.create", label: "Crear egresos", group: "Egresos" },
  { key: "inventory.view", label: "Ver inventario", group: "Inventario" },
  { key: "inventory.create", label: "Crear productos", group: "Inventario" },
  { key: "inventory.edit", label: "Editar productos", group: "Inventario" },
  { key: "inventory.categories", label: "Gestionar categorías", group: "Inventario" },
  { key: "inventory.stock_update", label: "Actualizar stock", group: "Inventario" },
  { key: "inventory.transfer", label: "Transferir stock", group: "Inventario" },
  { key: "inventory.locations", label: "Ubicaciones de bodega", group: "Inventario" },
  { key: "inventory.waste", label: "Registrar merma", group: "Inventario" },
  { key: "roles.view", label: "Ver roles", group: "Administración" },
  { key: "roles.manage", label: "Gestionar colaboradores", group: "Administración" },
  { key: "branches.view", label: "Ver sucursales", group: "Administración" },
  { key: "branches.manage", label: "Gestionar sucursales", group: "Administración" },
  { key: "activities.view", label: "Ver actividades", group: "Administración" },
  { key: "credits.view", label: "Ver créditos a clientes", group: "Créditos" },
  { key: "credits.manage", label: "Crear créditos y registrar abonos", group: "Créditos" },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  owner: PERMISSION_OPTIONS.map((p) => p.key),
  admin: [
    "dashboard.view",
    "sales.view",
    "sales.create",
    "customers.view",
    "customers.create",
    "customers.edit",
    "expenses.view",
    "expenses.create",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.categories",
    "inventory.stock_update",
    "inventory.transfer",
    "inventory.locations",
    "inventory.waste",
    "activities.view",
    "credits.view",
    "credits.manage",
  ],
  cashier: [
    "dashboard.view",
    "sales.view",
    "sales.create",
    "customers.view",
    "customers.create",
    "customers.edit",
    "expenses.view",
    "expenses.create",
    "inventory.view",
    "activities.view",
    "credits.view",
    "credits.manage",
  ],
  delivery: PERMISSION_OPTIONS
    .filter((p) => p.group === "Inventario")
    .map((p) => p.key)
    .concat("activities.view"),
};

function normalizePath(pathname: string): string {
  const [clean] = pathname.split("?");
  return clean || "/";
}

function resolvePermissions(
  role: AppRole | null | undefined,
  customPermissions?: string[] | null
): Set<string> {
  const fromCustom = (customPermissions ?? []).filter(Boolean);
  if (fromCustom.length > 0) return new Set([...fromCustom, "activities.view"]);

  const roleKey = role != null && String(role).trim() !== "" ? String(role) : null;
  if (!roleKey) {
    // Sin rol resuelto (perfil aún cargando o dato ausente): no asumir acceso.
    // Antes `ROLE_DEFAULT_PERMISSIONS[""]` era undefined y se concedían todos los permisos (flash en el menú).
    return new Set();
  }

  const defaults = ROLE_DEFAULT_PERMISSIONS[roleKey];
  if (!defaults) {
    // Rol no reconocido: denegar por defecto (antes también se abrían todos los permisos).
    return new Set();
  }

  return new Set([...defaults, "activities.view"]);
}

function hasPathPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + "/");
}

export function canAccessPath(
  role: AppRole | null | undefined,
  pathname: string,
  customPermissions?: string[] | null
): boolean {
  const path = normalizePath(pathname);
  if (path === "/" || path.startsWith("/login") || path.startsWith("/registro") || path.startsWith("/onboarding")) {
    return true;
  }
  if (hasPathPrefix(path, "/cuenta")) return true;

  const p = resolvePermissions(role, customPermissions);
  const can = (key: PermissionKey) => p.has(key);

  if (hasPathPrefix(path, "/dashboard") || hasPathPrefix(path, "/cierre-caja")) return can("dashboard.view");
  if (hasPathPrefix(path, "/ventas") || hasPathPrefix(path, "/garantias")) return can("sales.view");
  if (hasPathPrefix(path, "/creditos")) {
    if (hasPathPrefix(path, "/creditos/nuevo")) return can("credits.manage");
    return can("credits.view");
  }
  if (hasPathPrefix(path, "/clientes")) return can("customers.view");
  if (hasPathPrefix(path, "/catalogo")) return can("inventory.view");
  if (hasPathPrefix(path, "/egresos")) return path.endsWith("/nuevo") ? can("expenses.create") : can("expenses.view");
  if (hasPathPrefix(path, "/roles")) return path.endsWith("/nuevo") || hasPathPrefix(path, "/roles/") ? can("roles.manage") : can("roles.view");
  if (hasPathPrefix(path, "/sucursales")) return path.endsWith("/nueva") || hasPathPrefix(path, "/sucursales/configurar") ? can("branches.manage") : can("branches.view");
  if (hasPathPrefix(path, "/actividades")) return can("activities.view");

  if (hasPathPrefix(path, "/inventario")) {
    if (!can("inventory.view")) return false;
    if (hasPathPrefix(path, "/inventario/nuevo")) return can("inventory.create");
    if (hasPathPrefix(path, "/inventario/categorias")) return can("inventory.categories");
    if (hasPathPrefix(path, "/inventario/actualizar-stock")) return can("inventory.stock_update");
    if (hasPathPrefix(path, "/inventario/transferir")) return can("inventory.transfer");
    if (hasPathPrefix(path, "/inventario/ubicaciones")) return can("inventory.locations");
    if (hasPathPrefix(path, "/inventario/merma")) return can("inventory.waste");
    if (/^\/inventario\/[^/]+\/editar(?:\/|$)/.test(path)) return can("inventory.edit");
    return true;
  }

  return true;
}

export function canAccessNavModule(
  role: AppRole | null | undefined,
  label: string,
  customPermissions?: string[] | null
): boolean {
  if (label === "COMERCIAL") {
    return (
      canAccessPath(role, "/ventas", customPermissions) ||
      canAccessPath(role, "/clientes", customPermissions) ||
      canAccessPath(role, "/garantias", customPermissions) ||
      canAccessPath(role, "/creditos", customPermissions) ||
      canAccessPath(role, "/cierre-caja", customPermissions) ||
      canAccessPath(role, "/dashboard", customPermissions) ||
      canAccessPath(role, "/catalogo", customPermissions)
    );
  }
  if (label === "OPERACIÓN" || label === "OPERACION") {
    return (
      canAccessPath(role, "/inventario", customPermissions) ||
      canAccessPath(role, "/inventario/ubicaciones", customPermissions) ||
      canAccessPath(role, "/roles", customPermissions) ||
      canAccessPath(role, "/actividades", customPermissions) ||
      canAccessPath(role, "/egresos", customPermissions)
    );
  }
  if (label === "CONFIGURACIÓN" || label === "CONFIGURACION") {
    return (
      canAccessPath(role, "/sucursales", customPermissions) ||
      canAccessPath(role, "/cuenta", customPermissions) ||
      canAccessPath(role, "/sucursales/configurar", customPermissions)
    );
  }
  if (label === "Bodega") {
    return canAccessPath(role, "/inventario/ubicaciones", customPermissions);
  }
  if (label === "Cuenta") {
    return canAccessPath(role, "/cuenta", customPermissions);
  }

  const p = resolvePermissions(role, customPermissions);
  const moduleMap: Record<string, PermissionKey> = {
    Inicio: "dashboard.view",
    Reportes: "dashboard.view",
    Ventas: "sales.view",
    Clientes: "customers.view",
    Inventario: "inventory.view",
    Productos: "inventory.view",
    Garantías: "sales.view",
    Créditos: "credits.view",
    Cierres: "dashboard.view",
    "Bodega y stock": "inventory.view",
    Egresos: "expenses.view",
    Catálogo: "inventory.view",
    Catalogo: "inventory.view",
    "Mi tienda web": "inventory.view",
    Roles: "roles.view",
    Sucursales: "branches.view",
    Actividades: "activities.view",
  };
  const required = moduleMap[label];
  return required ? p.has(required) : true;
}
