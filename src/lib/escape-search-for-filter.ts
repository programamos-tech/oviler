/** Escapa el término para filtros `.or(ilike)` de Supabase (evita romper la query con % _ \ o coma). */
export function escapeSearchForFilter(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, " ");
}
