"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { MdCheckCircle, MdInventory2, MdLocalShipping, MdReceiptLong } from "react-icons/md";
import { getDocumentCopy, getStatusClass, getStatusLabelForSale } from "@/app/ventas/sales-mode";
import { catalogFocusRing } from "@/app/components/catalog/catalog-ui-classes";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

function displayInvoiceNumber(invoiceNumber: string) {
  if (!invoiceNumber) return invoiceNumber;
  const sin = invoiceNumber.replace(/^FV-?\s*/i, "").trim();
  return sin || invoiceNumber;
}

type OrderPayload = {
  invoice_number: string;
  total: number;
  status: string;
  payment_pending: boolean;
  payment_proof_url: string | null;
  is_delivery: boolean;
  delivery_fee: number | null;
  created_at: string;
  branch: {
    name: string;
    logo_url: string | null;
    payment_nequi: string | null;
    payment_bancolombia: string | null;
    payment_llave: string | null;
    /** Slug del catálogo /t/{slug}; null si el catálogo está desactivado. */
    catalog_slug: string | null;
  } | null;
  items: { name: string; quantity: number; unit_price: number; line_total: number }[];
};

/** Misma base que ventas/[id]: tarjeta principal y secciones. */
const cardMain = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6";
const cardSection = "rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800";
const labelMetric = "text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

/** Índice del paso activo en pedidos con envío (0–3). -1 = cancelado. */
function getDeliveryStepIndex(status: string): number {
  if (status === "cancelled") return -1;
  if (status === "pending") return 0;
  if (status === "preparing" || status === "packing") return 1;
  if (status === "on_the_way") return 2;
  if (status === "delivered" || status === "completed") return 3;
  return 0;
}

const DELIVERY_STEPS = [
  { label: "Creado", Icon: MdReceiptLong },
  { label: "En alistamiento", Icon: MdInventory2 },
  { label: "Despachado", Icon: MdLocalShipping },
  { label: "Finalizado", Icon: MdCheckCircle },
] as const;

