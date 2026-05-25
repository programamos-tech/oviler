/** Filtros compartidos lista de inventario (cliente + API). */

export type StockFilter = "all" | "sin-stock" | "bajo" | "con-stock";
export type StockScope = "total" | "local" | "bodega";
export type StockSplit = { local: number; bodega: number };

export function parseStockStatusOption(v: string): { kind: StockFilter; scope: StockScope } {
  if (v === "all") return { kind: "all", scope: "total" };
  const parts = v.split(":");
  if (parts.length !== 2) return { kind: "all", scope: "total" };
  const [k, s] = parts;
  if (k !== "sin-stock" && k !== "bajo" && k !== "con-stock") return { kind: "all", scope: "total" };
  if (s !== "total" && s !== "local" && s !== "bodega") return { kind: "all", scope: "total" };
  return { kind: k as StockFilter, scope: s as StockScope };
}

export function stockForScope(split: StockSplit | undefined, scope: StockScope): number {
  const s = split ?? { local: 0, bodega: 0 };
  if (scope === "local") return s.local;
  if (scope === "bodega") return s.bodega;
  return s.local + s.bodega;
}

export function matchesStockFilter(
  split: StockSplit | undefined,
  kind: StockFilter,
  scope: StockScope
): boolean {
  if (kind === "all") return true;
  const stock = stockForScope(split, scope);
  if (kind === "sin-stock") return stock === 0;
  if (kind === "bajo") return stock > 0 && stock <= 10;
  return stock > 10;
}

export function buildStockSplitMap(
  rows: Array<{ product_id: string; quantity: number | null; location?: string | null }>
): Record<string, StockSplit> {
  const splitBy: Record<string, StockSplit> = {};
  for (const row of rows) {
    const pid = row.product_id;
    const q = row.quantity ?? 0;
    const loc = row.location;
    if (!splitBy[pid]) splitBy[pid] = { local: 0, bodega: 0 };
    if (loc === "bodega") splitBy[pid].bodega += q;
    else splitBy[pid].local += q;
  }
  return splitBy;
}
