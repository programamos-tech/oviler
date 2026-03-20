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
  | "activities.view";

export const PERMISSION_OPTIONS: Array<{ key: PermissionKey; label: string; group: string }> = [
  { key: "dashboard.view", label: "Inicio / Reportes", group: "Inicio" },
  { key: "sales.view", label: "Ver ventas", group: "Ventas" },
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
  return new Set([...(ROLE_DEFAULT_PERMISSIONS[role ?? ""] ?? PERMISSION_OPTIONS.map((p) => p.key)), "activities.view"]);
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

  const p = resolvePermissions(role, customPermissions);
  const can = (key: PermissionKey) => p.has(key);

  if (hasPathPrefix(path, "/dashboard") || hasPathPrefix(path, "/cierre-caja")) return can("dashboard.view");
  if (hasPathPrefix(path, "/ventas") || hasPathPrefix(path, "/garantias")) return can("sales.view");
  if (hasPathPrefix(path, "/clientes")) return can("customers.view");
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
  const p = resolvePermissions(role, customPermissions);
  const moduleMap: Record<string, PermissionKey> = {
    Inicio: "dashboard.view",
    Ventas: "sales.view",
    Clientes: "customers.view",
    Inventario: "inventory.view",
    Egresos: "expenses.view",
    Roles: "roles.view",
    Sucursales: "branches.view",
    Actividades: "activities.view",
  };
  const required = moduleMap[label];
  return required ? p.has(required) : true;
}
