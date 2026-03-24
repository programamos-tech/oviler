/** Suma meses a una fecha ISO (período de licencia). */
export function addMonthsToIso(iso: string, months: number): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return d;
  const copy = new Date(d.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

export function licensePeriodEndIso(licensePeriodStart: string | null, licensePeriodMonths: number): string | null {
  if (!licensePeriodStart || !licensePeriodMonths || licensePeriodMonths < 1) return null;
  return addMonthsToIso(licensePeriodStart, licensePeriodMonths).toISOString();
}

export function billingStatusLabel(s: string): string {
  switch (s) {
    case "paid":
      return "Al día";
    case "pending":
      return "Pendiente";
    case "overdue":
      return "En mora";
    default:
      return s;
  }
}

export function billingStatusClass(s: string): string {
  switch (s) {
    case "paid":
      return "font-bold text-emerald-600 dark:text-emerald-400";
    case "pending":
      return "font-bold text-amber-600 dark:text-amber-400";
    case "overdue":
      return "font-bold text-rose-600 dark:text-rose-400";
    default:
      return "font-medium text-slate-700 dark:text-slate-300";
  }
}

/** Para input type="date" en zona local del navegador. */
export function isoToDateInputLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function dateInputLocalToIso(dateStr: string): string | null {
  const t = dateStr.trim();
  if (!t) return null;
  const parts = t.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

/** `YYYY-MM-DD` → fecha local medianoche (para DatePickerCard). */
export function parseYmdLocal(ymd: string): Date | null {
  const t = ymd.trim();
  if (!t) return null;
  const parts = t.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

/** Fecha local → `YYYY-MM-DD` (guardar en formulario). */
export function dateToYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
