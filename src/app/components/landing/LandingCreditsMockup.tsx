import { LandingMockupFrame } from "@/app/components/landing/LandingMockupFrame";

const rows = [
  { cliente: "Distribuidora Sur", doc: "CR-089", saldo: "$ 1.240.000", prox: "22 abr", estado: "Al día" },
  { cliente: "Ferretería El Torno", doc: "CR-088", saldo: "$ 380.500", prox: "Hoy", estado: "Por vencer" },
  { cliente: "Ana Ruiz", doc: "CR-087", saldo: "$ 95.000", prox: "28 abr", estado: "Al día" },
  { cliente: "Cliente final", doc: "CR-086", saldo: "$ 12.400", prox: "Pagado", estado: "Cerrado" },
];

/**
 * Vista decorativa tipo cartera / créditos de clientes.
 */
export function LandingCreditsMockup() {
  return (
    <LandingMockupFrame
      toolbarExtra={
        <p className="truncate text-center text-[10px] font-medium text-zinc-500 sm:text-left">bernabe.app · Créditos</p>
      }
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Cartera</p>
          <p className="mt-1 text-[15px] font-semibold tracking-tight text-zinc-100">Créditos y saldos</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase text-amber-200/80">Por cobrar</p>
          <p className="text-[18px] font-bold tabular-nums tracking-tight text-amber-100">$ 1.7M</p>
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
        <div className="min-w-[340px] sm:min-w-0">
          <div className="grid grid-cols-[minmax(0,1.1fr)_auto_auto_auto_auto] gap-x-2 border-b border-zinc-800/90 bg-zinc-900/30 px-2 py-2 text-[9px] font-semibold uppercase tracking-wider text-zinc-500 sm:px-3">
            <span>Cliente</span>
            <span>Doc.</span>
            <span className="text-right">Saldo</span>
            <span className="text-right">Próx.</span>
            <span className="text-right">Estado</span>
          </div>
          <div className="divide-y divide-zinc-800/80">
            {rows.map((r) => (
              <div
                key={r.doc}
                className="grid grid-cols-[minmax(0,1.1fr)_auto_auto_auto_auto] items-center gap-x-2 px-2 py-2.5 text-[11px] sm:px-3 sm:text-[12px]"
              >
                <span className="min-w-0 truncate font-medium text-zinc-200">{r.cliente}</span>
                <span className="font-mono text-zinc-500">{r.doc}</span>
                <span className="text-right font-medium tabular-nums text-zinc-200">{r.saldo}</span>
                <span className="text-right text-zinc-400">{r.prox}</span>
                <span className="text-right">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      r.estado === "Por vencer"
                        ? "bg-amber-500/20 text-amber-200"
                        : r.estado === "Cerrado"
                          ? "bg-zinc-700/50 text-zinc-400"
                          : "bg-emerald-500/15 text-emerald-300/95"
                    }`}
                  >
                    {r.estado}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-zinc-600 sm:text-left">Abonos y estados · ejemplo ilustrativo</p>
    </LandingMockupFrame>
  );
}
