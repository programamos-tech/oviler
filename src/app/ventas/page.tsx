import Link from "next/link";

export default function SalesPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Ventas
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              La tabla de hoy concentra todas las ventas físicas y con
              domicilio.
            </p>
          </div>
          <Link
            href="/ventas/nueva"
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
            Nueva venta
          </Link>
        </div>
      </header>

      {/* Lista de ventas como cards expandibles */}
      <section className="space-y-3">
        <div className="rounded-xl bg-white p-4 text-[14px] text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Ventas recientes (simuladas)
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Expande cada tarjeta para ver el detalle completo de la venta.
              </p>
            </div>
            <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
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
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filtrar por tipo
            </button>
          </div>

          <div className="space-y-3">
            {/* Card 1 */}
            <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
              <summary className="flex cursor-pointer list-none items-center gap-4">
                <div className="flex w-28 items-center gap-2 text-[13px] font-bold text-slate-600 dark:text-slate-400">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  10:12 a.m.
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                    Carlos Gómez
                  </p>
                  <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    Cliente frecuente · 15 compras
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1 text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  Física
                </span>
                <div className="w-32 text-right text-[15px] font-bold text-slate-900 dark:text-slate-50">
                  $18.700
                </div>
              </summary>
              <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                      Productos vendidos
                    </p>
                    <ul className="space-y-1 text-[13px]">
                      <li className="flex items-center gap-2">
                        <span className="font-medium">Coca-Cola 1.5L</span>
                        <span className="text-slate-500">x2</span>
                        <span className="ml-auto font-bold">$11.000</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="font-medium">Papas fritas</span>
                        <span className="text-slate-500">x1</span>
                        <span className="ml-auto font-bold">$7.700</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[13px]">
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
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="font-bold">Pago:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Efectivo
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="font-bold">Cajero:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Ana · Caja principal
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
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
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Completada
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    Venta rápida en mostrador
                  </p>
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Anular venta
                  </button>
                </div>
              </div>
            </details>

            {/* Card 2 */}
            <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
              <summary className="flex cursor-pointer list-none items-center gap-4">
                <div className="flex w-28 items-center gap-2 text-[13px] font-bold text-slate-600 dark:text-slate-400">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  11:03 a.m.
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                    María López
                  </p>
                  <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    8 pedidos con domicilio · Cliente VIP
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/10 px-3 py-1 text-[12px] font-bold text-orange-700 dark:text-orange-300">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Domicilio
                </span>
                <div className="w-32 text-right text-[15px] font-bold text-slate-900 dark:text-slate-50">
                  $32.500
                </div>
              </summary>
              <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                      Productos vendidos
                    </p>
                    <ul className="space-y-1 text-[13px]">
                      <li className="flex items-center gap-2">
                        <span className="font-medium">Arroz 500g</span>
                        <span className="text-slate-500">x2</span>
                        <span className="ml-auto font-bold">$6.000</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="font-medium">Aceite 1L</span>
                        <span className="text-slate-500">x1</span>
                        <span className="ml-auto font-bold">$22.500</span>
                      </li>
                    </ul>
                    <p className="mt-3 text-[13px] font-bold text-slate-600 dark:text-slate-400">
                      Envío: $4.000
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[13px]">
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
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="font-bold">Pago:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Mixto (Efectivo + Transferencia)
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-[13px]">
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
                    <div className="flex items-center gap-2 text-[13px]">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="font-bold">Cajero:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Luis · Pedido #1023
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
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
                      <span className="text-orange-600 dark:text-orange-400">
                        Pendiente entrega
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    Pedido a domicilio registrado
                  </p>
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Anular venta
                  </button>
                </div>
              </div>
            </details>

            {/* Card 3 */}
            <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
              <summary className="flex cursor-pointer list-none items-center gap-4">
                <div className="flex w-28 items-center gap-2 text-[13px] font-bold text-slate-600 dark:text-slate-400">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  11:45 a.m.
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                    Venta rápida
                  </p>
                  <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    Cliente sin registrar · Venta express
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1 text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  Física
                </span>
                <div className="w-32 text-right text-[15px] font-bold text-slate-900 dark:text-slate-50">
                  $28.600
                </div>
              </summary>
              <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                      Productos vendidos
                    </p>
                    <ul className="space-y-1 text-[13px]">
                      <li className="flex items-center gap-2">
                        <span className="font-medium">Huevo</span>
                        <span className="text-slate-500">x30</span>
                        <span className="ml-auto font-bold">$24.000</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="font-medium">Pan tajado integral</span>
                        <span className="text-slate-500">x1</span>
                        <span className="ml-auto font-bold">$4.600</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[13px]">
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
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="font-bold">Pago:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Efectivo
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="font-bold">Cajero:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Ana · Caja rápida
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
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
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-bold">Nota:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Cliente no registrado
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
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
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Completada
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    Venta express sin registro de cliente
                  </p>
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Anular venta
                  </button>
                </div>
              </div>
            </details>

            {/* Card 4 */}
            <details className="group rounded-xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200 open:ring-2 open:ring-ov-pink/30 dark:bg-slate-900 dark:ring-slate-800">
              <summary className="flex cursor-pointer list-none items-center gap-4">
                <div className="flex w-28 items-center gap-2 text-[13px] font-bold text-slate-600 dark:text-slate-400">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  12:20 p.m.
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                    Juan Pérez
                  </p>
                  <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    Nuevo cliente · Primera compra
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/10 px-3 py-1 text-[12px] font-bold text-orange-700 dark:text-orange-300">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Domicilio
                </span>
                <div className="w-32 text-right text-[15px] font-bold text-slate-900 dark:text-slate-50">
                  $46.000
                </div>
              </summary>
              <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                      Productos vendidos
                    </p>
                    <ul className="space-y-1 text-[13px]">
                      <li className="flex items-center gap-2">
                        <span className="font-medium">Leche</span>
                        <span className="text-slate-500">x3</span>
                        <span className="ml-auto font-bold">$12.000</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="font-medium">Pan francés</span>
                        <span className="text-slate-500">x6</span>
                        <span className="ml-auto font-bold">$30.000</span>
                      </li>
                    </ul>
                    <p className="mt-3 text-[13px] font-bold text-slate-600 dark:text-slate-400">
                      Envío: $4.000
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[13px]">
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
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="font-bold">Pago:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Transferencia
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-[13px]">
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
                    <div className="flex items-center gap-2 text-[13px]">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="font-bold">Cajero:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Luis · Pedido #1024
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
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
                      <span className="text-orange-600 dark:text-orange-400">
                        Pendiente entrega
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    Nuevo cliente registrado · Datos guardados
                  </p>
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Anular venta
                  </button>
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}

