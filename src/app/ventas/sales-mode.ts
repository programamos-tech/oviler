/**
 * Modo de la sucursal: ventas (retail) o pedidos (restaurante/envíos).
 * Define copy y etiquetas de estado en la UI.
 */

export type SalesMode = "sales" | "orders";

/** Etiquetas de estado en modo iglesia/ingresos (aporte registrado, completado, anulado) */
const LABELS_SALES: Record<string, string> = {
  completed: "Completado",
  cancelled: "Anulado",
  pending: "Registrado",
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
    sectionTitle: "Ingresos",
    newButton: "Nuevo registro",
    confirmButton: "Confirmar registro",
    emptyTitle: "Aún no hay ingresos",
    filterAll: "Todos",
    statusCompleted: "Completado",
    statusCancelled: "Anulado",
    detailTitle: "Ingreso",
    subtitle: "Miembro, tipo de ingreso y monto.",
    clientLabel: "Miembro",
    newClientLabel: "Nuevo miembro",
    clientSearchPlaceholder: "Buscar por nombre, cédula, email o teléfono",
    paymentSectionLabel: "Forma de entrega",
    productsSectionTitle: "Detalle del aporte",
    noProductsMessage: "Aporte registrado (monto único, sin productos).",
    listSubtitle: "Registro de aportes e ingresos. Busca por número, miembro o tipo de ingreso y filtra por estado o forma de entrega.",
    searchPlaceholder: "Buscar por registro, miembro o tipo de ingreso…",
    filterStatusLabel: "Estado",
    filterPaymentLabel: "Forma de pago",
    tableHeaderOrder: "Registro",
    tableHeaderDate: "Fecha",
    tableHeaderClient: "Miembro",
    tableHeaderType: "Tipo",
    tableHeaderPayment: "Forma de entrega",
    tableHeaderStatus: "Estado",
    tableHeaderTotal: "Total",
    tableHeaderActions: "Acciones",
    customerFallback: "Sin miembro",
  },
  orders: {
    sectionTitle: "Ingresos",
    newButton: "Nuevo registro",
    confirmButton: "Confirmar registro",
    emptyTitle: "Aún no hay ingresos",
    filterAll: "Todos",
    statusCompleted: "Finalizado",
    statusCancelled: "Cancelado",
    detailTitle: "Pedido",
    subtitle: "Cliente, tipo de ingreso (opcional), productos y método de pago.",
    clientLabel: "Cliente",
    newClientLabel: "Nuevo cliente",
    clientSearchPlaceholder: "Buscar por nombre, cédula, email o teléfono",
    paymentSectionLabel: "Método de pago",
    productsSectionTitle: "Productos del pedido",
    noProductsMessage: "Sin productos en este pedido",
    listSubtitle: "Lista de pedidos de la sucursal. Busca por pedido o cliente y filtra por estado o forma de pago.",
    searchPlaceholder: "Buscar por pedido o cliente…",
    filterStatusLabel: "Estado",
    filterPaymentLabel: "Pago",
    tableHeaderOrder: "Pedido",
    tableHeaderDate: "Fecha",
    tableHeaderClient: "Cliente",
    tableHeaderType: "Tipo",
    tableHeaderPayment: "Pago",
    tableHeaderStatus: "Estado",
    tableHeaderTotal: "Total",
    tableHeaderActions: "Acciones",
    customerFallback: "Cliente final",
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

/** Valores de estado para filtro en modo ventas (iglesia) */
export const SALES_STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Registrado" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Anulado" },
] as const;
