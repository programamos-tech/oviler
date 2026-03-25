/**
 * Acceso al panel interno NOU (/interno, /api/internal/*).
 * Configura NOU_INTERNAL_EMAILS en el servidor (emails separados por coma, sin espacios obligatorios).
 */
export function parseNouInternalEmailSet(): Set<string> {
  const raw = process.env.NOU_INTERNAL_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Cantidad de emails en allowlist (para diagnóstico; no expone valores). */
export function getNouInternalAllowlistSize(): number {
  return parseNouInternalEmailSet().size;
}

export function isNouInternalStaff(email: string | undefined | null): boolean {
  const allowed = parseNouInternalEmailSet();
  if (allowed.size === 0) return false;
  if (!email) return false;
  return allowed.has(email.trim().toLowerCase());
}
