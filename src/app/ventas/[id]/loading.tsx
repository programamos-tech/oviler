export default function VentaDetalleLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-[1200px] space-y-4">
      <div className="h-5 w-40 animate-pulse rounded-md bg-[var(--shell-workspace-search-bg)]" />
      <div className="berea-reports-surface min-h-[320px] animate-pulse rounded-2xl" aria-busy aria-label="Cargando detalle de venta" />
    </div>
  );
}
