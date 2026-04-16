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
        <p className="truncate text-center text-[10px] font-medium text-zinc-500 sm:text-left">bernabe.app · Inventario</p>
      }
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Productos</p>
          <p className="mt-1 text-[15px] font-semibold tracking-tight text-zinc-100">Existencias por ubicación</p>
        </div>
        <span className="h-8 rounded-lg bg-zinc-100 px-2.5 text-[11px] font-semibold leading-8 text-zinc-900">Importar CSV</span>
      </div>

      <div className="min-w-0 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] gap-x-2 border-b border-zinc-800/90 bg-zinc-900/30 px-2 py-2 text-[9px] font-semibold uppercase tracking-wider text-zinc-500 sm:px-3">
          <span>SKU</span>
          <span>Nombre</span>
          <span className="text-right">Stock</span>
          <span className="text-right">Mín.</span>
          <span className="text-right">Ubic.</span>
        </div>
        <div className="divide-y divide-zinc-800/80">
          {rows.map((r) => (
            <div
              key={r.sku}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-x-2 px-2 py-2.5 text-[11px] sm:px-3 sm:text-[12px]"
            >
              <span className="font-mono text-zinc-500">{r.sku}</span>
              <span className="min-w-0 truncate text-zinc-200">{r.nombre}</span>
              <span
                className={`text-right font-semibold tabular-nums ${
                  r.stock <= r.min ? "text-amber-300" : "text-zinc-200"
                }`}
              >
                {r.stock}
              </span>
              <span className="text-right tabular-nums text-zinc-500">{r.min}</span>
              <span className="text-right text-[10px] text-zinc-500">{r.ubic}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-600">
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-200/90">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
          Bajo mínimo
        </span>
        Alertas para reponer sin salir del panel.
      </p>
    </LandingMockupFrame>
  );
}
