import Link from "next/link";

export default function NewWarrantyPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Nueva garantía
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registra una nueva garantía: cliente, producto y motivo en un solo lugar.
            </p>
          </div>
          <Link
            href="/garantias"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a garantías"
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

      {/* Formulario de nueva garantía */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          {/* Cliente */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Cliente
            </p>
            <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Buscar por nombre o teléfono
            </label>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="relative flex-1">
                <input
                  disabled
                  placeholder="Ej. María López 312 000 0000"
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  Próximo
                </span>
              </div>
              <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                Nuevo cliente
              </button>
            </div>
            <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
              Cuando selecciones un cliente, verás aquí su información y historial de compras.
            </p>
          </div>

          {/* Producto */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Producto
            </p>
            <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Buscar producto comprado
            </label>
            <div className="mt-2">
              <input
                disabled
                placeholder="Buscar por nombre o código"
                className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
              Selecciona el producto por el cual se solicita la garantía.
            </p>
          </div>

          {/* Motivo de la garantía */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Motivo de la garantía
            </p>
            <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Describe el problema o motivo
            </label>
            <textarea
              disabled
              rows={4}
              placeholder="Ej. El producto presenta defecto de fábrica. El aceite tiene una fuga en el envase."
              className="mt-2 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <div className="mt-3">
              <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Tipo de garantía
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  Cambio
                </button>
                <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  Devolución
                </button>
                <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  Reparación
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Resumen */}
        <div className="space-y-4">
          {/* Resumen de la garantía */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen de la garantía
            </p>

            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  Cliente
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Selecciona un cliente
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  Producto
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Selecciona un producto
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  Tipo
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Selecciona un tipo
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-medium">Valor del producto</span>
                <span className="font-bold">$0</span>
              </div>
              <div className="flex items-center justify-between text-[15px] font-bold text-slate-900 dark:text-slate-50">
                <span>Total a procesar</span>
                <span>$0</span>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Información adicional
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Fecha de compra
                </label>
                <input
                  disabled
                  type="date"
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Número de factura
                </label>
                <input
                  disabled
                  placeholder="Ej. VTA-1023"
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Botón de confirmación */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="space-y-3">
              <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p className="font-bold text-slate-700 dark:text-slate-100">
                  Paso final
                </p>
                <p className="mt-1">
                  Cuando confirmes la garantía, se registrará en el sistema y quedará pendiente de revisión.
                </p>
              </div>
              <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                Confirmar garantía
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
