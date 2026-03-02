/**
 * Modo de la sucursal: ventas (retail) o pedidos (restaurante/envíos).
 * Define copy y etiquetas de estado en la UI.
 */

export type SalesMode = "sales" | "orders";

const LABELS_SALES: Record<string, string> = {
  completed: "Completada",
  cancelled: "Anulada",
  pending: "Pendiente",
  preparing: "En preparación",
  packing: "Empacando",
  on_the_way: "En camino",
  delivered: "Entregado",
};

/** Estados del pedido: Creado → En alistamiento (picking+packing) → Alistado → Despachado → Finalizado. Cancelado = anulación. */
const LABELS_ORDERS: Record<string, string> = {
  pending: "Creado",
  preparing: "En alistamiento",
  packing: "Alistado",
  on_the_way: "Despachado",
  delivered: "Entregado",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

export function getStatusLabel(status: string, mode: SalesMode): string {
  const labels = mode === "orders" ? LABELS_ORDERS : LABELS_SALES;
  return labels[status] ?? status;
}

export function getStatusClass(status: string): string {
  if (status === "cancelled") return "text-red-600 dark:text-red-400";
  if (status === "completed" || status === "delivered") return "text-emerald-600 dark:text-emerald-400";
  if (status === "pending") return "text-sky-600 dark:text-sky-400 font-semibold";
  if (["preparing", "packing", "on_the_way"].includes(status)) return "text-amber-600 dark:text-amber-400";
  return "text-slate-600 dark:text-slate-400";
}

export const COPY = {
  sales: {
    sectionTitle: "Pedidos",
    newButton: "Nuevo pedido",
    confirmButton: "Confirmar pedido",
    emptyTitle: "Aún no hay pedidos",
    filterAll: "Todas",
    statusCompleted: "Completada",
    statusCancelled: "Anulada",
  },
  orders: {
    sectionTitle: "Pedidos",
    newButton: "Nuevo pedido",
    confirmButton: "Confirmar pedido",
    emptyTitle: "Aún no hay pedidos",
    filterAll: "Todos",
    statusCompleted: "Finalizado",
    statusCancelled: "Cancelado",
  },
} as const;

export function getCopy(mode: SalesMode) {
  return mode === "orders" ? COPY.orders : COPY.sales;
}

/** Valores de estado para filtro en modo pedidos */
export const ORDER_STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Creado" },
  { value: "preparing", label: "En alistamiento" },
  { value: "packing", label: "Alistado" },
  { value: "on_the_way", label: "Despachado" },
  { value: "completed", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

/** Valores de estado para filtro en modo ventas */
export const SALES_STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Anulada" },
] as const;
