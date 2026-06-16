/** Normaliza IMEI: solo dígitos. */
export function normalizeImei(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** IMEI estándar: 15 dígitos numéricos. */
export function isValidImei(raw: string): boolean {
  const norm = normalizeImei(raw);
  return norm.length === 15;
}

export function formatImeiDisplay(raw: string): string {
  const norm = normalizeImei(raw);
  if (norm.length !== 15) return raw.trim();
  return `${norm.slice(0, 8)}-${norm.slice(8, 14)}-${norm.slice(14)}`;
}

/** Parsea texto multilínea o separado por comas en lista de IMEIs. */
export function parseImeiList(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Resuelve IDs de unidades a partir de texto IMEI y catálogo en stock. */
export function resolveImeiUnitIdsFromText(
  units: Array<{ id: string; imei: string }>,
  text: string
): { ids: string[]; missing: string[] } {
  const byNorm = new Map(units.map((u) => [normalizeImei(u.imei), u.id]));
  const ids: string[] = [];
  const missing: string[] = [];
  for (const raw of parseImeiList(text)) {
    const norm = normalizeImei(raw);
    const id = byNorm.get(norm);
    if (id) ids.push(id);
    else missing.push(raw);
  }
  return { ids: [...new Set(ids)], missing };
}

export type ProductImeiUnitRow = {
  id: string;
  imei: string;
  imei_normalized: string;
  status: "in_stock" | "sold" | "warranty" | "defective" | "returned" | "removed";
  product_id: string;
  branch_id: string;
  sale_id: string | null;
  sale_item_id: string | null;
  sold_at: string | null;
};
