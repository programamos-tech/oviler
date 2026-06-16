import { LandingMockupFrame } from "@/app/components/landing/LandingMockupFrame";

const rows = [
  { sku: "AUD-01", nombre: "Audífonos Bluetooth", stock: 24, min: 5, ubic: "Mostrador" },
  { sku: "CBL-USBC", nombre: "Cable USB-C 2m", stock: 8, min: 10, ubic: "Bodega" },
  { sku: "FUN-14", nombre: "Funda silicona", stock: 42, min: 8, ubic: "Mostrador" },
  { sku: "MEM-64", nombre: "Memoria 64GB", stock: 3, min: 6, ubic: "Bodega" },
];

/**
 * Vista decorativa tipo inventario / existencias.
 */
export function LandingInventoryMockup() {
  return (
    <LandingMockupFrame
      toolbarExtra={
        <p className="berea-landing-mockup-text truncate text-center text-[10px] font-medium sm:text-left">
          berea.app · Inventario
        </p>
      }
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="berea-landing-mockup-text text-[10px] font-semibold uppercase tracking-[0.12em]">Productos</p>
          <p className="berea-landing-mockup-text-strong mt-1 text-[15px] font-semibold tracking-tight">
            Existencias por ubicación
          </p>
        </div>
        <span className="berea-landing-mockup-cta">Importar CSV</span>
      </div>

      <div className="berea-landing-mockup-panel min-w-0 overflow-x-auto rounded-xl border">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] gap-x-2 border-b border-[var(--landing-mockup-border)] bg-[var(--landing-mockup-surface)] px-2 py-2 text-[9px] font-semibold uppercase tracking-wider berea-landing-mockup-text sm:px-3">
          <span>SKU</span>
          <span>Nombre</span>
          <span className="text-right">Stock</span>
          <span className="text-right">Mín.</span>
          <span className="text-right">Ubic.</span>
        </div>
        <div className="divide-y divide-[var(--landing-mockup-border)]">
          {rows.map((r) => (
            <div
              key={r.sku}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-x-2 px-2 py-2.5 text-[11px] sm:px-3 sm:text-[12px]"
            >
              <span className="berea-landing-mockup-text font-mono">{r.sku}</span>
              <span className="berea-landing-mockup-text-strong min-w-0 truncate">{r.nombre}</span>
              <span
                className={`text-right font-semibold tabular-nums ${
                  r.stock <= r.min ? "berea-landing-stock-low" : "berea-landing-mockup-text-strong"
                }`}
              >
                {r.stock}
              </span>
              <span className="berea-landing-mockup-text text-right tabular-nums">{r.min}</span>
              <span className="berea-landing-mockup-text text-right text-[10px]">{r.ubic}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="berea-landing-mockup-text mt-2 flex flex-wrap items-center gap-2 text-[10px]">
        <span className="berea-landing-stock-alert">
          <span className="berea-landing-stock-alert-dot" aria-hidden />
          Bajo mínimo
        </span>
        Alertas para reponer sin salir del panel.
      </p>
    </LandingMockupFrame>
  );
}
