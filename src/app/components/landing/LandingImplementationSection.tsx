import Link from "next/link";

const steps = [
  {
    title: "Implementamos el sistema",
    body: "Dejamos Berea Comercios alineado con tu operación: sucursales, impuestos y formas de pago.",
  },
  {
    title: "Importamos tus productos",
    body: "Cargamos catálogo, precios y existencias iniciales para que el primer día ya vendas con datos limpios.",
  },
  {
    title: "Creamos usuarios y permisos",
    body: "Cada persona accede solo a lo que necesita: caja, inventario, reportes o administración.",
  },
  {
    title: "Capacitamos a tu equipo",
    body: "Sesiones prácticas en mostrador y bodega para que todos usen el sistema con seguridad.",
  },
  {
    title: "Soporte todo el año",
    body: "Acompañamiento por canales directos cuando tengas dudas, ajustes o nuevas necesidades.",
  },
] as const;

const LICENSE_START_PRICE = "$799.000";

/**
 * Cierre de landing: implementación + soporte (equipo Berea).
 */
export function LandingImplementationSection() {
  return (
    <section
      id="implementacion"
      className="relative border-t border-zinc-800/80 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/40 py-16 sm:py-20 lg:py-24"
      aria-labelledby="landing-impl-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Implementación Berea</p>
            <h2
              id="landing-impl-heading"
              className="mt-3 font-logo text-2xl tracking-tight text-white sm:text-3xl lg:text-[2.1rem] lg:leading-tight"
            >
              Nosotros montamos el sistema, tú sigues vendiendo
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-zinc-400 sm:text-[16px]">
              No es solo software: el equipo Berea implementa Berea Comercios en tu negocio, migra tu información y deja a tu
              gente lista para operar. Soporte durante todo el año para que el sistema acompañe tu ritmo comercial.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/registro"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 px-5 text-[14px] font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-white"
              >
                Solicitar licencia · desde {LICENSE_START_PRICE}
              </Link>
              <a
                href="tel:+573002061711"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-600 px-5 text-[14px] font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
              >
                Llamar · 300 206 1711
              </a>
            </div>
          </div>

          <ul className="space-y-0 divide-y divide-zinc-800/90 rounded-2xl border border-zinc-800/90 bg-zinc-900/30 p-1 ring-1 ring-white/[0.04]">
            {steps.map((s) => (
              <li key={s.title} className="flex gap-4 px-4 py-4 sm:px-5 sm:py-5">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
                  aria-hidden
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-zinc-100">{s.title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{s.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
