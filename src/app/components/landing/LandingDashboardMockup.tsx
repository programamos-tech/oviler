import { LandingMockupFrame } from "@/app/components/landing/LandingMockupFrame";

/**
 * Vista decorativa del panel (solo landing): sugiere cómo se ve Berea Comercios por dentro.
 */
export function LandingDashboardMockup() {
  const rows = [
    { inv: "FV-1042", client: "María Gómez", total: "$ 842.000", estado: "Pagada" },
    { inv: "FV-1041", client: "Cliente final", total: "$ 125.500", estado: "Pagada" },
    { inv: "FV-1040", client: "Distribuidora Sur", total: "$ 2.100.000", estado: "Pendiente" },
    { inv: "FV-1039", client: "Ana Ruiz", total: "$ 310.000", estado: "Pagada" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <LandingMockupFrame
        toolbarExtra={
          <p className="truncate text-center text-[10px] font-medium text-zinc-500 sm:text-left">berea.app · Panel</p>
        }
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Panel · Reportes</p>
            <p className="mt-1 text-[15px] font-semibold tracking-tight text-zinc-100">Resumen del período</p>
            <p className="mt-0.5 text-[12px] text-zinc-500">Ventas e ingresos de tu sucursal</p>
          </div>
          <div className="flex gap-2">
            <span className="hidden h-8 rounded-lg bg-zinc-800 px-2.5 text-[11px] font-medium leading-8 text-zinc-400 sm:inline-block">
              Hoy
            </span>
            <span className="h-8 rounded-lg bg-zinc-100 px-3 text-[11px] font-semibold leading-8 text-zinc-900">
              Actualizar
            </span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Ingreso neto", value: "$ 4.2M" },
            { label: "Ventas", value: "128" },
            { label: "Stock", value: "1.4k" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-2.5 py-2.5 sm:px-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">{m.label}</p>
              <p className="mt-1 text-[15px] font-semibold tabular-nums text-zinc-100 sm:text-lg">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="min-w-0 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto_auto] gap-x-2 border-b border-zinc-800/90 bg-zinc-900/30 px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-zinc-500 sm:px-4">
            <span>Factura</span>
            <span className="min-w-0">Cliente</span>
            <span className="text-right">Total</span>
            <span className="text-right">Estado</span>
          </div>
          <div className="divide-y divide-zinc-800/80">
            {rows.map((r) => (
              <div
                key={r.inv}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto_auto] items-center gap-x-2 px-3 py-2.5 text-[12px] sm:px-4 sm:text-[13px]"
              >
                <span className="font-medium tabular-nums text-zinc-200">{r.inv}</span>
                <span className="min-w-0 truncate text-zinc-400">{r.client}</span>
                <span className="text-right font-medium tabular-nums text-zinc-200">{r.total}</span>
                <span className="text-right">
                  <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300/95">
                    {r.estado}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-800/80 px-3 py-2 text-center text-[10px] text-zinc-500 sm:px-4 sm:text-left">
            Mostrando 4 ventas recientes · datos de ejemplo
          </div>
        </div>
      </LandingMockupFrame>
    </div>
  );
}
