"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { optionLabel } from "@/lib/whatsapp/flow";

type Lead = {
  id: string;
  wa_id: string;
  profile_name: string | null;
  store_status: string;
  inventory_system: string;
  wants_demo: boolean;
  created_at: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InternoWhatsAppLeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/internal/whatsapp-leads", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json.error ?? `Error ${res.status}`);
          return;
        }
        if (!cancelled) {
          setError(null);
          setLeads(json.leads as Lead[]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="mx-auto min-w-0 max-w-[1200px] space-y-6 font-sans text-[13px] text-slate-800 dark:text-slate-100">
      <header className="rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Link href="/interno" className="hover:underline">
                Bernabé backOffice
              </Link>
              <span aria-hidden> · </span>
              WhatsApp
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Leads de demo
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Personas que completaron el chatbot en el WhatsApp de Berea.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-100/90 px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-200"
          >
            Actualizar
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">No se pudieron cargar los leads</p>
          <p className="mt-1 text-sm opacity-90">{error}</p>
        </div>
      ) : !leads ? (
        <div className="min-h-[200px] animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
      ) : leads.length === 0 ? (
        <div className="rounded-2xl bg-white px-5 py-10 text-center text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          Aún no hay conversaciones completadas. Cuando alguien termine el menú en WhatsApp, aparece acá.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white dark:divide-slate-800 dark:bg-slate-900">
          {leads.map((lead) => (
            <li key={lead.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-50">
                  {lead.profile_name || "Sin nombre"}
                  {lead.wants_demo ? (
                    <span className="ml-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                      Quiere demo
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Ahora no
                    </span>
                  )}
                </p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  {optionLabel(lead.store_status)} · {optionLabel(lead.inventory_system)}
                </p>
                <p className="mt-0.5 text-[12px] text-slate-400">{formatWhen(lead.created_at)}</p>
              </div>
              <a
                href={`https://wa.me/${lead.wa_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white hover:bg-[color:var(--shell-sidebar-cta-hover)]"
              >
                Abrir chat
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
