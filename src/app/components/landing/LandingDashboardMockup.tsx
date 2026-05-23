import { LandingMockupFrame } from "@/app/components/landing/LandingMockupFrame";

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
          <p className="berea-landing-mockup-text truncate text-center text-[10px] font-medium sm:text-left">
            berea.app · Panel
          </p>
        }
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="berea-landing-mockup-text text-[10px] font-semibold uppercase tracking-[0.12em]">
              Panel · Reportes
            </p>
            <p className="berea-landing-mockup-text-strong mt-1 text-[15px] font-semibold tracking-tight">
              Resumen del período
            </p>
            <p className="berea-landing-mockup-text mt-0.5 text-[12px]">Ventas e ingresos de tu sucursal</p>
          </div>
          <div className="flex gap-2">
            <span className="berea-landing-mockup-text hidden h-8 rounded-lg border border-[var(--landing-border)] bg-[var(--landing-surface)] px-2.5 text-[11px] font-medium leading-8 sm:inline-block">
              Hoy
            </span>
            <span className="berea-landing-mockup-btn">Actualizar</span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Ingreso neto", value: "$ 4.2M" },
            { label: "Ventas", value: "128" },
            { label: "Stock", value: "1.4k" },
          ].map((m) => (
            <div
              key={m.label}
              className="berea-landing-mockup-panel rounded-xl border px-2.5 py-2.5 sm:px-3"
            >
              <p className="berea-landing-mockup-text text-[9px] font-semibold uppercase tracking-wide">
                {m.label}
              </p>
              <p className="berea-landing-mockup-text-strong mt-1 text-[15px] font-semibold tabular-nums sm:text-lg">
                {m.value}
              </p>
            </div>
          ))}
        </div>

        <div className="berea-landing-mockup-panel min-w-0 overflow-x-auto rounded-xl border">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto_auto] gap-x-2 border-b border-[var(--landing-border)] bg-[var(--landing-surface)] px-3 py-2 text-[9px] font-semibold uppercase tracking-wider berea-landing-mockup-text sm:px-4">
            <span>Factura</span>
            <span className="min-w-0">Cliente</span>
            <span className="text-right">Total</span>
            <span className="text-right">Estado</span>
          </div>
          <div className="divide-y divide-[var(--landing-border)]">
            {rows.map((r) => (
              <div
                key={r.inv}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto_auto] items-center gap-x-2 px-3 py-2.5 text-[12px] sm:px-4 sm:text-[13px]"
              >
                <span className="berea-landing-mockup-text-strong font-medium tabular-nums">{r.inv}</span>
                <span className="berea-landing-mockup-text min-w-0 truncate">{r.client}</span>
                <span className="berea-landing-mockup-text-strong text-right font-medium tabular-nums">{r.total}</span>
                <span className="text-right">
                  <span
                    className={
                      r.estado === "Pagada" ? "berea-landing-badge-ok" : "berea-landing-badge-warn"
                    }
                  >
                    {r.estado}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="berea-landing-mockup-text border-t border-[var(--landing-border)] px-3 py-2 text-center text-[10px] sm:px-4 sm:text-left">
            Mostrando 4 ventas recientes · datos de ejemplo
          </div>
        </div>
      </LandingMockupFrame>
    </div>
  );
}
