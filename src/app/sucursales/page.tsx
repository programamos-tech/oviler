import Link from "next/link";

const sucursales = [
  {
    id: "1",
    name: "Sucursal Principal",
    nit: "900.123.456-7",
    address: "Calle 50 # 10-20",
    phone: "601 123 4567",
    responsableIva: true,
    logoUrl: null,
  },
  {
    id: "2",
    name: "Sucursal Norte",
    nit: "900.123.456-7",
    address: "Cra 15 # 80-10",
    phone: "601 765 4321",
    responsableIva: true,
    logoUrl: null,
  },
];

export default function SucursalesPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Sucursales
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Cada sucursal tiene sus propios datos, numeración de ventas y configuración.
            </p>
          </div>
          <Link
            href="/sucursales/nueva"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva sucursal
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sucursales.map((suc) => (
          <Link
            key={suc.id}
            href="/sucursales/configurar"
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
          >
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-lg font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {suc.logoUrl ? (
                  <img src={suc.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                ) : (
                  "S"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                  {suc.name}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  NIT {suc.nit}
                </p>
                <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                  {suc.address}
                </p>
                <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                  {suc.phone}
                </p>
                {suc.responsableIva && (
                  <span className="mt-2 inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Responsable de IVA
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
