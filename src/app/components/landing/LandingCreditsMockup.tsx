import { LandingMockupFrame } from "@/app/components/landing/LandingMockupFrame";

const rows = [
  { cliente: "Distribuidora Sur", doc: "CR-089", saldo: "$ 1.240.000", prox: "22 abr", estado: "Al día" as const },
  { cliente: "Ferretería El Torno", doc: "CR-088", saldo: "$ 380.500", prox: "Hoy", estado: "Por vencer" as const },
  { cliente: "Ana Ruiz", doc: "CR-087", saldo: "$ 95.000", prox: "28 abr", estado: "Al día" as const },
  { cliente: "Cliente final", doc: "CR-086", saldo: "$ 12.400", prox: "Pagado", estado: "Cerrado" as const },
];

function estadoBadgeClass(estado: (typeof rows)[number]["estado"]) {
  if (estado === "Por vencer") return "berea-landing-badge-warn";
  if (estado === "Cerrado") return "berea-landing-badge-neutral";
  return "berea-landing-badge-ok";
}

/**
 * Vista decorativa tipo cartera / créditos de clientes.
 */
export function LandingCreditsMockup() {
  return (
    <LandingMockupFrame
      toolbarExtra={
        <p className="berea-landing-mockup-text truncate text-center text-[10px] font-medium sm:text-left">
          berea.app · Créditos
        </p>
      }
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="berea-landing-mockup-text text-[10px] font-semibold uppercase tracking-[0.12em]">Cartera</p>
          <p className="berea-landing-mockup-text-strong mt-1 text-[15px] font-semibold tracking-tight">
            Créditos y saldos
          </p>
        </div>
        <div className="berea-landing-kpi-highlight">
          <p className="berea-landing-kpi-highlight-label">Por cobrar</p>
          <p className="berea-landing-kpi-highlight-value">$ 1.7M</p>
        </div>
      </div>

      <div className="berea-landing-mockup-panel min-w-0 overflow-x-auto rounded-xl border">
        <div className="min-w-[340px] sm:min-w-0">
          <div className="grid grid-cols-[minmax(0,1.1fr)_auto_auto_auto_auto] gap-x-2 border-b border-[var(--landing-border)] bg-[var(--landing-surface)] px-2 py-2 text-[9px] font-semibold uppercase tracking-wider berea-landing-mockup-text sm:px-3">
            <span>Cliente</span>
            <span>Doc.</span>
            <span className="text-right">Saldo</span>
            <span className="text-right">Próx.</span>
            <span className="text-right">Estado</span>
          </div>
          <div className="divide-y divide-[var(--landing-border)]">
            {rows.map((r) => (
              <div
                key={r.doc}
                className="grid grid-cols-[minmax(0,1.1fr)_auto_auto_auto_auto] items-center gap-x-2 px-2 py-2.5 text-[11px] sm:px-3 sm:text-[12px]"
              >
                <span className="berea-landing-mockup-text-strong min-w-0 truncate font-medium">{r.cliente}</span>
                <span className="berea-landing-mockup-text font-mono">{r.doc}</span>
                <span className="berea-landing-mockup-text-strong text-right font-medium tabular-nums">{r.saldo}</span>
                <span className="berea-landing-mockup-text text-right">{r.prox}</span>
                <span className="text-right">
                  <span className={estadoBadgeClass(r.estado)}>{r.estado}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="berea-landing-mockup-text mt-2 text-center text-[10px] sm:text-left">
        Abonos y estados · ejemplo ilustrativo
      </p>
    </LandingMockupFrame>
  );
}
