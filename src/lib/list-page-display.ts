/** Skeleton solo si la sesión está lista, pedimos datos y no hay filas (estado ni caché). */
export function shouldShowListSkeleton(
  loading: boolean,
  visibleRowCount: number,
  sessionReady: boolean
): boolean {
  return sessionReady && loading && visibleRowCount === 0;
}

export function visibleRowsFromCache<T>(stateRows: T[], cachedRows: T[] | null | undefined): T[] {
  if (stateRows.length > 0) return stateRows;
  return cachedRows ?? [];
}

export function visibleCountFromCache(stateCount: number, cachedCount: number | null | undefined): number {
  if (stateCount > 0) return stateCount;
  return cachedCount ?? 0;
}
