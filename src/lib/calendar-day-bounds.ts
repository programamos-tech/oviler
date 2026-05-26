/** Límites de día calendario en hora local del navegador (medianoche a 23:59:59.999). */

export function startOfLocalCalendarDay(ref: Date = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
}

export function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getLocalCalendarDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ISO UTC para filtros `created_at` en Supabase (timestamptz). */
export function getLocalCalendarDayBounds(date: Date): { start: string; end: string } {
  const day = startOfLocalCalendarDay(date);
  const start = new Date(day);
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function isTimestampInRange(iso: string, rangeStart: string, rangeEnd: string): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= new Date(rangeStart).getTime() && t <= new Date(rangeEnd).getTime();
}

export function isTimestampInLocalCalendarDay(iso: string, day: Date): boolean {
  const { start, end } = getLocalCalendarDayBounds(day);
  return isTimestampInRange(iso, start, end);
}

/** Filtra filas con `created_at` al rango [start, end] (ISO). */
export function filterRowsByCreatedAtRange<T extends { created_at: string }>(
  rows: T[],
  rangeStart: string,
  rangeEnd: string
): T[] {
  return rows.filter((row) => isTimestampInRange(row.created_at, rangeStart, rangeEnd));
}
