import Link from "next/link";

export default function WarrantiesPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Garantías de productos
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Gestiona las garantías de productos vendidos: registra solicitudes,
              revisa estados y procesa cambios o devoluciones.
            </p>
          </div>
          <Link
            href="/garantias/nueva"
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
            Nueva garantía
          </Link>
        </div>
      </header>

      {/* Lista de garantías como cards expandibles */}
      <section className="space-y-3">
        {/* Card 1 - Garantía pendiente */}
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
              Hace 2 días
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                María López
              </p>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Aceite 1L · Comprado hace 5 días
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Pendiente
            </span>
            <div className="w-32 text-right text-[15px] font-bold text-slate-900 dark:text-slate-50">
              #GAR-001
            </div>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                  Información de la garantía
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
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    <span className="font-bold">Producto:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Aceite 1L
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="font-bold">Cliente:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      María López
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-bold">Fecha de compra:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Hace 5 días
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
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-bold">Valor del producto:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      $22.500
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                    Motivo de la garantía
                  </p>
                  <div className="rounded-lg bg-slate-50 p-3 text-[13px] dark:bg-slate-800">
                    <p className="text-slate-700 dark:text-slate-300">
                      El producto presenta defecto de fábrica. El aceite tiene una
                      fuga en el envase.
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-bold">Tipo:</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Cambio por defecto
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
                    Pendiente revisión
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Garantía registrada hace 2 días
              </p>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg border-2 border-emerald-500 bg-emerald-50 px-4 py-2 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900">
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
                  Aprobar cambio
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </details>

        {/* Card 2 - Garantía aprobada */}
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
              Hace 1 semana
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                Carlos Gómez
              </p>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Coca-Cola 1.5L · Comprado hace 10 días
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1 text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
              <svg
                className="h-3.5 w-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Aprobada
            </span>
            <div className="w-32 text-right text-[15px] font-bold text-slate-900 dark:text-slate-50">
              #GAR-002
            </div>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                  Información de la garantía
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
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    <span className="font-bold">Producto:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Coca-Cola 1.5L
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="font-bold">Cliente:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Carlos Gómez
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-bold">Fecha de compra:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Hace 10 días
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
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-bold">Valor del producto:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      $5.500
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                    Motivo de la garantía
                  </p>
                  <div className="rounded-lg bg-slate-50 p-3 text-[13px] dark:bg-slate-800">
                    <p className="text-slate-700 dark:text-slate-300">
                      Producto vencido. El cliente reporta que la fecha de
                      vencimiento ya había pasado al momento de la compra.
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-bold">Tipo:</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Devolución completa
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
                  <span className="font-bold">Aprobada por:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Ana
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
                    Cambio realizado
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Garantía aprobada y procesada hace 3 días
              </p>
            </div>
          </div>
        </details>

        {/* Card 3 - Garantía rechazada */}
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
              Hace 2 semanas
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                Juan Pérez
              </p>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Pan francés · Comprado hace 20 días
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1 text-[12px] font-bold text-red-700 dark:text-red-300">
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Rechazada
            </span>
            <div className="w-32 text-right text-[15px] font-bold text-slate-900 dark:text-slate-50">
              #GAR-003
            </div>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                  Información de la garantía
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
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    <span className="font-bold">Producto:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Pan francés
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="font-bold">Cliente:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Juan Pérez
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-bold">Fecha de compra:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Hace 20 días
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
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-bold">Valor del producto:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      $5.000
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                    Motivo de la garantía
                  </p>
                  <div className="rounded-lg bg-slate-50 p-3 text-[13px] dark:bg-slate-800">
                    <p className="text-slate-700 dark:text-slate-300">
                      El cliente solicita cambio porque el pan se veía "muy
                      duro". No hay defecto de fábrica.
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">
                    Razón del rechazo
                  </p>
                  <div className="rounded-lg bg-red-50 p-3 text-[13px] dark:bg-red-950/20">
                    <p className="text-red-700 dark:text-red-300">
                      El producto no presenta defectos de fábrica. El pan es un
                      producto perecedero y el cambio fue solicitado fuera del
                      plazo de garantía válido.
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
                  <span className="font-bold">Rechazada por:</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Ana
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
                  <span className="text-red-600 dark:text-red-400">
                    Rechazada
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Garantía rechazada hace 1 semana
              </p>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
