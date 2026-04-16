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
        <p className="truncate text-center text-[10px] font-medium text-zinc-500 sm:text-left">bernabe.app · Ventas · Factura</p>
      }
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Factura de venta</p>
          <p className="mt-1 font-mono text-[16px] font-semibold tracking-tight text-zinc-100">FV-1042</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">15 abr 2026 · Sucursal Centro</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-right">
          <p className="text-[9px] font-semibold uppercase text-zinc-500">Cliente</p>
          <p className="text-[12px] font-medium text-zinc-200">María Gómez</p>
          <p className="text-[10px] text-zinc-500">NIT 900.123.456-7</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
        <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.4fr)_auto_auto_auto] gap-x-2 border-b border-zinc-800/90 bg-zinc-900/30 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500 sm:px-3">
          <span>Ref.</span>
          <span>Producto</span>
          <span className="text-right">Cant.</span>
          <span className="hidden text-right sm:block">P. unit</span>
          <span className="text-right">Subt.</span>
        </div>
        <div className="divide-y divide-zinc-800/80">
          {lines.map((l) => (
            <div
              key={l.ref}
              className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.4fr)_auto_auto_auto] items-center gap-x-2 px-2 py-2 text-[11px] sm:px-3 sm:text-[12px]"
            >
              <span className="font-mono text-zinc-400">{l.ref}</span>
              <span className="min-w-0 truncate text-zinc-300">{l.desc}</span>
              <span className="text-right tabular-nums text-zinc-400">{l.qty}</span>
              <span className="hidden text-right tabular-nums text-zinc-500 sm:block">{l.unit}</span>
              <span className="text-right font-medium tabular-nums text-zinc-200">{l.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 rounded-xl border border-zinc-800/90 bg-zinc-900/25 px-3 py-2.5 text-[12px]">
        <div className="flex justify-between text-zinc-500">
          <span>Subtotal</span>
          <span className="tabular-nums text-zinc-300">$ 240.500</span>
        </div>
        <div className="flex justify-between text-zinc-500">
          <span>IVA 19%</span>
          <span className="tabular-nums text-zinc-300">$ 45.695</span>
        </div>
        <div className="flex justify-between border-t border-zinc-800 pt-2 text-[13px] font-semibold text-zinc-100">
          <span>Total</span>
          <span className="tabular-nums">$ 286.195</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300/95">
            Pagada · Efectivo
          </span>
          <span className="text-[10px] text-zinc-500">Vendedor: Luis M.</span>
        </div>
      </div>
    </LandingMockupFrame>
  );
}
