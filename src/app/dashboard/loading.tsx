export default function DashboardLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-5">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-[var(--shell-workspace-search-bg)]" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="grid grid-cols-2 gap-2 lg:col-span-8 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="berea-reports-surface h-[5.25rem] animate-pulse rounded-xl sm:h-[5.5rem]" />
          ))}
        </div>
        <div className="berea-reports-surface min-h-[280px] animate-pulse rounded-xl lg:col-span-4" />
      </div>
      <div className="berea-reports-surface h-72 animate-pulse rounded-xl" aria-busy aria-label="Cargando reportes" />
    </div>
  );
}
