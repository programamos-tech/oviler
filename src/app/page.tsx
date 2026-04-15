import Link from "next/link";
import { OvilerWordmark } from "@/app/components/OvilerWordmark";
import { LandingDashboardMockup } from "@/app/components/landing/LandingDashboardMockup";
import { LandingFeaturesSection } from "@/app/components/landing/LandingFeaturesSection";
import { LandingFooter } from "@/app/components/landing/LandingFooter";
import { ColombiaFlag } from "@/app/components/landing/ColombiaFlag";
import { LandingProductShowcaseSection } from "@/app/components/landing/LandingProductShowcaseSection";
import { LandingImplementationSection } from "@/app/components/landing/LandingImplementationSection";

const LICENSE_START_PRICE = "$799.000";

/** Mismo lenguaje visual que el hero y las pantallas de auth (login/registro). */
const landingNavBtnSecondary =
  "inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-zinc-600 px-4 text-[14px] font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900 sm:px-5";
const landingNavBtnPrimary =
  "inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-white px-4 text-[14px] font-bold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 sm:px-5";

const LANDING_CALL_TEL = "+573002061711";
const LANDING_CALL_DISPLAY = "300 206 1711";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent_50%),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(99,102,241,0.06),transparent_45%)]"
        aria-hidden
      />

      <header className="fixed top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/75 backdrop-blur-md">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:min-h-16 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex min-w-0 items-center outline-offset-4 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500">
            <OvilerWordmark variant="onDark" className="text-[1.45rem] sm:text-[1.6rem]" />
          </Link>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <a
              href={`tel:${LANDING_CALL_TEL}`}
              className="hidden min-[400px]:flex min-[400px]:flex-col min-[400px]:items-end min-[400px]:leading-none sm:mr-1"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Llama ahora</span>
              <span className="mt-0.5 text-[14px] font-bold tabular-nums tracking-tight text-zinc-100">{LANDING_CALL_DISPLAY}</span>
            </a>
            <a
              href={`tel:${LANDING_CALL_TEL}`}
              className={`${landingNavBtnSecondary} h-11 w-11 min-[400px]:hidden shrink-0 justify-center !p-0`}
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
            <Link href="/login" className={`${landingNavBtnSecondary} outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500`}>
              Iniciar sesión
            </Link>
            <Link href="/registro" className={`${landingNavBtnPrimary} outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500`}>
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
                <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-zinc-700/80 bg-zinc-900/50 px-3 py-1 text-[11px] font-medium text-zinc-400">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                    Berea Comercios · inventario, ventas y clientes
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-zinc-500">
                    <span aria-hidden>·</span>
                    <span>Sincelejo, Colombia</span>
                    <ColombiaFlag className="inline-flex translate-y-px" title="Bandera de Colombia" />
                  </span>
                </p>
                <h1 className="mt-6 font-logo text-3xl leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
                  Tu negocio organizado y listo para{" "}
                  <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                    vender con claridad
                  </span>
                </h1>
                <p className="mt-5 text-[15px] leading-relaxed text-zinc-400 sm:text-lg">
                  Controla inventario, registra ventas y haz seguimiento a clientes desde un solo panel.
                  Implementamos Berea Comercios contigo y capacitamos a tu equipo para usarlo bien desde el primer día.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/registro"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 px-5 text-[14px] font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-white"
                  >
                    Prueba gratis · luego desde {LICENSE_START_PRICE}
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-600 px-5 text-[14px] font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
                  >
                    Ya tengo cuenta
                  </Link>
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-zinc-500">
                  Modo prueba con límites reducidos. Licencia Basic o Pro con el equipo Berea por WhatsApp cuando la necesites.
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
