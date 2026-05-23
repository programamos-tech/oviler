/** Helpers UI / agregados para el dashboard estilo Berea (sin queries extra). */

/** Filas mostradas en tarjetas del dashboard (actividades, pedidos, más vendidos). */
export const DASHBOARD_CARD_ITEM_LIMIT = 5;

export type TopSoldProduct = {
  id: string;
  name: string;
  units: number;
  total: number;
};

export function lineTotalFromSaleItem(item: {
  quantity: number;
  unit_price: number;
  discount_percent?: number | null;
  discount_amount?: number | null;
}): number {
  return Math.max(
    0,
    Math.round(
      item.quantity * Number(item.unit_price) * (1 - Number(item.discount_percent || 0) / 100) -
        Number(item.discount_amount || 0)
    )
  );
}

export function aggregateTopSoldProducts(
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_percent?: number | null;
    discount_amount?: number | null;
    products?: { name?: string } | null;
  }>,
  limit = DASHBOARD_CARD_ITEM_LIMIT
): TopSoldProduct[] {
  const byProduct: Record<string, TopSoldProduct> = {};
  for (const it of items) {
    const productId = String(it.product_id ?? "").trim();
    if (!productId) continue;
    const lineTotal = lineTotalFromSaleItem(it);
    const name = it.products?.name ?? "—";
    if (!byProduct[productId]) {
      byProduct[productId] = { id: productId, name, units: 0, total: 0 };
    }
    byProduct[productId].units += Number(it.quantity ?? 0);
    byProduct[productId].total += lineTotal;
  }
  return Object.values(byProduct)
    .sort((a, b) => b.units - a.units || b.total - a.total || a.name.localeCompare(b.name, "es"))
    .slice(0, limit);
}

export type DashboardChannelSlice = {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
};

export type DashboardPaymentSlice = {
  key: "cash" | "transfer" | "mixed";
  label: string;
  value: number;
  percent: number;
  color: string;
};

const CHANNEL_COLORS = {
  store: "#5c4a3a",
  online: "#7a8f6a",
  delivery: "#a89279",
  other: "#d4c4b0",
} as const;

const PAYMENT_COLORS = {
  cash: "#5c4a3a",
  transfer: "#7a8f6a",
  mixed: "#a89279",
} as const;

type SaleChannelRow = {
  total: number;
  delivery_fee?: number | null;
  is_delivery?: boolean | null;
  channel?: string | null;
  payment_pending?: boolean | null;
  status?: string;
  payment_method?: string | null;
};

export function storeIncomeFromSale(s: SaleChannelRow): number {
  const df = Number(s.delivery_fee) || 0;
  return Math.max(0, Number(s.total) - df);
}

export function computeChannelMix(completed: SaleChannelRow[]): DashboardChannelSlice[] {
  let store = 0;
  let online = 0;
  let delivery = 0;
  let other = 0;

  for (const s of completed) {
    if (s.payment_pending || s.status !== "completed") continue;
    const income = storeIncomeFromSale(s);
    if (s.channel === "web_catalog") online += income;
    else if (s.is_delivery) delivery += income;
    else if (!s.is_delivery) store += income;
    else other += income;
  }

  const total = store + online + delivery + other;
  const raw = [
    { key: "store", label: "Tienda física", value: store, color: CHANNEL_COLORS.store },
    { key: "online", label: "Tienda en línea", value: online, color: CHANNEL_COLORS.online },
    { key: "delivery", label: "Domicilio", value: delivery, color: CHANNEL_COLORS.delivery },
    { key: "other", label: "Otros", value: other, color: CHANNEL_COLORS.other },
  ].filter((x) => x.value > 0);

  if (total <= 0) {
    return [{ key: "store", label: "Sin ventas", value: 0, percent: 100, color: CHANNEL_COLORS.other }];
  }

  return raw.map((x) => ({
    ...x,
    percent: Math.round((x.value / total) * 1000) / 10,
  }));
}

