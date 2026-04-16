import Link from "next/link";

export default function CatalogoPage() {
  return (
    <div className="mx-auto min-w-0 max-w-[1100px] space-y-6 font-sans text-[13px] text-slate-800 antialiased dark:text-slate-100">
      <header className="rounded-2xl bg-white px-5 py-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
          Catálogo
        </h1>
        <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          Estamos ajustando este módulo para dejarlo más sólido antes de activarlo.
        </p>
      </header>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-6 dark:border-slate-700 dark:bg-slate-900 sm:px-6 sm:py-7">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          En construcción
        </div>
        <h2 className="mt-3 text-[16px] font-semibold text-slate-900 dark:text-slate-50">
          ¿Qué puedes hacer mientras tanto?
        </h2>
        <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300">
          Ya puedes operar normalmente tu negocio desde los demás módulos mientras terminamos Catálogo.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/creditos"
            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
          >
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Créditos</p>
            <p className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-300">Crear, consultar y hacer seguimiento de cartera.</p>
          </Link>

          <Link
            href="/ventas"
            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
          >
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Ventas</p>
            <p className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-300">Facturar y controlar pedidos desde el canal principal.</p>
          </Link>

          <Link
            href="/clientes"
            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
          >
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Clientes</p>
            <p className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-300">Administrar base de clientes y datos de contacto.</p>
          </Link>

          <Link
            href="/productos"
            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
          >
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Productos</p>
            <p className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-300">Preparar inventario y fichas para publicar luego en catálogo.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
