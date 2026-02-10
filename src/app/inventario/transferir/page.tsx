import Link from "next/link";

export default function TransferStockPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Transferir stock
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Mueve unidades entre ubicaciones o bodegas en un solo lugar.
            </p>
          </div>
          <Link
            href="/inventario"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a inventario"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Origen y destino
            </p>
            <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Buscar producto
            </label>
            <div className="mt-2">
              <input
                placeholder="Buscar por nombre o código"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
              Selecciona el producto del cual transferirás unidades.
            </p>

            <label className="mt-4 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Desde (origen)
            </label>
            <div className="mt-2">
              <input
                placeholder="Ej. Bodega principal"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <label className="mt-4 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Hacia (destino)
            </label>
            <div className="mt-2">
              <input
                placeholder="Ej. Punto de venta"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <label className="mt-4 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Cantidad a transferir
            </label>
            <div className="mt-2">
              <input
                type="number"
                min={0}
                placeholder="0"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
              El stock se descontará del origen y se sumará al destino.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen de la transferencia
            </p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">Producto</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">Selecciona un producto</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">Origen</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">Selecciona ubicación origen</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">Destino</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">Selecciona ubicación destino</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-medium">Cantidad a transferir</span>
                <span className="font-bold">0 unidades</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="space-y-3">
              <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p className="font-bold text-slate-700 dark:text-slate-100">Paso final</p>
                <p className="mt-1">
                  Cuando confirmes, se descontará el stock del origen y se sumará al destino.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                Transferir
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
