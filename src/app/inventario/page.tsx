import Link from "next/link";

export default function InventoryPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Inventario
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Controla tus productos, entradas de mercancía y niveles de stock sin
              perder de vista qué se está vendiendo más.
            </p>
          </div>
          <Link
            href="/inventario/nuevo"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nuevo producto
          </Link>
        </div>
      </header>

      {/* Lista de productos como cards expandibles */}
      <section className="space-y-3">
        {/* Card 1 - Producto con stock normal */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center gap-4">
            <div className="flex w-16 h-16 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                Aceite 1L
              </p>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Código: 10045 · Categoría: Alimentos básicos
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Stock disponible
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                48 unidades
              </p>
            </div>
            <div className="w-32 text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Precio
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                $22.500
              </p>
            </div>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Columna izquierda: Información del producto */}
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Información del producto
                  </p>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="font-bold">Código:</span>
                      <span className="text-slate-600 dark:text-slate-400">10045</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="font-bold">Categoría:</span>
                      <span className="text-slate-600 dark:text-slate-400">Alimentos básicos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-bold">Precio de venta:</span>
                      <span className="text-slate-600 dark:text-slate-400">$22.500</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-bold">Costo:</span>
                      <span className="text-slate-600 dark:text-slate-400">$18.000</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-bold">Estado:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Activo</span>
                    </div>
                  </div>
                </div>

                {/* Stock y alertas */}
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Stock y alertas
                  </p>
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Stock actual:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-50">48 unidades</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Stock mínimo:</span>
                      <span className="text-slate-600 dark:text-slate-400">10 unidades</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Stock máximo:</span>
                      <span className="text-slate-600 dark:text-slate-400">100 unidades</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-[12px]">
                        <svg
                          className="h-4 w-4 text-emerald-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Stock en niveles normales
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha: Movimientos recientes */}
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Movimientos recientes
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-[10px] font-bold text-white">
                          +
                        </div>
                        <div>
                          <p className="text-[13px] font-bold">Entrada de mercancía</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Hace 2 días · +20 unidades
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                        +20
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-red-500 text-[10px] font-bold text-white">
                          -
                        </div>
                        <div>
                          <p className="text-[13px] font-bold">Venta</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Hace 5 días · -2 unidades
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-red-600 dark:text-red-400">
                        -2
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500 text-[10px] font-bold text-white">
                          T
                        </div>
                        <div>
                          <p className="text-[13px] font-bold">Transferencia</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Hace 1 semana · -5 unidades
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400">
                        -5
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estadísticas */}
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Estadísticas
                  </p>
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Total vendido (mes):</span>
                      <span className="font-bold text-slate-900 dark:text-slate-50">12 unidades</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Valor en stock:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-50">$1.080.000</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Última venta:</span>
                      <span className="text-slate-600 dark:text-slate-400">Hace 5 días</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Producto creado hace 2 meses
              </p>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Editar
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2 text-[13px] font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900">
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Ajustar stock
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-purple-500 bg-purple-50 px-4 py-2 text-[13px] font-bold text-purple-700 hover:bg-purple-100 dark:border-purple-500 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900">
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
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  Transferir
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-700 hover:bg-red-100 dark:border-red-500 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900">
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </details>

        {/* Card 2 - Producto con stock bajo */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center gap-4">
            <div className="flex w-16 h-16 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                Coca-Cola 1.5L
              </p>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Código: 10023 · Categoría: Bebidas
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Stock disponible
              </p>
              <p className="text-[15px] font-bold text-orange-600 dark:text-orange-400">
                8 unidades
              </p>
            </div>
            <div className="w-32 text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Precio
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                $5.500
              </p>
            </div>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Información del producto
                  </p>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="font-bold">Código:</span>
                      <span className="text-slate-600 dark:text-slate-400">10023</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="font-bold">Categoría:</span>
                      <span className="text-slate-600 dark:text-slate-400">Bebidas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-bold">Precio de venta:</span>
                      <span className="text-slate-600 dark:text-slate-400">$5.500</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-bold">Costo:</span>
                      <span className="text-slate-600 dark:text-slate-400">$4.200</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-bold">Estado:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Activo</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Stock y alertas
                  </p>
                  <div className="space-y-2 rounded-lg bg-orange-50 p-4 dark:bg-orange-950/20">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Stock actual:</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">8 unidades</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Stock mínimo:</span>
                      <span className="text-slate-600 dark:text-slate-400">10 unidades</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Stock máximo:</span>
                      <span className="text-slate-600 dark:text-slate-400">50 unidades</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 text-[12px]">
                        <svg
                          className="h-4 w-4 text-orange-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          ⚠️ Stock bajo - Reabastecer pronto
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Movimientos recientes
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-red-500 text-[10px] font-bold text-white">
                          -
                        </div>
                        <div>
                          <p className="text-[13px] font-bold">Venta</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Hace 1 día · -4 unidades
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-red-600 dark:text-red-400">
                        -4
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-red-500 text-[10px] font-bold text-white">
                          -
                        </div>
                        <div>
                          <p className="text-[13px] font-bold">Venta</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Hace 3 días · -2 unidades
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-red-600 dark:text-red-400">
                        -2
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-[10px] font-bold text-white">
                          +
                        </div>
                        <div>
                          <p className="text-[13px] font-bold">Entrada de mercancía</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Hace 1 semana · +24 unidades
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                        +24
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Estadísticas
                  </p>
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Total vendido (mes):</span>
                      <span className="font-bold text-slate-900 dark:text-slate-50">28 unidades</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Valor en stock:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-50">$44.000</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Última venta:</span>
                      <span className="text-slate-600 dark:text-slate-400">Hace 1 día</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Producto creado hace 4 meses
              </p>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Editar
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2 text-[13px] font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900">
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Ajustar stock
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-purple-500 bg-purple-50 px-4 py-2 text-[13px] font-bold text-purple-700 hover:bg-purple-100 dark:border-purple-500 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900">
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
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  Transferir
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-700 hover:bg-red-100 dark:border-red-500 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900">
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </details>

        {/* Card 3 - Producto nuevo */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center gap-4">
            <div className="flex w-16 h-16 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                Arroz 500g
              </p>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Código: 10002 · Categoría: Alimentos básicos
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Stock disponible
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                48 unidades
              </p>
            </div>
            <div className="w-32 text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Precio
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                $3.000
              </p>
            </div>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Información del producto
                  </p>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="font-bold">Código:</span>
                      <span className="text-slate-600 dark:text-slate-400">10002</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="font-bold">Categoría:</span>
                      <span className="text-slate-600 dark:text-slate-400">Alimentos básicos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-bold">Precio de venta:</span>
                      <span className="text-slate-600 dark:text-slate-400">$3.000</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-bold">Costo:</span>
                      <span className="text-slate-600 dark:text-slate-400">$2.200</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-bold">Estado:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Activo</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Stock y alertas
                  </p>
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Stock actual:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-50">48 unidades</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Stock mínimo:</span>
                      <span className="text-slate-600 dark:text-slate-400">20 unidades</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Stock máximo:</span>
                      <span className="text-slate-600 dark:text-slate-400">100 unidades</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-[12px]">
                        <svg
                          className="h-4 w-4 text-emerald-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Stock en niveles normales
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Movimientos recientes
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-[10px] font-bold text-white">
                          +
                        </div>
                        <div>
                          <p className="text-[13px] font-bold">Entrada de mercancía</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Hace 3 días · +50 unidades
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                        +50
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-red-500 text-[10px] font-bold text-white">
                          -
                        </div>
                        <div>
                          <p className="text-[13px] font-bold">Venta</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Hace 1 semana · -2 unidades
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-red-600 dark:text-red-400">
                        -2
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Estadísticas
                  </p>
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Total vendido (mes):</span>
                      <span className="font-bold text-slate-900 dark:text-slate-50">8 unidades</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Valor en stock:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-50">$144.000</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold">Última venta:</span>
                      <span className="text-slate-600 dark:text-slate-400">Hace 1 semana</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Producto creado hace 1 mes
              </p>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Editar
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2 text-[13px] font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900">
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Ajustar stock
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-purple-500 bg-purple-50 px-4 py-2 text-[13px] font-bold text-purple-700 hover:bg-purple-100 dark:border-purple-500 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900">
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
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  Transferir
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-700 hover:bg-red-100 dark:border-red-500 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900">
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
