/**
 * Normaliza cédula para comparación y unicidad (misma lógica que columna `cedula_norm` en DB).
 * Si hay ≥5 dígitos, se usa solo la cadena numérica (así "1102867002" coincide con "CC 1102867002").
 * Si no, minúsculas y espacios colapsados a uno.
 */
export function normalizeCedulaForUniqueness(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 5) return digits;
  return t.toLowerCase().replace(/\s+/g, " ");
}

/** Valor a guardar en `customers.cedula`: trim + espacios colapsados (conserva mayúsculas/minúsculas del usuario). */
export function formatCedulaForStorage(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim().replace(/\s+/g, " ");
  return t === "" ? null : t;
}
