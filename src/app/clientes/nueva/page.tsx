import Link from "next/link";

export default function NewCustomerPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Nuevo cliente
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registra un nuevo cliente: datos de contacto y dirección para ventas y domicilio.
            </p>
          </div>
          <Link
            href="/clientes"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a clientes"
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
          {/* Datos personales */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Datos personales
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Nombre completo
                </label>
                <input
                  disabled
                  placeholder="Ej. María López"
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Teléfono
                </label>
                <input
                  disabled
                  placeholder="Ej. 312 000 0000"
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Correo electrónico
                </label>
                <input
                  disabled
                  type="email"
                  placeholder="Ej. maria@ejemplo.com"
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Dirección
            </p>
            <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
              Para pedidos a domicilio y entregas.
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Dirección completa
                </label>
                <textarea
                  disabled
                  rows={3}
                  placeholder="Ej. Cra 10 # 20-30, Apto 502, portería azul"
                  className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Barrio / Zona
                  </label>
                  <input
                    disabled
                    placeholder="Ej. Centro"
                    className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Ciudad
                  </label>
                  <input
                    disabled
                    placeholder="Ej. Bogotá"
                    className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Notas
            </p>
            <textarea
              disabled
              rows={3}
              placeholder="Notas internas sobre el cliente (opcional)"
              className="mt-3 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-[14px] font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* Resumen */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen
            </p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  Cliente nuevo
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Completa los datos para registrar al cliente en tu base.
                </p>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Una vez registrado, podrás asignar ventas y pedidos a domicilio a este cliente.
              </p>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-3">
              <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                Crear cliente
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