/** Ingreso tienda por forma de pago (efectivo / transferencia / mixto), sin repartir el mixto. */
export function computePaymentMix(
  completed: SaleChannelRow[],
  abonos: Array<{ amount: number; payment_method: string; payment_source?: string | null }> = []
): DashboardPaymentSlice[] {
  let cash = 0;
  let transfer = 0;
  let mixed = 0;

  for (const s of completed) {
    if (s.payment_pending || s.status !== "completed") continue;
    const income = storeIncomeFromSale(s);
    const pm = String(s.payment_method ?? "");
    if (pm === "cash") cash += income;
    else if (pm === "transfer") transfer += income;
    else if (pm === "mixed") mixed += income;
  }

  for (const p of abonos) {
    if (p.payment_source === "warranty_refund") continue;
    const amt = Number(p.amount) || 0;
    if (amt <= 0) continue;
    const pm = String(p.payment_method ?? "");
    if (pm === "cash") cash += amt;
    else if (pm === "transfer") transfer += amt;
    else if (pm === "mixed") mixed += amt;
  }

  const total = cash + transfer + mixed;
  const slices: Array<Omit<DashboardPaymentSlice, "percent">> = [
    { key: "cash", label: "Efectivo", value: cash, color: PAYMENT_COLORS.cash },
    { key: "transfer", label: "Transferencia", value: transfer, color: PAYMENT_COLORS.transfer },
    { key: "mixed", label: "Mixto", value: mixed, color: PAYMENT_COLORS.mixed },
  ];

  if (total <= 0) {
    return slices.map((x) => ({ ...x, percent: 0 }));
  }

  return slices.map((x) => ({
    ...x,
    percent: Math.round((x.value / total) * 1000) / 10,
  }));
}

export function saleChannelLabel(s: {
  channel?: string | null;
  is_delivery?: boolean | null;
  payment_pending?: boolean | null;
}): string {
  if (s.channel === "web_catalog") return "Tienda en línea";
  if (s.is_delivery) return "Domicilio";
  if (s.payment_pending) return "Crédito";
  return "Tienda física";
}

export function saleStatusLabel(status: string): string {
  if (status === "completed") return "Completado";
  if (status === "cancelled") return "Cancelado";
  if (status === "pending") return "Procesando";
  return status;
}

export function saleStatusTone(status: string): "success" | "warning" | "info" | "danger" {
  if (status === "completed") return "success";
  if (status === "cancelled") return "danger";
  if (status === "pending") return "warning";
  return "info";
}

export function relativeTimeEs(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

export type DashboardActivityKind =
  | "sale"
  | "credit"
  | "customer"
  | "product"
  | "category"
  | "expense"
  | "warranty"
  | "user"
  | "system";

export type DashboardActivity = {
  id: string;
  title: string;
  detail: string;
  at: string;
  rel: string;
  kind: DashboardActivityKind;
};

export type SystemActivityRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  created_at: string;
  actor_type?: string;
  metadata?: Record<string, unknown> | null;
  users?: { name: string } | Array<{ name: string }> | null;
};

const ACTION_LABELS_ES: Record<string, string> = {
  sale_created: "Nueva venta",
  sale_status_updated: "Estado de venta",
  sale_cancelled: "Venta anulada",
  customer_created: "Nuevo cliente",
  customer_updated: "Cliente actualizado",
  product_created: "Nuevo producto",
  product_updated: "Producto actualizado",
  category_created: "Nueva categoría",
  stock_adjusted: "Stock actualizado",
  stock_transferred: "Transferencia de stock",
  credit_payment: "Abono recibido",
  credit_cancelled: "Crédito anulado",
  expense_created: "Egreso registrado",
  warranty_processed: "Garantía procesada",
  user_created: "Nuevo colaborador",
};

function activityKindFromRow(row: Pick<SystemActivityRow, "entity_type" | "action">): DashboardActivityKind {
  if (row.entity_type === "sale") return "sale";
  if (row.entity_type === "credit") return "credit";
  if (row.entity_type === "customer") return "customer";
  if (row.entity_type === "product") return "product";
  if (row.entity_type === "category") return "category";
  if (row.entity_type === "user") return "user";
  if (row.entity_type === "warranty" || row.action.includes("warranty")) return "warranty";
  if (row.entity_type === "expense") return "expense";
  return "system";
}

function activityTitleFromRow(row: Pick<SystemActivityRow, "action" | "entity_type">): string {
  if (ACTION_LABELS_ES[row.action]) return ACTION_LABELS_ES[row.action];
  if (row.action === "sale_cancelled") return "Devolución / anulación";
  const human = row.action.replace(/_/g, " ").trim();
  if (!human) return "Actividad";
  return human.charAt(0).toUpperCase() + human.slice(1);
}

