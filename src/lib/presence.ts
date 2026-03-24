/** Ventana para considerar "En línea" (última actividad reciente). */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function isUserOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < ONLINE_WINDOW_MS;
}

/** Texto corto para UI (es-CO). */
export function formatLastSeenLabel(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return "Sin registro";
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return "—";
  const diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 45) return "Ahora";
  const rtf = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });
  if (diffSec < 3600) return rtf.format(-Math.floor(diffSec / 60), "minute");
  if (diffSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), "hour");
  if (diffSec < 86400 * 7) return rtf.format(-Math.floor(diffSec / 86400), "day");
  return new Date(lastSeenAt).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
