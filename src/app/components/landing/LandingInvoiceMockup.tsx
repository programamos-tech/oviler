import { LandingMockupFrame } from "@/app/components/landing/LandingMockupFrame";

const lines = [
  { ref: "AUD-01", desc: "Audífonos Bluetooth", qty: 2, unit: "$ 89.000", sub: "$ 178.000" },
  { ref: "CBL-USBC", desc: "Cable USB-C 2m", qty: 3, unit: "$ 12.500", sub: "$ 37.500" },
  { ref: "FUN-14", desc: "Funda silicona", qty: 1, unit: "$ 25.000", sub: "$ 25.000" },
];

/**
 * Vista decorativa tipo detalle de factura de venta.
 */
export function LandingInvoiceMockup() {
  return (
    <LandingMockupFrame
      toolbarExtra={
        <p className="berea-landing-mockup-text truncate text-center text-[10px] font-medium sm:text-left">
          berea.app · Ventas · Factura
        </p>
      }
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="berea-landing-mockup-text text-[10px] font-semibold uppercase tracking-[0.12em]">
            Factura de venta
          </p>
          <p className="berea-landing-mockup-text-strong mt-1 font-mono text-[16px] font-semibold tracking-tight">
            FV-1042
          </p>
          <p className="berea-landing-mockup-text mt-0.5 text-[11px]">15 abr 2026 · Sucursal Centro</p>
        </div>
        <div className="berea-landing-mockup-panel rounded-lg border px-2.5 py-1.5 text-right">
          <p className="berea-landing-mockup-text text-[9px] font-semibold uppercase">Cliente</p>
          <p className="berea-landing-mockup-text-strong text-[12px] font-medium">María Gómez</p>
          <p className="berea-landing-mockup-text text-[10px]">NIT 900.123.456-7</p>
        </div>
      </div>

      <div className="berea-landing-mockup-panel min-w-0 overflow-x-auto rounded-xl border">
        <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.4fr)_auto_auto_auto] gap-x-2 border-b border-[var(--landing-border)] bg-[var(--landing-surface)] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider berea-landing-mockup-text sm:px-3">
          <span>Ref.</span>
          <span>Producto</span>
          <span className="text-right">Cant.</span>
          <span className="hidden text-right sm:block">P. unit</span>
          <span className="text-right">Subt.</span>
        </div>
        <div className="divide-y divide-[var(--landing-border)]">
          {lines.map((l) => (
            <div
              key={l.ref}
              className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.4fr)_auto_auto_auto] items-center gap-x-2 px-2 py-2 text-[11px] sm:px-3 sm:text-[12px]"
            >
              <span className="berea-landing-mockup-text font-mono">{l.ref}</span>
              <span className="berea-landing-mockup-text-strong min-w-0 truncate">{l.desc}</span>
              <span className="berea-landing-mockup-text text-right tabular-nums">{l.qty}</span>
              <span className="berea-landing-mockup-text hidden text-right tabular-nums sm:block">{l.unit}</span>
              <span className="berea-landing-mockup-text-strong text-right font-medium tabular-nums">{l.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="berea-landing-mockup-panel mt-3 space-y-1.5 rounded-xl border px-3 py-2.5 text-[12px]">
        <div className="berea-landing-mockup-text flex justify-between">
          <span>Subtotal</span>
          <span className="berea-landing-mockup-text-strong tabular-nums">$ 240.500</span>
        </div>
        <div className="berea-landing-mockup-text flex justify-between">
          <span>IVA 19%</span>
          <span className="berea-landing-mockup-text-strong tabular-nums">$ 45.695</span>
        </div>
        <div className="berea-landing-mockup-text-strong flex justify-between border-t border-[var(--landing-border)] pt-2 text-[13px] font-semibold">
          <span>Total</span>
          <span className="tabular-nums">$ 286.195</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="berea-landing-badge-ok">Pagada · Efectivo</span>
          <span className="berea-landing-mockup-text text-[10px]">Vendedor: Luis M.</span>
        </div>
      </div>
    </LandingMockupFrame>
  );
}