function mapSystemActivityRow(row: SystemActivityRow): DashboardActivity {
  const user = Array.isArray(row.users) ? row.users[0] : row.users;
  const actor = user?.name?.trim();
  const detail =
    actor && row.actor_type !== "system" && !row.summary.includes(actor)
      ? `${row.summary} · ${actor}`
      : row.summary;

  return {
    id: `act-${row.id}`,
    title: activityTitleFromRow(row),
    detail,
    at: row.created_at,
    rel: relativeTimeEs(row.created_at),
    kind: activityKindFromRow(row),
  };
}

export function mergeDashboardActivityFeed(input: {
  systemActivities: SystemActivityRow[];
  sales: Array<{
    id: string;
    invoice_number: string;
    total: number;
    delivery_fee?: number | null;
    created_at: string;
    customers?: { name: string } | Array<{ name: string }> | null;
  }>;
  creditPayments: Array<{
    amount: number;
    created_at: string;
    customer_credits?:
      | { public_ref: string }
      | Array<{ public_ref: string }>
      | null;
  }>;
  expenses: Array<{ amount: number; concept?: string | null; created_at: string }>;
  warranties?: Array<{ id: string; warranty_type?: string | null; created_at: string }>;
  limit?: number;
}): DashboardActivity[] {
  const limit = input.limit ?? DASHBOARD_CARD_ITEM_LIMIT;
  const out: DashboardActivity[] = [];
  const seen = new Set<string>();
  const coveredSaleIds = new Set<string>();

  const push = (item: DashboardActivity) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  };

  for (const row of input.systemActivities) {
    push(mapSystemActivityRow(row));
    if (row.entity_type === "sale" && row.entity_id) coveredSaleIds.add(row.entity_id);
  }

  for (const w of input.warranties ?? []) {
    const typeLabel =
      w.warranty_type === "refund"
        ? "Devolución"
        : w.warranty_type === "replacement"
          ? "Cambio"
          : "Garantía";
    push({
      id: `warranty-${w.id}`,
      title: `${typeLabel} procesada`,
      detail: "Garantía registrada en el sistema",
      at: w.created_at,
      rel: relativeTimeEs(w.created_at),
      kind: "warranty",
    });
  }

  for (const e of input.expenses) {
    const concept = String(e.concept ?? "Gasto");
    push({
      id: `exp-${e.created_at}-${concept}`,
      title: "Egreso registrado",
      detail: `${concept} · $${Number(e.amount).toLocaleString("es-CO")}`,
      at: e.created_at,
      rel: relativeTimeEs(e.created_at),
      kind: "expense",
    });
  }

  for (const p of input.creditPayments) {
    const c = p.customer_credits;
    const ref = (Array.isArray(c) ? c[0]?.public_ref : c?.public_ref) ?? "";
    push({
      id: `pay-${p.created_at}-${ref || "cr"}`,
      title: "Abono recibido",
      detail: `Crédito ${ref || "—"} · $${Number(p.amount).toLocaleString("es-CO")}`,
      at: p.created_at,
      rel: relativeTimeEs(p.created_at),
      kind: "credit",
    });
  }

  for (const s of input.sales) {
    if (coveredSaleIds.has(s.id)) continue;
    const c = s.customers;
    const name = (Array.isArray(c) ? c[0]?.name : c?.name) ?? "Cliente";
    const income = storeIncomeFromSale(s);
    push({
      id: `sale-${s.id}`,
      title: `Venta #${s.invoice_number}`,
      detail: `${name} · $${income.toLocaleString("es-CO")}`,
      at: s.created_at,
      rel: relativeTimeEs(s.created_at),
      kind: "sale",
    });
  }

  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}

/** @deprecated Usar mergeDashboardActivityFeed */
export function buildRecentActivities(
  input: Parameters<typeof mergeDashboardActivityFeed>[0]
): DashboardActivity[] {
  return mergeDashboardActivityFeed(input);
}

/** Mini sparkline SVG path from daily values (0..n). */
export function sparklinePath(values: number[], width = 72, height = 28): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function conicGradientFromChannels(
  slices: Array<{ percent: number; color: string; value?: number }>
): string {
  if (slices.length === 0 || slices.every((s) => (s.value ?? 0) <= 0)) {
    return CHANNEL_COLORS.other;
  }
  let cursor = 0;
  const stops: string[] = [];
  for (const s of slices) {
    const end = cursor + s.percent;
    stops.push(`${s.color} ${cursor}% ${end}%`);
    cursor = end;
  }
  return `conic-gradient(${stops.join(", ")})`;
}
