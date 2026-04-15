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

/** Factura en tienda (sin envío): estados legibles en femenino. */
const LABELS_INVOICE: Record<string, string> = {
  pending: "Pendiente",
  completed: "Finalizada",
  cancelled: "Anulada",
};

/** Pedido con envío: Creado → En alistamiento → Despachado → Finalizado. (`packing` legacy se muestra como En alistamiento.) */
const LABELS_ORDERS: Record<string, string> = {
  pending: "Creado",
  preparing: "En alistamiento",
  packing: "En alistamiento",
  on_the_way: "Despachado",
  delivered: "Finalizado",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

export function getStatusLabel(status: string, mode: SalesMode): string {
  const labels = mode === "orders" ? LABELS_ORDERS : LABELS_SALES;
  return labels[status] ?? status;
}

/** Etiqueta de estado según tipo de documento (factura en tienda vs pedido con envío). */
export function getStatusLabelForSale(status: string, isDelivery: boolean): string {
  if (isDelivery) {
    return LABELS_ORDERS[status] ?? LABELS_SALES[status] ?? status;
  }
  return LABELS_INVOICE[status] ?? LABELS_SALES[status] ?? status;
}

/** Alinea estados legacy del backend con la opción del menú (sin fila "Alistado"). */
export function orderStatusOptionMatchesSale(saleStatus: string, optValue: string): boolean {
  if (optValue === saleStatus) return true;
  if (saleStatus === "packing" && optValue === "preparing") return true;
  if (saleStatus === "delivered" && optValue === "completed") return true;
  return false;
}

export type DocumentCopy = {
  newButton: string;
  confirmButton: string;
  cap: string;
  hashTitle: (invoiceNum: string) => string;
  loading: string;
  notFound: string;
  stateHeading: string;
  productsHeading: string;
  productsEmpty: string;
  addProductTitle: string;
  errAlreadyIn: string;
  searchDup: string;
  cancelTitle: string;
  cancelBodyAsk: (invoiceNum: string) => string;
  cancelBodyApproval: (invoiceNum: string) => string;
  cancelAria: (invoiceNum: string) => string;
  printTitle: string;
  printBadge: string;
  printH1: (invoiceNum: string) => string;
  printNumberLabel: string;
  createFailed: string;
  createError: string;
};

/** Textos de UI: factura (mostrador) vs pedido (envío). */
export function getDocumentCopy(isDelivery: boolean): DocumentCopy {
  if (isDelivery) {
    return {
      newButton: "Nuevo pedido",
      confirmButton: "Confirmar pedido",
      cap: "Pedido",
      hashTitle: (n) => `Pedido #${n}`,
      loading: "Cargando pedido…",
      notFound: "Pedido no encontrado.",
      stateHeading: "Estado del pedido",
      productsHeading: "Productos del pedido",
      productsEmpty: "Sin productos en este pedido",
      addProductTitle: "Agregar producto al pedido",
      errAlreadyIn: "Este producto ya está en el pedido.",
      searchDup: "Los resultados ya están en el pedido",
      cancelTitle: "Anular pedido",
      cancelBodyAsk: (n) =>
        `¿Anular el pedido #${n}? El pedido quedará en estado "Cancelado" y no se podrá revertir desde esta pantalla.`,
      cancelBodyApproval: (n) =>
        `La anulación del pedido #${n} requerirá aprobación de un administrador. Escribe el motivo de la solicitud.`,
      cancelAria: (n) => `Anular pedido ${n}`,
      printTitle: "Pedido",
      printBadge: "Pedido",
      printH1: (n) => `Pedido n.º ${n}`,
      printNumberLabel: "Nº Pedido",
      createFailed: "No se creó el pedido",
      createError: "Error al crear el pedido",
    };
  }
  return {
    newButton: "Nueva factura",
    confirmButton: "Confirmar factura",
    cap: "Factura",
    hashTitle: (n) => `Factura #${n}`,
    loading: "Cargando factura…",
    notFound: "Factura no encontrada.",
    stateHeading: "Estado de la factura",
    productsHeading: "Productos de la factura",
    productsEmpty: "Sin productos en esta factura",
    addProductTitle: "Agregar producto a la factura",
    errAlreadyIn: "Este producto ya está en la factura.",
    searchDup: "Los resultados ya están en la factura",
    cancelTitle: "Anular factura",
    cancelBodyAsk: (n) =>
      `¿Anular la factura #${n}? La factura quedará en estado "Anulada" y no se podrá revertir desde esta pantalla.`,
    cancelBodyApproval: (n) =>
      `La anulación de la factura #${n} requerirá aprobación de un administrador. Escribe el motivo de la solicitud.`,
    cancelAria: (n) => `Anular factura ${n}`,
    printTitle: "Factura de venta",
    printBadge: "Factura de venta",
    printH1: (n) => `Factura de venta No. ${n}`,
    printNumberLabel: "Nº Factura",
    createFailed: "No se creó la factura",
    createError: "Error al crear la factura",
  };
}

export function getStatusClass(status: string): string {
  if (status === "cancelled") return "text-red-600 dark:text-red-400";
  if (status === "completed" || status === "delivered") return "text-emerald-600 dark:text-emerald-400";
  if (status === "pending") return "text-nou-600 dark:text-nou-400 font-semibold";
  if (["preparing", "packing", "on_the_way"].includes(status)) return "text-amber-600 dark:text-amber-400";
  return "text-slate-600 dark:text-slate-400";
}

const LIST_CHIP_BASE =
  "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-left text-[12px] font-medium leading-tight";

/** Chip sobrio para columna Estado en listados (menos ruido que texto plano coloreado). */
export function getStatusListChipClass(status: string): string {
  if (status === "cancelled") {
    return `${LIST_CHIP_BASE} border-red-200/90 bg-red-50/90 text-red-800 dark:border-red-900/55 dark:bg-red-950/35 dark:text-red-200`;
  }
  if (status === "completed" || status === "delivered") {
    return `${LIST_CHIP_BASE} border-nou-200 bg-nou-50 text-nou-900 dark:border-emerald-900/45 dark:bg-emerald-950/30 dark:text-emerald-100`;
  }
  if (status === "pending") {
    return `${LIST_CHIP_BASE} border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200`;
  }
  if (["preparing", "packing", "on_the_way"].includes(status)) {
    return `${LIST_CHIP_BASE} border-amber-200/80 bg-amber-50/70 text-amber-950 dark:border-amber-900/45 dark:bg-amber-950/25 dark:text-amber-100`;
  }
  return `${LIST_CHIP_BASE} border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300`;
}

/** Chip neutro para forma de pago en listados. */
export function getPaymentListChipClass(): string {
  return `${LIST_CHIP_BASE} border-slate-200/90 bg-slate-50/95 text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200`;
}

export const COPY = {
  sales: {
    sectionTitle: "Ventas",
    newButton: "Nueva factura",
    confirmButton: "Confirmar factura",
    emptyTitle: "Aún no hay ventas",
    filterAll: "Todas",
    statusCompleted: "Finalizada",
    statusCancelled: "Anulada",
  },
  orders: {
    sectionTitle: "Ventas",
    newButton: "Nueva factura",
    confirmButton: "Confirmar factura",
    emptyTitle: "Aún no hay ventas",
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
  { value: "on_the_way", label: "Despachado" },
  { value: "completed", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

/** Valores de estado para filtro en modo ventas (factura en tienda) */
export const SALES_STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendiente" },
  { value: "completed", label: "Finalizada" },
  { value: "cancelled", label: "Anulada" },
] as const;
