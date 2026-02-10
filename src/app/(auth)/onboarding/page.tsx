"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-slate-500";
const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [responsableIva, setResponsableIva] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // TODO: enviar datos al backend
    await new Promise((r) => setTimeout(r, 500));
    router.push("/");
    setLoading(false);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <header className="space-y-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Configura tu sucursal
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Estos datos son los de tu punto de venta o negocio. Cada sucursal tendrá sus propios números de venta, inventario y configuración.
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
            <div className="space-y-4">
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Logo
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    <span className="text-[12px] font-medium text-slate-400">Sin logo</span>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      name="logo"
                      className="block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Datos de la sucursal
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className={labelClass}>
                      Nombre de la sucursal <span className="text-ov-pink">*</span>
                    </label>
                    <input
                      name="nombre"
                      placeholder="Ej. Oviler Norte"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      NIT <span className="text-ov-pink">*</span>
                    </label>
                    <input
                      name="nit"
                      placeholder="Ej. 900.123.456-7"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Dirección</label>
                    <input
                      name="direccion"
                      placeholder="Ej. Cra 15 # 80-10"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input
                      name="telefono"
                      placeholder="Ej. 601 765 4321"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Impuestos
                </p>
                <label className="mt-3 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={responsableIva}
                    onChange={(e) => setResponsableIva(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 dark:text-slate-700 dark:focus:ring-slate-500"
                  />
                  <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                    Es responsable de IVA
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Resumen
                </p>
                <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400">
                  La sucursal tendrá su propia numeración de ventas, inventario independiente y configuración propia.
                </p>
                <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    {loading ? "Guardando…" : "Continuar al dashboard"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
