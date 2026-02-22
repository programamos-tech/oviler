/**
 * Modo de la sucursal: ventas (retail) o pedidos (restaurante/domicilios).
 * Define copy y etiquetas de estado en la UI.
 */

export type SalesMode = "sales" | "orders";

const LABELS_SALES: Record<string, string> = {
  completed: "Completada",
  cancelled: "Anulada",
  pending: "Pendiente",
  preparing: "En preparación",
  on_the_way: "En camino",
  delivered: "Entregado",
};

const LABELS_ORDERS: Record<string, string> = {
  pending: "Pendiente",
  preparing: "En preparación",
  on_the_way: "En camino",
  delivered: "Entregado",
  completed: "Completada",
  cancelled: "Anulada",
};

export function getStatusLabel(status: string, mode: SalesMode): string {
  const labels = mode === "orders" ? LABELS_ORDERS : LABELS_SALES;
  return labels[status] ?? status;
}

export function getStatusClass(status: string): string {
  if (status === "cancelled") return "text-red-600 dark:text-red-400";
  if (status === "completed" || status === "delivered") return "text-emerald-600 dark:text-emerald-400";
  if (["pending", "preparing", "on_the_way"].includes(status)) return "text-amber-600 dark:text-amber-400";
  return "text-slate-600 dark:text-slate-400";
}

export const COPY = {
  sales: {
    sectionTitle: "Ventas",
    newButton: "Nueva venta",
    emptyTitle: "Aún no hay ventas",
    filterAll: "Todas",
    statusCompleted: "Completada",
    statusCancelled: "Anulada",
  },
  orders: {
    sectionTitle: "Pedidos",
    newButton: "Nuevo pedido",
    emptyTitle: "Aún no hay pedidos",
    filterAll: "Todos",
    statusCompleted: "Completada",
    statusCancelled: "Anulada",
  },
} as const;

export function getCopy(mode: SalesMode) {
  return mode === "orders" ? COPY.orders : COPY.sales;
}

/** Valores de estado para filtro en modo pedidos */
export const ORDER_STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "preparing", label: "En preparación" },
  { value: "on_the_way", label: "En camino" },
  { value: "delivered", label: "Entregado" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Anulada" },
] as const;

/** Valores de estado para filtro en modo ventas */
export const SALES_STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Anulada" },
] as const;
