"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStatusLabelForSale } from "@/app/ventas/sales-mode";

type WebSaleRow = {
  id: string;
  invoice_number: string | null;
  total: number | null;
  status: string;
  payment_pending: boolean;
  created_at: string | null;
  customers: { name: string | null } | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

const SIMPLE_CHIP_BASE =
  "inline-block rounded-full border px-3 py-0.5 text-[11px] font-medium leading-tight";

function statusChipClass(status: string): string {
  if (status === "cancelled") {
    return `${SIMPLE_CHIP_BASE} border-red-200/90 bg-red-50/90 text-red-800 dark:border-red-900/55 dark:bg-red-950/35 dark:text-red-200`;
  }
  if (status === "completed" || status === "delivered") {
    return `${SIMPLE_CHIP_BASE} border-nou-200 bg-nou-50 text-nou-900 dark:border-emerald-900/45 dark:bg-emerald-950/30 dark:text-emerald-100`;
  }
  if (status === "pending") {
    return `${SIMPLE_CHIP_BASE} border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200`;
  }
  if (["preparing", "packing", "on_the_way"].includes(status)) {
    return `${SIMPLE_CHIP_BASE} border-amber-200/80 bg-amber-50/70 text-amber-950 dark:border-amber-900/45 dark:bg-amber-950/25 dark:text-amber-100`;
  }
  return `${SIMPLE_CHIP_BASE} border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300`;
}

export default function CatalogoPage() {
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState("");
  const [catalogEnabled, setCatalogEnabled] = useState(false);
  const [catalogSlug, setCatalogSlug] = useState("");
  const [publicOrigin, setPublicOrigin] = useState("");
  const [webSales, setWebSales] = useState<WebSaleRow[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    setPublicOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) {
        setLoading(false);
        return;
      }
      const { data: branch } = await supabase
        .from("branches")
        .select("id, name, catalog_enabled, catalog_slug")
        .eq("id", ub.branch_id)
        .single();

      if (!branch || cancelled) {
        setLoading(false);
        return;
      }

      setBranchName((branch as { name?: string }).name ?? "");
      setCatalogEnabled(!!(branch as { catalog_enabled?: boolean }).catalog_enabled);
      setCatalogSlug((branch as { catalog_slug?: string | null }).catalog_slug ?? "");

      const branchId = (branch as { id?: string }).id;
      if (branchId) {
        const { data: salesRows } = await supabase
          .from("sales")
          .select("id, invoice_number, total, status, payment_pending, created_at, customers(name)")
          .eq("branch_id", branchId)
          .eq("channel", "web_catalog")
          .order("created_at", { ascending: false })
          .limit(80);
        if (!cancelled) setWebSales((salesRows ?? []) as WebSaleRow[]);
      }

      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const catalogUrl = catalogSlug.trim() && publicOrigin
    ? `${publicOrigin}/t/${catalogSlug.trim().toLowerCase()}`
    : "";

  const paymentLabel = (sale: WebSaleRow) => {
    if (sale.status === "cancelled") return "Cancelado";
    return sale.payment_pending ? "Pendiente" : "Pagado";
  };

  const paymentClass = (sale: WebSaleRow) => {
    if (sale.status === "cancelled") return statusChipClass("cancelled");
    return sale.payment_pending ? statusChipClass("pending") : statusChipClass("completed");
  };

  const statusLabel = (sale: WebSaleRow) => {
    if (sale.status === "completed" || sale.status === "delivered") return "Finalizada";
    if (sale.status === "pending") return "Creado";
    if (sale.status === "preparing" || sale.status === "packing") return "En alistamiento";
    if (sale.status === "on_the_way") return "Despachado";
    if (sale.status === "cancelled") return "Cancelado";
    return getStatusLabelForSale(sale.status, true);
  };

  async function handleCopyPublicLink() {
    if (!catalogUrl) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(catalogUrl);
      } else {
        const input = document.createElement("input");
        input.value = catalogUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopyFeedback("Link copiado");
    } catch {
      setCopyFeedback("No se pudo copiar el link");
    } finally {
      setTimeout(() => setCopyFeedback(null), 2200);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">Catálogo</h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Vista general del catálogo público y productos visibles para clientes.
            </p>
          </div>
          <Link
            href="/catalogo/configuracion"
            className="inline-flex h-9 items-center rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
          >
            Configurar mi tienda web
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="min-h-[280px] animate-pulse rounded-3xl bg-white dark:bg-slate-900" aria-hidden />
      ) : (
        <>
          <section className="rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 px-3 py-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sucursal</p>
                <p className="mt-1 text-[14px] font-semibold text-slate-900 dark:text-slate-50">{branchName || "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 px-3 py-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Estado catálogo</p>
                <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${catalogEnabled ? "border border-slate-300/90 bg-slate-200/70 text-[color:var(--shell-sidebar)]" : "border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {catalogEnabled ? "Activo" : "Inactivo"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 px-3 py-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ventas web</p>
                <p className="mt-1 text-[14px] font-semibold text-slate-900 dark:text-slate-50">{webSales.length}</p>
              </div>
            </div>
            {catalogUrl && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Enlace público</p>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <a href={catalogUrl} target="_blank" rel="noreferrer" className="inline-flex break-all text-[13px] font-medium text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300">
                    {catalogUrl}
                  </a>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyPublicLink}
                      className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Copiar link
                    </button>
                    <a
                      href={catalogUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Abrir tienda
                    </a>
                  </div>
                </div>
                {copyFeedback ? (
                  <p className="mt-1 text-[12px] font-medium text-[color:var(--shell-sidebar)] dark:text-zinc-300">{copyFeedback}</p>
                ) : null}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white px-4 py-4 dark:bg-slate-900 sm:px-6 sm:py-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-50">Ventas realizadas en mi tienda web</h2>
              <Link
                href="/catalogo/configuracion"
                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Configurar mi tienda web
              </Link>
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 xl:block">
              <div className="grid grid-cols-[minmax(110px,0.7fr)_minmax(190px,1.4fr)_minmax(120px,0.8fr)_minmax(110px,0.75fr)_minmax(110px,0.75fr)_80px] gap-x-4 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Factura</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cliente</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Estado</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pago</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ver</p>
              </div>
              {webSales.map((sale, idx) => (
                <div
                  key={sale.id}
                  className={`grid grid-cols-[minmax(110px,0.7fr)_minmax(190px,1.4fr)_minmax(120px,0.8fr)_minmax(110px,0.75fr)_minmax(110px,0.75fr)_80px] items-center gap-x-4 px-5 py-3 ${idx === webSales.length - 1 ? "" : "border-b border-slate-100 dark:border-slate-800"}`}
                >
                  <p className="truncate text-[13px] font-medium text-slate-900 dark:text-slate-50">#{sale.invoice_number || "—"}</p>
                  <p className="truncate text-[13px] text-slate-600 dark:text-slate-300">{sale.customers?.name || "Cliente web"}</p>
                  <p className="text-[13px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">$ {formatMoney(Number(sale.total) || 0)}</p>
                  <span className={statusChipClass(sale.status)}>{statusLabel(sale)}</span>
                  <span className={paymentClass(sale)}>{paymentLabel(sale)}</span>
                  <Link
                    href={`/ventas/${sale.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[color:var(--shell-sidebar)] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-zinc-300"
                    aria-label="Ver venta"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>

            {webSales.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-[13px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/25 dark:text-slate-300">
                Aún no hay ventas registradas desde la tienda web.
              </div>
            ) : null}

            <div className="space-y-2 xl:hidden">
              {webSales.map((sale) => (
                <div key={sale.id} className="rounded-2xl border border-slate-100 bg-slate-50/40 px-3 py-3 dark:border-slate-800 dark:bg-slate-800/25">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">#{sale.invoice_number || "—"} · {sale.customers?.name || "Cliente web"}</p>
                      <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                        {sale.created_at ? new Date(sale.created_at).toLocaleString("es-CO") : "Sin fecha"}
                      </p>
                    </div>
                    <Link
                      href={`/ventas/${sale.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[color:var(--shell-sidebar)] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-zinc-300"
                      aria-label="Ver venta"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z"
                        />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </Link>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={statusChipClass(sale.status)}>{statusLabel(sale)}</span>
                    <span className={paymentClass(sale)}>{paymentLabel(sale)}</span>
                    <span className="ml-auto text-[12px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">$ {formatMoney(Number(sale.total) || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