function OrderStatusStepper({ status, isDelivery }: { status: string; isDelivery: boolean }) {
  if (!isDelivery) return null;
  const currentIndex = getDeliveryStepIndex(status);
  const cancelled = currentIndex === -1;

  return (
    <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
      <p className="mb-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Avance del pedido
      </p>
      {cancelled && (
        <p className="mb-4 text-center text-[13px] font-semibold text-red-600 dark:text-red-400">
          Este pedido fue cancelado.
        </p>
      )}
      <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible">
        <div className="flex min-w-[min(100%,520px)] items-start justify-center sm:min-w-0">
          {DELIVERY_STEPS.map((step, i) => {
            const Icon = step.Icon;
            const isPast = !cancelled && currentIndex > i;
            const isCurrent = !cancelled && currentIndex === i;
            const isFuture = !cancelled && currentIndex < i;
            const lineDone = !cancelled && currentIndex > i;

            return (
              <Fragment key={step.label}>
                {i > 0 && (
                  <div
                    role="presentation"
                    className={`mx-0.5 mt-[22px] h-0 min-w-[12px] flex-1 border-t-2 border-dotted sm:mt-5 sm:min-w-[16px] ${
                      lineDone ? "border-emerald-500 dark:border-emerald-400" : "border-slate-300 dark:border-slate-600"
                    }`}
                  />
                )}
                <div className="flex w-[68px] shrink-0 flex-col items-center sm:w-[76px] md:w-[88px]">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors sm:h-11 sm:w-11 ${
                      cancelled
                        ? "border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500"
                        : isPast
                          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-500"
                          : isCurrent
                            ? "border-nou-500 bg-nou-500/15 text-nou-600 shadow-[0_0_0_3px_rgba(0,191,99,0.22)] dark:border-nou-400 dark:bg-nou-500/20 dark:text-nou-300"
                            : isFuture
                              ? "border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-500"
                              : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" aria-hidden />
                  </div>
                  <span
                    className={`mt-2 text-center text-[9px] font-semibold leading-tight sm:text-[10px] md:text-[11px] ${
                      cancelled
                        ? "text-slate-400 dark:text-slate-500"
                        : isCurrent
                          ? "text-nou-600 dark:text-nou-300"
                          : isPast
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
      <p className="sr-only">
        Estado actual del envío: paso {cancelled ? "cancelado" : `${currentIndex + 1} de ${DELIVERY_STEPS.length}`}.
      </p>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* ignore */
    }
  }
  if (!value?.trim()) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <p className={labelMetric}>{label}</p>
      <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-900 dark:text-slate-50">{value}</p>
      <button
        type="button"
        onClick={() => void copy()}
        className={`mt-2 text-sm font-semibold text-ov-pink hover:underline dark:text-ov-pink-muted ${catalogFocusRing} rounded`}
      >
        {done ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export default function PedidoPublicPage() {
  const params = useParams();
  const token = (params?.token as string) ?? "";
  const [data, setData] = useState<OrderPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const doc = getDocumentCopy(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/catalog/order/${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json.error ?? "Pedido no encontrado");
          return;
        }
        if (!cancelled) setData(json as OrderPayload);
      } catch {
        if (!cancelled) setError("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function uploadProof() {
    if (!file || !token) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/catalog/order/${encodeURIComponent(token)}/proof`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al subir");
      const refreshed = await fetch(`/api/catalog/order/${encodeURIComponent(token)}`);
      const j2 = await refreshed.json();
      if (refreshed.ok) setData(j2 as OrderPayload);
      setFile(null);
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Error");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-6xl items-center justify-center px-4 text-[14px] text-slate-500 dark:text-slate-400 lg:px-8">
        {doc.loading}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-semibold text-slate-800 dark:text-slate-100">{error ?? doc.notFound}</p>
      </div>
    );
  }

  const statusLabel = getStatusLabelForSale(data.status, data.is_delivery);
  const statusClass = getStatusClass(data.status);
  const showPayment = data.payment_pending && data.branch;
  const invDisplay = displayInvoiceNumber(data.invoice_number);
  const deliveryFee = Number(data.delivery_fee) || 0;
  const itemsSubtotal = data.items.reduce((s, it) => s + it.line_total, 0);

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {/* Misma jerarquía que ventas/[id]: tarjeta principal con título + métricas */}
      <div className={cardMain}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {data.branch?.logo_url ? (
              <img
                src={data.branch.logo_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[11px] font-medium text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500">
                Logo
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{doc.cap}</p>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                {data.branch?.name ?? "Tienda"}
              </h1>
            </div>
          </div>
          {data.branch?.catalog_slug ? (
            <Link
              href={`/t/${encodeURIComponent(data.branch.catalog_slug)}`}
              className={`inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700 sm:self-auto ${catalogFocusRing}`}
            >
              <span aria-hidden>←</span> Volver al catálogo
            </Link>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <p className={labelMetric}>Número</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">{invDisplay}</p>
          </div>
          <div className="min-w-0 md:border-l md:border-slate-200 md:pl-8 md:dark:border-slate-700">
            <p className={labelMetric}>Estado</p>
            <p className={`mt-0.5 text-lg font-semibold md:text-xl ${statusClass}`}>{statusLabel}</p>
          </div>
          <div className="min-w-0 md:border-l md:border-slate-200 md:pl-8 md:dark:border-slate-700">
            <p className={labelMetric}>Total</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 md:text-xl">{formatMoney(data.total)}</p>
          </div>
        </div>

        <OrderStatusStepper status={data.status} isDelivery={data.is_delivery} />
      </div>

      <div
        className={
          showPayment
            ? "grid gap-6 lg:grid-cols-2 lg:items-start"
            : "grid gap-6"
        }
      >
        <div className={cardSection}>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {doc.productsHeading}
          </h2>
          <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
            {data.items.map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                <span className="min-w-0 text-[14px] font-medium text-slate-800 dark:text-slate-100">
                  {it.name}{" "}
                  <span className="font-normal text-slate-500 dark:text-slate-400">× {it.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums text-[14px] font-semibold text-slate-900 dark:text-slate-50">
                  {formatMoney(it.line_total)}
                </span>
              </li>
            ))}
          </ul>
          {data.is_delivery && deliveryFee > 0 && (
            <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="flex justify-between text-[13px] text-slate-600 dark:text-slate-400">
                <span>Subtotal productos</span>
                <span className="tabular-nums font-medium text-slate-800 dark:text-slate-200">{formatMoney(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between text-[13px] text-slate-600 dark:text-slate-400">
                <span>Envío</span>
                <span className="tabular-nums font-medium text-slate-800 dark:text-slate-200">{formatMoney(deliveryFee)}</span>
              </div>
            </div>
          )}
        </div>

        {showPayment && (
          <div className={`${cardMain} space-y-4 lg:sticky lg:top-6`}>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Pago por transferencia</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                Realiza el pago del total indicado y adjunta el comprobante. Nos comunicaremos contigo para coordinar el envío.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 min-[1600px]:grid-cols-3">
              <CopyRow label="Nequi" value={data.branch?.payment_nequi ?? ""} />
              <CopyRow label="Bancolombia / cuenta" value={data.branch?.payment_bancolombia ?? ""} />
              <CopyRow label="Llave / otro" value={data.branch?.payment_llave ?? ""} />
            </div>

            {!data.payment_proof_url ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/30">
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-200">
                  Adjuntar comprobante (JPG, PNG, WebP, máx. 5 MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-2 w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 file:outline-none file:transition file:hover:border-slate-400 dark:text-slate-300 dark:file:border-slate-600 dark:file:bg-slate-800 dark:file:text-slate-200"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  disabled={!file || uploading}
                  onClick={() => void uploadProof()}
                  className={`mt-3 w-full rounded-lg bg-ov-pink py-2.5 text-sm font-bold text-white shadow hover:bg-ov-pink-hover disabled:opacity-40 dark:bg-ov-pink dark:hover:bg-ov-pink-hover ${catalogFocusRing}`}
                >
                  {uploading ? "Subiendo…" : "Enviar comprobante"}
                </button>
                {uploadErr && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadErr}</p>}
              </div>
            ) : (
              <p className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400">Comprobante recibido. Gracias.</p>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
        Guarda este enlace para ver el estado de tu pedido.{" "}
        <span className="font-semibold text-[#1e3522] dark:text-emerald-400/90">Bernabé Comercios</span>
      </p>
    </div>
  );
}
