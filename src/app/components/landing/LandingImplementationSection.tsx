import Link from "next/link";

const steps = [
  {
    title: "Implementamos el sistema",
    body: "Dejamos Berea Tecnología alineado con tu operación: sucursales, impuestos y formas de pago.",
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

const LANDING_CALL_TEL = "+573152802343";
const LANDING_CALL_DISPLAY = "315 280 2343";

export function LandingImplementationSection() {
  return (
    <section
      id="implementacion"
      className="berea-landing-section relative py-16 sm:py-20 lg:py-24"
      aria-labelledby="landing-impl-heading"
    >
      <div className="berea-landing-section-line" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
          <div>
            <p className="berea-landing-eyebrow">Implementación Berea</p>
            <h2
              id="landing-impl-heading"
              className="berea-landing-heading mt-3 text-2xl tracking-tight sm:text-3xl lg:text-[2.1rem] lg:leading-tight"
            >
              Nosotros montamos el sistema, tú sigues vendiendo
            </h2>
            <p className="berea-landing-body mt-5 text-[15px] leading-relaxed sm:text-[16px]">
              No es solo software: el equipo Berea implementa Berea Tecnología en tu negocio, migra tu información y deja a tu
              gente lista para operar. Soporte durante todo el año para que el sistema acompañe tu ritmo comercial.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className="berea-landing-btn-primary">
                Solicitar licencia
              </Link>
              <a href={`tel:${LANDING_CALL_TEL}`} className="berea-landing-btn-secondary">
                Llamar · {LANDING_CALL_DISPLAY}
              </a>
            </div>
          </div>

          <ul className="berea-landing-steps list-none p-1">
            {steps.map((s) => (
              <li key={s.title} className="flex gap-4 px-4 py-4 sm:px-5 sm:py-5">
                <span className="berea-landing-step-icon mt-0.5" aria-hidden>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-[var(--landing-fg)]">{s.title}</p>
                  <p className="berea-landing-muted mt-1.5 text-[13px] leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
