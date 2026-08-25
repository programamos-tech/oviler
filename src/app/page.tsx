import type { Metadata } from "next";
import Link from "next/link";
import { BereaLandingLogo } from "@/app/components/landing/BereaLandingLogo";
import { LandingDashboardMockup } from "@/app/components/landing/LandingDashboardMockup";
import { LandingFeaturesSection } from "@/app/components/landing/LandingFeaturesSection";
import { LandingFooter } from "@/app/components/landing/LandingFooter";
import { ColombiaFlag } from "@/app/components/landing/ColombiaFlag";
import { LandingProductShowcaseSection } from "@/app/components/landing/LandingProductShowcaseSection";
import { LandingImplementationSection } from "@/app/components/landing/LandingImplementationSection";

const LANDING_CALL_TEL = "+573152802343";
const LANDING_CALL_DISPLAY = "315 280 2343";

export const metadata: Metadata = {
  title: {
    absolute: "Berea Tech - Sistema para tu tienda de tecnología.",
  },
  description:
    "Inventario, ventas, clientes y créditos. Berea Tech — sistema para tu tienda de tecnología. Licencia con soporte.",
};

export default function LandingPage() {
  return (
    <div className="berea-landing min-h-screen">
      <header className="berea-landing-header">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:min-h-16 sm:px-6 lg:px-8">
          <BereaLandingLogo href="/" />
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <a
              href={`tel:${LANDING_CALL_TEL}`}
              className="hidden min-[400px]:flex min-[400px]:flex-col min-[400px]:items-end min-[400px]:leading-none sm:mr-1"
            >
              <span className="berea-landing-muted text-[10px] font-medium uppercase tracking-wide">Llama ahora</span>
              <span className="mt-0.5 text-[14px] font-bold tabular-nums tracking-tight text-[var(--landing-fg)]">
                {LANDING_CALL_DISPLAY}
              </span>
            </a>
            <a
              href={`tel:${LANDING_CALL_TEL}`}
              className="berea-landing-btn-secondary h-11 w-11 min-[400px]:hidden shrink-0 justify-center !p-0"
              aria-label={`Llamar al ${LANDING_CALL_DISPLAY}`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </a>
            <Link href="/login" className="berea-landing-btn-secondary">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="berea-landing-btn-primary">
              Solicitar licencia
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-28">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
              <div className="max-w-xl lg:max-w-none">
                <p className="berea-landing-badge">
                  <span className="inline-flex items-center gap-2">
                    <span className="berea-landing-badge-dot" aria-hidden />
                    Berea Tech · inventario, ventas y clientes
                  </span>
                  <span className="inline-flex items-center gap-1.5 berea-landing-muted">
                    <span aria-hidden>·</span>
                    <span>Sincelejo, Colombia</span>
                    <ColombiaFlag className="inline-flex translate-y-px" title="Bandera de Colombia" />
                  </span>
                </p>
                <h1 className="berea-landing-heading mt-6 text-3xl leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
                  Tu negocio organizado y listo para{" "}
                  <span className="berea-landing-accent-text">vender con claridad</span>
                </h1>
                <p className="berea-landing-body mt-5 text-[15px] leading-relaxed sm:text-lg">
                  Controla inventario, registra ventas y haz seguimiento a clientes desde un solo panel.
                  Implementamos Berea Tech contigo y capacitamos a tu equipo para usarlo bien desde el primer día.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/registro" className="berea-landing-btn-primary">
                    Prueba gratis
                  </Link>
                  <Link href="/login" className="berea-landing-btn-secondary">
                    Ya tengo cuenta
                  </Link>
                </div>
                <p className="berea-landing-muted mt-4 text-[12px] leading-relaxed">
                  Desde Sincelejo, Colombia — licencias, implementación y soporte para comercios en todo el país.
                </p>
              </div>

              <div className="relative lg:pl-4">
                <LandingDashboardMockup />
              </div>
            </div>
          </div>
        </section>

        <LandingProductShowcaseSection />
        <LandingFeaturesSection />
        <LandingImplementationSection />
      </main>

      <LandingFooter />
    </div>
  );
}
