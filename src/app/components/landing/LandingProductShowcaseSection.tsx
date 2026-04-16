/**
 * Galería de vistas del sistema (solo landing, datos de ejemplo).
 */
import { LandingInvoiceMockup } from "@/app/components/landing/LandingInvoiceMockup";
import { LandingCreditsMockup } from "@/app/components/landing/LandingCreditsMockup";
import { LandingInventoryMockup } from "@/app/components/landing/LandingInventoryMockup";

export function LandingProductShowcaseSection() {
  return (
    <section
      id="vistas"
      className="relative border-t border-zinc-800/80 bg-zinc-950 py-16 sm:py-20"
      aria-labelledby="landing-showcase-heading"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-3xl lg:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">El sistema en acción</p>
          <h2
            id="landing-showcase-heading"
            className="mt-3 font-logo text-2xl tracking-tight text-white sm:text-3xl lg:text-[2rem]"
          >
            Facturas, créditos e inventario{" "}
            <span className="bg-gradient-to-r from-emerald-300/95 to-teal-200/90 bg-clip-text text-transparent">
              como los usas cada día
            </span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-400 sm:text-base">
            Vistas reales del flujo de trabajo: desde el detalle de una factura hasta la cartera y el stock. Todo integrado en
            Bernabé Comercios — capturas ilustrativas.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-3 xl:items-start">
          <LandingInvoiceMockup />
          <LandingCreditsMockup />
          <div className="lg:col-span-2 xl:col-span-1">
            <LandingInventoryMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
