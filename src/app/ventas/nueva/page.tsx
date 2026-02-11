import Link from "next/link";

export default function NewSalePage() {
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Nueva venta
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Cliente, productos, domicilio y pago en un solo lugar.
            </p>
          </div>
          <Link
            href="/ventas"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a ventas"
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

      {/* Copia del flujo simulado de venta desde la vista principal */}
      {/* Columna izquierda: cliente + productos */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
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
              Cuando selecciones un cliente, verás aquí su teléfono, última
              compra y número de pedidos a domicilio.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Productos
              </p>
              <div className="mt-2">
                <input
                  disabled
                  placeholder="Buscar por nombre o código"
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-[14px]">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">
                    Coca-Cola 1.5L
                  </p>
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    Código 10023 · Stock 24 uds
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                    $5.500
                  </span>
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                    Agregar
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">
                    Pan tajado integral
                  </p>
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    Código 10450 · Stock 12 uds
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                    $4.200
                  </span>
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                    Agregar
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">
                    Arroz 500g
                  </p>
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    Código 10002 · Stock 48 uds
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                    $3.000
                  </span>
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: carrito + domicilio + pago */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Carrito de venta (simulado)
              </p>
              <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                3 productos · 5 unidades
              </span>
            </div>

            <div className="mt-3 space-y-2 text-[14px] text-slate-700 dark:text-slate-200">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">
                    Coca-Cola 1.5L x 2
                  </p>
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    $5.500 c/u
                  </p>
                </div>
                <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                  $11.000
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">
                    Pan tajado integral x 1
                  </p>
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    $4.200
                  </p>
                </div>
                <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                  $4.200
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">
                    Arroz 500g x 2
                  </p>
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    $3.000 c/u
                  </p>
                </div>
                <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                  $6.000
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold">$21.200</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="font-medium">Domicilio</span>
                <span className="font-bold">$4.000</span>
              </div>
              <div className="flex items-center justify-between text-[15px] font-bold text-slate-900 dark:text-slate-50">
                <span>Total venta</span>
                <span>$25.200</span>
              </div>
            </div>
          </div>

            <div className="space-y-4 rounded-xl bg-white p-4 text-[14px] text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Domicilio
                </p>
                <p className="mt-1 text-[13px] font-medium text-slate-600 dark:text-slate-400">
                  Si activas el domicilio, NOU crea el pedido
                  automáticamente.
                </p>
              </div>
              <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Domicilio activado (simulado)
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Dirección de entrega
                </label>
                <textarea
                  disabled
                  rows={2}
                  className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="Cra 10 # 20-30, Apto 502, portería azul"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Costo de domicilio
                  </label>
                  <input
                    disabled
                    className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    defaultValue="$4.000"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Hora estimada
                  </label>
                  <input
                    disabled
                    className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    defaultValue="Entre 20 y 30 minutos"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-4 border-t border-slate-200 pt-3 text-[13px] dark:border-slate-800 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div>
                <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Método de pago
                </p>
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-bold text-white hover:bg-black dark:bg-emerald-500 dark:hover:bg-emerald-400">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Efectivo
                  </button>
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                    Transferencia
                  </button>
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                    Mixto
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p>
                  Aquí verás el efectivo recibido, las transferencias
                  confirmadas y el cambio a entregar. Todo listo para tu cierre
                  de caja.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
              <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p className="font-bold text-slate-700 dark:text-slate-100">
                  Paso final
                </p>
                <p>
                  Cuando confirmes la venta, se descuenta el inventario y se
                  crea el pedido de domicilio si está activado.
                </p>
              </div>
              <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                Confirmar venta
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

