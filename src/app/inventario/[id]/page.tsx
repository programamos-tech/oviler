"use client";

import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/app/components/SessionProvider";
import { ACTIVE_BRANCH_CHANGED_EVENT } from "@/lib/active-branch";
import {
  fetchInventarioDetailBundle,
  getCachedInventarioDetail,
  type InventarioDetailProduct,
} from "@/lib/inventario-detail-cache";
import Breadcrumb from "@/app/components/Breadcrumb";
import { SearchParamsBoundary } from "@/app/components/SearchParamsBoundary";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";
import AdjustStockIcon from "@/app/components/AdjustStockIcon";
import { formatImeiDisplay } from "@/lib/imei";
import { STORE_TECH_COPY } from "@/lib/store-tech-copy";
import type { InventarioImeiUnit, InventarioImeiRemovedUnit } from "@/lib/inventario-detail-cache";

const IME = STORE_TECH_COPY.imei;

const IMEI_STATUS_LABEL: Record<string, string> = {
  in_stock: "En stock",
  sold: "Vendido",
  warranty: "En garantía",
  defective: "Defectuoso",
  returned: "Devuelto",
};

const IMEI_LOCATION_LABEL: Record<string, string> = {
  local: "Local",
  bodega: "Bodega",
};

const IVA_RATE = 0.19;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatRemovedDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Product = InventarioDetailProduct;

