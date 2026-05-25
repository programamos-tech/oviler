export default function ClienteDetalleLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8">
      <div className="min-h-[280px] animate-pulse rounded-2xl bg-white dark:bg-slate-900" aria-busy aria-label="Cargando cliente" />
    </div>
  );
}
