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

/** Email dueño NOU: no requiere activar clave de licencia ni bloqueo por trial/suscripción. */
const DEFAULT_SUPERADMIN_LICENSE_EMAIL = "programamos.st@gmail.com";

/**
 * Exención de licencia (modal "Activa tu licencia") y de `/acceso-bloqueado` por trial/suspensión.
 * - `NOU_SUPERADMIN_EMAIL` (opcional) en servidor
 * - Por defecto: cuenta dueña NOU
 * - También: `NOU_INTERNAL_EMAILS` (mismo criterio que panel interno)
 */
export function isSuperAdminLicenseExempt(email: string | undefined | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  const configured = process.env.NOU_SUPERADMIN_EMAIL?.trim().toLowerCase();
  if (configured && e === configured) return true;
  if (e === DEFAULT_SUPERADMIN_LICENSE_EMAIL) return true;
  return isNouInternalStaff(email);
}