function salePrice(p: Product): number {
  const base = Number(p.base_price) || 0;
  return p.apply_iva ? base + Math.round(base * IVA_RATE) : base;
}

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stockRefreshToken = searchParams.get("refresh");
  const detailRefreshKey = stockRefreshToken ? Number(stockRefreshToken) || Date.now() : 0;
  const { branch, ready: sessionReady } = useSession();
  const branchId = branch?.id ?? null;
  const id = params?.id as string | undefined;
  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<number>(0);
  const [stockLocal, setStockLocal] = useState<number>(0);
  const [stockBodega, setStockBodega] = useState<number>(0);
  const [hasBodega, setHasBodega] = useState<boolean | null>(null);
  const [stockReserved, setStockReserved] = useState<number>(0);
  const [imeiUnits, setImeiUnits] = useState<InventarioImeiUnit[]>([]);
  const [imeiRemovedUnits, setImeiRemovedUnits] = useState<InventarioImeiRemovedUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeBranchEpoch, setActiveBranchEpoch] = useState(0);
  const SHOW_TRANSFER_OPTION = true;

  useEffect(() => {
    const onBranch = () => setActiveBranchEpoch((n) => n + 1);
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
  }, []);

  useEffect(() => {
    if (!id || !sessionReady) {
      if (sessionReady) setLoading(true);
      return;
    }
    if (!branchId) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    setNotFound(false);
    const skipCache = detailRefreshKey > 0;
    const cached = skipCache ? null : getCachedInventarioDetail(id, branchId, detailRefreshKey);
    if (cached) {
      setProduct(cached.product);
      setHasBodega(cached.hasBodega);
      setStockLocal(cached.stockLocal);
      setStockBodega(cached.stockBodega);
      setStock(cached.stockTotal);
      setStockReserved(cached.stockReserved);
      setImeiUnits(cached.imeiUnits ?? []);
      setImeiRemovedUnits(cached.imeiRemovedUnits ?? []);
      setNotFound(false);
      setLoading(false);
    } else {
      setLoading(true);
    }

    (async () => {
      const bundle = await fetchInventarioDetailBundle(id, branchId, detailRefreshKey);
      if (cancelled) return;
      if (!bundle) {
        setNotFound(true);
        setProduct(null);
      } else {
        setProduct(bundle.product);
        setHasBodega(bundle.hasBodega);
        setStockLocal(bundle.stockLocal);
        setStockBodega(bundle.stockBodega);
        setStock(bundle.stockTotal);
        setStockReserved(bundle.stockReserved);
        setImeiUnits(bundle.imeiUnits ?? []);
        setImeiRemovedUnits(bundle.imeiRemovedUnits ?? []);
        setNotFound(false);
      }
      setLoading(false);
      if (skipCache && !cancelled) {
        router.replace(`/inventario/${id}`, { scroll: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, branchId, sessionReady, activeBranchEpoch, detailRefreshKey, router]);

  async function handleDelete() {
    if (!product?.id) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", product.id);
    setDeleting(false);
    setDeleteOpen(false);
    router.push("/inventario");
  }

  if (loading) {
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
        <div className="min-h-[280px] animate-pulse rounded-2xl bg-white dark:bg-slate-900" aria-hidden />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-4 font-sans text-[13px] text-slate-800 antialiased dark:text-slate-100">
        <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Producto no encontrado.</p>
        <Link
          href="/inventario"
          className="inline-flex text-[14px] font-medium text-[color:var(--shell-sidebar)] transition-colors hover:underline dark:text-zinc-300"
        >
          Volver al inventario
        </Link>
      </div>
    );
  }

  const price = salePrice(product);
  const cost = Number(product.base_cost) || 0;
  const stockColorClass =
    stock === 0
      ? "text-red-600 dark:text-red-400"
      : stock <= 10
        ? "text-amber-700 dark:text-amber-300"
        : "text-[color:var(--shell-sidebar)] dark:text-zinc-300";
  const inversiónEnStock = cost * stock;
  const gananciaBrutaEstimada = (price - cost) * stock;
  const margenGanancia = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
  const iconActionClass =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200";
  const iconActionDangerClass =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30";

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      {/* Card: nombre del producto + métricas y acciones */}
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb
          items={[
            { label: "Inventario", href: "/inventario" },
            { label: product.name },
          ]}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              {product.name}
            </h1>
            <p className="mt-1 text-left text-[13px] font-medium leading-snug text-pretty text-slate-500 dark:text-slate-400">
              {product.sku || "—"}{product.category_name ? ` · ${product.category_name}` : ""}{product.brand ? ` · ${product.brand}` : ""}
            </p>
          </div>
          <div className="flex min-w-0 w-full max-w-full shrink-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto overflow-y-visible pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] print:hidden sm:w-auto sm:max-w-none sm:gap-2 sm:overflow-visible sm:pb-0 sm:pt-0.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-600/60">
            <Link
              href="/inventario"
              className={iconActionClass}
              title="Volver a inventario"
              aria-label="Volver a inventario"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <Link
              href={`/inventario/${product.id}/editar`}
              className={iconActionClass}
              title="Editar producto"
              aria-label="Editar producto"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </Link>
            <Link
              href={`/inventario/actualizar-stock?productId=${product.id}`}
              className={iconActionClass}
              title="Actualizar stock"
              aria-label="Actualizar stock"
            >
              <AdjustStockIcon className="h-5 w-5" />
            </Link>
            {SHOW_TRANSFER_OPTION && (
              <Link
                href={`/inventario/transferir?productId=${product.id}`}
                className={iconActionClass}
                title="Transferir stock"
                aria-label="Transferir stock"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className={iconActionDangerClass}
              title="Eliminar producto"
              aria-label="Eliminar producto"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="grid grid-cols-1 gap-5 sm:flex sm:flex-row sm:flex-wrap sm:gap-6 sm:gap-y-0">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Precio de venta</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">$ {formatMoney(price)}</p>
            </div>
            {hasBodega ? (
              <>
                <div className="sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Stock total</p>
                  <p className={`mt-1 text-lg font-semibold sm:text-xl ${stockColorClass}`}>{stock} unidades</p>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">Local + bodega</p>
                </div>
                <div className="sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Stock local</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">{stockLocal} unidades</p>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">Punto de venta / mostrador</p>
                </div>
                <div className="sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Stock bodega</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">{stockBodega} unidades</p>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">Almacén de la sucursal</p>
                </div>
              </>
            ) : (
              <div className="sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Stock en sucursal</p>
                <p className={`mt-1 text-lg font-semibold sm:text-xl ${stockColorClass}`}>{stock} unidades</p>
              </div>
            )}
            <div className="sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Stock reservado</p>
              <p className="mt-1 text-lg font-semibold text-amber-700 dark:text-amber-300 sm:text-xl">
                {stockReserved} unidades
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">En ventas no despachadas ni completadas</p>
            </div>
            <div className="sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Costo</p>
              <p className="mt-1 text-lg font-semibold text-slate-700 dark:text-slate-300 sm:text-xl">$ {formatMoney(cost)}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Insights: valor en stock y ganancia */}
      <div className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
          Valor e ingresos estimados
        </h2>
        <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          Con el stock actual en esta sucursal.
        </p>
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/40 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/25">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Plata en stock
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
              $ {formatMoney(inversiónEnStock)}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Inversión en {stock} {stock === 1 ? "unidad" : "unidades"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-400/40 bg-slate-200/70 px-4 py-4 dark:border-zinc-600/40 dark:bg-zinc-800/55">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--shell-sidebar)] dark:text-zinc-300">
              Margen bruto estimado
            </p>
            <p className="mt-1 text-xl font-semibold text-[color:var(--shell-sidebar)] dark:text-zinc-300 sm:text-2xl">
              $ {formatMoney(gananciaBrutaEstimada)}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-[color:var(--shell-sidebar)]/75 dark:text-zinc-300/85">
              Si vendes las {stock} {stock === 1 ? "unidad" : "unidades"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/40 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/25">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Margen de ganancia
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
              {margenGanancia}%
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Por unidad vendida
            </p>
          </div>
        </div>
      </div>

      {product.requires_imei && (
        <div className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                {IME.registerTitle}
              </h2>
              <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Unidades registradas en esta sucursal con su IMEI.
              </p>
            </div>
            <Link
              href={`/inventario/actualizar-stock?productId=${product.id}`}
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Actualizar stock
            </Link>
          </div>
          {imeiUnits.length === 0 ? (
            <p className="mt-4 text-[13px] text-slate-500 dark:text-slate-400">{IME.notInStock}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">IMEI</th>
                    {hasBodega && (
                      <th className="pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Ubicación</th>
                    )}
                    <th className="pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                    <th className="pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {imeiUnits.map((unit) => (
                    <tr key={unit.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 font-mono text-slate-800 dark:text-slate-100">{formatImeiDisplay(unit.imei)}</td>
                      {hasBodega && (
                        <td className="py-2 text-slate-600 dark:text-slate-300">
                          {IMEI_LOCATION_LABEL[unit.location ?? "local"] ?? "Local"}
                        </td>
                      )}
                      <td className="py-2 text-slate-600 dark:text-slate-300">{IMEI_STATUS_LABEL[unit.status] ?? unit.status}</td>
                      <td className="py-2">
                        {unit.sale_id ? (
                          <Link href={`/ventas/${unit.sale_id}`} className="font-medium text-sky-600 hover:underline dark:text-sky-400">
                            Ver factura
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {product.requires_imei && (
        <div className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              {IME.removedTitle}
            </h2>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              {IME.removedSubtitle}
            </p>
          </div>
          {imeiRemovedUnits.length === 0 ? (
            <p className="mt-4 text-[13px] text-slate-500 dark:text-slate-400">{IME.removedEmpty}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">IMEI</th>
                    {hasBodega && (
                      <th className="pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">Ubicación</th>
                    )}
                    <th className="pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">{IME.removedAt}</th>
                    <th className="pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">{IME.removedBy}</th>
                    <th className="pb-2 text-left font-semibold text-slate-600 dark:text-slate-300">{IME.removedReason}</th>
                  </tr>
                </thead>
                <tbody>
                  {imeiRemovedUnits.map((unit) => (
                    <tr key={unit.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 font-mono text-slate-600 dark:text-slate-300">{formatImeiDisplay(unit.imei)}</td>
                      {hasBodega && (
                        <td className="py-2 text-slate-500 dark:text-slate-400">
                          {IMEI_LOCATION_LABEL[unit.location] ?? "Local"}
                        </td>
                      )}
                      <td className="py-2 text-slate-500 dark:text-slate-400">{formatRemovedDate(unit.removed_at)}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-300">{unit.removed_by_name ?? "—"}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-300">{unit.removal_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar producto"
        message={`¿Estás seguro de que quieres eliminar "${product.name}"? Se borrará del catálogo y el inventario asociado.`}
        onConfirm={handleDelete}
        loading={deleting}
        ariaTitle={`Eliminar producto ${product.name}`}
      />
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <SearchParamsBoundary>
      <ProductDetailContent />
    </SearchParamsBoundary>
  );
}
