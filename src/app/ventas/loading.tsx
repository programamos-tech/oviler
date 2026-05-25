export default function VentasLoading() {
  return (
    <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="h-12 w-48 animate-pulse rounded-lg bg-[var(--shell-workspace-search-bg)]" />
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[var(--shell-workspace-search-bg)]" />
      </div>
      <div className="berea-reports-surface min-h-[320px] animate-pulse rounded-xl" aria-busy aria-label="Cargando ventas" />
    </div>
  );
}
