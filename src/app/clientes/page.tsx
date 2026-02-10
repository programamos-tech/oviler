import Link from "next/link";

export default function CustomersPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Clientes
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Construye tu base de clientes con datos claros: historial de compras,
              frecuencia y montos. Tu tienda deja de vender a desconocidos.
            </p>
          </div>
          <Link
            href="/clientes/nueva"
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
            Nuevo cliente
          </Link>
        </div>
      </header>

      {/* Lista de clientes como cards expandibles */}
      <section className="space-y-3">
        {/* Card 1 - Cliente frecuente */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center gap-4">
            <div className="flex w-12 h-12 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-700">
              <span className="text-[16px] font-bold">MG</span>
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                María López
              </p>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                8 pedidos con domicilio · Cliente VIP
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Total comprado
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                $245.800
              </p>
            </div>
            <div className="w-32 text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Ticket promedio
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                $30.725
              </p>
            </div>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Columna izquierda: Información y gráfica */}
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Información del cliente
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
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span className="font-bold">Teléfono:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        312 000 0000
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg
                        className="h-4 w-4 mt-0.5 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <div>
                        <span className="font-bold">Dirección:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          Cra 10 # 20-30, Apto 502, portería azul
                        </p>
                      </div>
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
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="font-bold">Primera compra:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Hace 3 meses
                      </span>
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
                      <span className="font-bold">Última compra:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Hace 2 días
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gráfica de ticket promedio */}
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Ticket promedio mensual
                  </p>
                  <div className="rounded-lg bg-white border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
                    {/* Eje Y con valores */}
                    <div className="relative h-40 mb-2">
                      <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-slate-500 dark:text-slate-400 pr-2">
                        <span>$40k</span>
                        <span>$30k</span>
                        <span>$20k</span>
                        <span>$10k</span>
                        <span>$0</span>
                      </div>
                      {/* Líneas de referencia horizontales */}
                      <div className="absolute inset-0 ml-8 flex flex-col justify-between">
                        <div className="border-t border-slate-200 dark:border-slate-700"></div>
                        <div className="border-t border-slate-200 dark:border-slate-700"></div>
                        <div className="border-t border-slate-200 dark:border-slate-700"></div>
                        <div className="border-t border-slate-200 dark:border-slate-700"></div>
                        <div className="border-t border-slate-300 dark:border-slate-600"></div>
                      </div>
                      {/* Barras del gráfico */}
                      <div className="ml-8 h-full flex items-end justify-between gap-3">
                        <div className="flex flex-col items-center gap-1 flex-1 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-[rgb(234,88,12)] to-orange-400 rounded-t hover:from-[rgb(234,88,12)] hover:to-orange-300 transition-all cursor-pointer shadow-sm"
                            style={{ height: '48%' }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              $18.500
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-[rgb(234,88,12)] to-orange-400 rounded-t hover:from-[rgb(234,88,12)] hover:to-orange-300 transition-all cursor-pointer shadow-sm"
                            style={{ height: '60%' }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              $23.200
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-[rgb(234,88,12)] to-orange-400 rounded-t hover:from-[rgb(234,88,12)] hover:to-orange-300 transition-all cursor-pointer shadow-sm"
                            style={{ height: '72%' }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              $27.800
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-[rgb(234,88,12)] to-orange-400 rounded-t hover:from-[rgb(234,88,12)] hover:to-orange-300 transition-all cursor-pointer shadow-sm"
                            style={{ height: '80%' }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              $30.900
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-[rgb(234,88,12)] to-orange-400 rounded-t hover:from-[rgb(234,88,12)] hover:to-orange-300 transition-all cursor-pointer shadow-md"
                            style={{ height: '100%' }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              $35.400
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Eje X con meses */}
                    <div className="ml-8 flex justify-between gap-3">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 text-center">Ene</span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 text-center">Feb</span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 text-center">Mar</span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 text-center">Abr</span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 text-center">May</span>
                    </div>
                    {/* Información adicional */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Promedio: $30.725</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+15% vs mes anterior</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha: Insights y top productos */}
              <div className="space-y-4">
                {/* Insights */}
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Insights
                  </p>
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex items-start gap-2 text-[13px]">
                      <svg
                        className="h-4 w-4 mt-0.5 text-emerald-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                      <div>
                        <span className="font-bold">Tendencia:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          Cliente en crecimiento. Aumentó frecuencia de compra 25% este mes.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-[13px]">
                      <svg
                        className="h-4 w-4 mt-0.5 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <span className="font-bold">Frecuencia:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          Compra cada 4 días en promedio. Cliente muy activo.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-[13px]">
                      <svg
                        className="h-4 w-4 mt-0.5 text-orange-500"
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
                      <div>
                        <span className="font-bold">Preferencia:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          100% de sus compras son a domicilio. Cliente VIP.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top productos */}
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Top productos comprados
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-[rgb(234,88,12)] text-[11px] font-bold text-white">
                          1
                        </span>
                        <span className="font-medium text-[13px]">Aceite 1L</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-bold">12 veces</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">$270.000</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-400 text-[11px] font-bold text-white">
                          2
                        </span>
                        <span className="font-medium text-[13px]">Arroz 500g</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-bold">8 veces</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">$24.000</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-400 text-[11px] font-bold text-white">
                          3
                        </span>
                        <span className="font-medium text-[13px]">Leche</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-bold">6 veces</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">$24.000</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Cliente registrado desde hace 3 meses
              </p>
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
                Editar cliente
              </button>
            </div>
          </div>
        </details>

        {/* Card 2 - Cliente frecuente */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center gap-4">
            <div className="flex w-12 h-12 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-700">
              <span className="text-[16px] font-bold">CG</span>
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                Carlos Gómez
              </p>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Cliente frecuente · 15 compras
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Total comprado
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                $280.500
              </p>
            </div>
            <div className="w-32 text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Ticket promedio
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                $18.700
              </p>
            </div>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Información del cliente
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
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span className="font-bold">Teléfono:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        315 123 4567
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg
                        className="h-4 w-4 mt-0.5 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <div>
                        <span className="font-bold">Dirección:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          Cra 8 # 15-25, Barrio San José
                        </p>
                      </div>
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
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="font-bold">Primera compra:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Hace 5 meses
                      </span>
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
                      <span className="font-bold">Última compra:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Hoy
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Ticket promedio mensual
                  </p>
                  <div className="rounded-lg bg-white border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
                    <div className="relative h-40 mb-2">
                      <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-slate-500 dark:text-slate-400 pr-2">
                        <span>$25k</span>
                        <span>$20k</span>
                        <span>$15k</span>
                        <span>$10k</span>
                        <span>$0</span>
                      </div>
                      <div className="absolute inset-0 ml-8 flex flex-col justify-between">
                        <div className="border-t border-slate-200 dark:border-slate-700"></div>
                        <div className="border-t border-slate-200 dark:border-slate-700"></div>
                        <div className="border-t border-slate-200 dark:border-slate-700"></div>
                        <div className="border-t border-slate-200 dark:border-slate-700"></div>
                        <div className="border-t border-slate-300 dark:border-slate-600"></div>
                      </div>
                      <div className="ml-8 h-full flex items-end justify-between gap-3">
                        <div className="flex flex-col items-center gap-1 flex-1 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-[rgb(234,88,12)] to-orange-400 rounded-t hover:from-[rgb(234,88,12)] hover:to-orange-300 transition-all cursor-pointer shadow-sm"
                            style={{ height: '56%' }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              $14.000
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-[rgb(234,88,12)] to-orange-400 rounded-t hover:from-[rgb(234,88,12)] hover:to-orange-300 transition-all cursor-pointer shadow-sm"
                            style={{ height: '52%' }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              $13.000
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-[rgb(234,88,12)] to-orange-400 rounded-t hover:from-[rgb(234,88,12)] hover:to-orange-300 transition-all cursor-pointer shadow-sm"
                            style={{ height: '64%' }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              $16.000
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-[rgb(234,88,12)] to-orange-400 rounded-t hover:from-[rgb(234,88,12)] hover:to-orange-300 transition-all cursor-pointer shadow-sm"
                            style={{ height: '60%' }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              $15.000
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1 group relative">
                          <div 
                            className="w-full bg-gradient-to-t from-[rgb(234,88,12)] to-orange-400 rounded-t hover:from-[rgb(234,88,12)] hover:to-orange-300 transition-all cursor-pointer shadow-md"
                            style={{ height: '100%' }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              $20.200
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-8 flex justify-between gap-3">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 text-center">Ene</span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 text-center">Feb</span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 text-center">Mar</span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 text-center">Abr</span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 text-center">May</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Promedio: $18.700</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+8% vs mes anterior</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Insights
                  </p>
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex items-start gap-2 text-[13px]">
                      <svg
                        className="h-4 w-4 mt-0.5 text-emerald-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                      <div>
                        <span className="font-bold">Tendencia:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          Cliente estable. Mantiene frecuencia constante de compras.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-[13px]">
                      <svg
                        className="h-4 w-4 mt-0.5 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <span className="font-bold">Frecuencia:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          Compra cada 6 días en promedio. Cliente regular.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-[13px]">
                      <svg
                        className="h-4 w-4 mt-0.5 text-orange-500"
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
                      <div>
                        <span className="font-bold">Preferencia:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          60% compras físicas, 40% a domicilio. Cliente mixto.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Top productos comprados
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-[rgb(234,88,12)] text-[11px] font-bold text-white">
                          1
                        </span>
                        <span className="font-medium text-[13px]">Coca-Cola 1.5L</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-bold">10 veces</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">$55.000</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-400 text-[11px] font-bold text-white">
                          2
                        </span>
                        <span className="font-medium text-[13px]">Papas fritas</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-bold">7 veces</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">$53.900</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-400 text-[11px] font-bold text-white">
                          3
                        </span>
                        <span className="font-medium text-[13px]">Pan tajado integral</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-bold">5 veces</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">$21.000</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Cliente registrado desde hace 5 meses
              </p>
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
                Editar cliente
              </button>
            </div>
          </div>
        </details>

        {/* Card 3 - Cliente nuevo */}
        <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
          <summary className="flex cursor-pointer list-none items-center gap-4">
            <div className="flex w-12 h-12 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-700">
              <span className="text-[16px] font-bold">JP</span>
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                Juan Pérez
              </p>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Nuevo cliente · Primera compra
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Total comprado
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                $46.000
              </p>
            </div>
            <div className="w-32 text-right">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Ticket promedio
              </p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                $46.000
              </p>
            </div>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Información del cliente
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
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span className="font-bold">Teléfono:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        320 555 1234
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg
                        className="h-4 w-4 mt-0.5 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <div>
                        <span className="font-bold">Dirección:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          Cra 15 # 45-12, Barrio Los Almendros
                        </p>
                      </div>
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
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="font-bold">Primera compra:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Hoy
                      </span>
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
                      <span className="font-bold">Última compra:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Hoy
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Ticket promedio mensual
                  </p>
                  <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex items-center justify-center h-32">
                      <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                        Datos insuficientes para mostrar gráfica
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Insights
                  </p>
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex items-start gap-2 text-[13px]">
                      <svg
                        className="h-4 w-4 mt-0.5 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <span className="font-bold">Estado:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          Cliente nuevo. Primera compra registrada hoy.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-[13px]">
                      <svg
                        className="h-4 w-4 mt-0.5 text-orange-500"
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
                      <div>
                        <span className="font-bold">Preferencia:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          Primera compra fue a domicilio. Potencial cliente recurrente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Top productos comprados
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-[rgb(234,88,12)] text-[11px] font-bold text-white">
                          1
                        </span>
                        <span className="font-medium text-[13px]">Leche</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-bold">1 vez</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">$12.000</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-400 text-[11px] font-bold text-white">
                          2
                        </span>
                        <span className="font-medium text-[13px]">Pan francés</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-bold">1 vez</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">$30.000</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Cliente nuevo · Registrado hoy
              </p>
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
                Editar cliente
              </button>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
