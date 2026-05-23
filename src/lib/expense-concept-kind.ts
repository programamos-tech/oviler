export type ExpenseConceptKind = "inventory" | "operating";

const INVENTORY_PATTERNS = [/inventario/i, /mercanc[ií]a/i, /proveedor/i, /insumos/i];

export function getExpenseConceptKind(concept: string): ExpenseConceptKind {
  const normalized = concept.trim();
  if (!normalized) return "operating";
  if (INVENTORY_PATTERNS.some((pattern) => pattern.test(normalized))) return "inventory";
  return "operating";
}

export const EXPENSE_KIND_LABELS: Record<ExpenseConceptKind, string> = {
  inventory: "Inventario",
  operating: "Operativo",
};

export const EXPENSE_KIND_BADGE_STYLES: Record<ExpenseConceptKind, string> = {
  inventory: "bg-sky-50 text-sky-800 ring-sky-200/80",
  operating: "bg-amber-50 text-amber-900 ring-amber-200/80",
};
