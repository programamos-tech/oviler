export default function CreditoDetalleLoading() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 sm:px-6 lg:px-8">
      <div className="min-h-[200px] animate-pulse rounded-xl bg-white dark:bg-slate-900" aria-busy aria-label="Cargando crédito" />
    </div>
  );
}
