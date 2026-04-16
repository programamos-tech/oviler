"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";
import Breadcrumb from "@/app/components/Breadcrumb";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";
import LocationPathWithIcons from "@/app/components/LocationPathWithIcons";

const IVA_RATE = 0.19;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

type Product = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  category_name?: string | null;
  brand: string | null;
  description: string | null;
  base_price: number | null;
  base_cost: number | null;
  apply_iva: boolean;
};

function salePrice(p: Product): number {
  const base = Number(p.base_price) || 0;
  return p.apply_iva ? base + Math.round(base * IVA_RATE) : base;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<number>(0);
  const [stockLocal, setStockLocal] = useState<number>(0);
  const [stockBodega, setStockBodega] = useState<number>(0);
  const [hasBodega, setHasBodega] = useState<boolean | null>(null);
  const [stockReserved, setStockReserved] = useState<number>(0);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [locationRows, setLocationRows] = useState<{ quantity: number; path: string; locationId: string }[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeBranchEpoch, setActiveBranchEpoch] = useState(0);
  const SHOW_TRANSFER_OPTION = true;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBranch = () => setActiveBranchEpoch((n) => n + 1);
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
  }, []);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    setLocationsLoading(true);
    (async () => {
      const [{ data: p, error: productError }, { data: authData }] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, sku, category_id, brand, description, base_price, base_cost, apply_iva, categories(name)")
          .eq("id", id)
          .single(),
        supabase.auth.getUser(),
      ]);

      if (productError || !p || cancelled) {
        if (!cancelled) setNotFound(true);
        setLoading(false);
        setLocationsLoading(false);
        return;
      }

      const catRow = p.categories as { name: string } | { name: string }[] | null | undefined;
      const categoryName = Array.isArray(catRow) ? catRow[0]?.name : catRow?.name;
      const productData: Product = {
        ...(p as Product),
        category_name: categoryName ?? undefined,
      };
      if (!cancelled) setProduct(productData);

      const user = authData.user;
      if (!user || cancelled) {
        if (!cancelled) setLoading(false);
        setLocationsLoading(false);
        return;
      }

      const branchId = await resolveActiveBranchId(supabase, user.id);
      if (!branchId || cancelled) {
        if (!cancelled) setLoading(false);
        setLocationsLoading(false);
        return;
      }
      if (!cancelled) setBranchId(branchId);

      const { data: branchRow } = await supabase.from("branches").select("has_bodega").eq("id", branchId).single();
      if (!cancelled) setHasBodega(branchRow?.has_bodega !== false);

      const STATUSES_THAT_RESERVE = ["pending", "preparing", "packing"];

      const [invRes, reservedRes] = await Promise.all([
        supabase.from("inventory").select("quantity, location").eq("product_id", id).eq("branch_id", branchId),
        supabase
          .from("sale_items")
          .select("quantity, sales!inner(branch_id, status)")
          .eq("product_id", id)
          .eq("sales.branch_id", branchId)
          .in("sales.status", STATUSES_THAT_RESERVE),
      ]);

      let local = 0;
      let bodega = 0;
      for (const r of invRes.data ?? []) {
        const q = r.quantity ?? 0;
        const loc = (r as { location?: string }).location;
        if (loc === "bodega") bodega += q;
        else local += q;
      }
      const total = local + bodega;
      if (!cancelled) {
        setStock(total);
        setStockLocal(local);
        setStockBodega(bodega);
      }

      const reserved = (reservedRes.data ?? []).reduce((sum, row) => {
        const raw = row as { quantity: number; sales: { branch_id: string; status: string } | { branch_id: string; status: string }[] | null };
        const s = Array.isArray(raw.sales) ? raw.sales[0] ?? null : raw.sales;
        if (!s || s.status === "cancelled") return sum;
        return sum + (Number(raw.quantity) || 0);
      }, 0);
      if (!cancelled) setStockReserved(reserved);

      if (!cancelled) setLoading(false);

      const { data: ilDataRaw } = await supabase
        .from("inventory_locations")
        .select("location_id, quantity")
        .eq("product_id", id);
      if (cancelled) return;
      const { data: branchLocIds } = await supabase.from("locations").select("id").eq("branch_id", branchId);
      const allowedLocIds = new Set((branchLocIds ?? []).map((r: { id: string }) => r.id));
      const ilData = (ilDataRaw ?? []).filter((r) => allowedLocIds.has(r.location_id));
      const locIds = ilData.map((r) => r.location_id).filter(Boolean);
      if (locIds.length === 0) {
        if (!cancelled) {
          setLocationRows([]);
          setLocationsLoading(false);
        }
        return;
      }

      const { data: locs } = await supabase
        .from("locations")
        .select(`
            id,
            name,
            code,
            branch_id,
            level,
            stands (
              name,
              aisles (
                name,
                zones (
                  name,
                  floors (
                    name,
                    level,
                    warehouses (
                      name
                    )
                  )
                )
              )
            )
          `)
        .in("id", locIds)
        .eq("branch_id", branchId);
      if (!cancelled && locs) {
        const rows: { quantity: number; path: string; locationId: string }[] = [];
        for (const il of ilData) {
          const loc = locs.find((l: { id: string }) => l.id === il.location_id) as {
            id: string;
            name: string;
            level?: number;
            stands?: {
              name: string;
              aisles?: {
                name: string;
                zones?: {
                  name: string;
                  floors?: { name: string; level?: number; warehouses?: { name: string } };
                };
              };
            };
          } | undefined;
          const stand = loc?.stands;
          if (!stand?.aisles) continue;
          const a = stand.aisles;
          const z = a.zones;
          const f = z?.floors;
          const w = f?.warehouses;
          const path = [w?.name, z?.name, a?.name, stand?.name, loc?.level != null ? `Nivel ${loc.level}` : loc?.name].filter(Boolean).join(" → ");
          rows.push({ quantity: il.quantity, path, locationId: loc!.id });
        }
        setLocationRows(rows);
      }
      if (!cancelled) setLocationsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, activeBranchEpoch]);

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
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
              title="Volver a inventario"
              aria-label="Volver a inventario"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <Link
              href={`/inventario/${product.id}/editar`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--shell-sidebar)] text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
              title="Editar producto"
              aria-label="Editar producto"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </Link>
            <Link
              href={`/inventario/actualizar-stock?productId=${product.id}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10"
              title="Ajustar stock"
              aria-label="Ajustar stock"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </Link>
            {SHOW_TRANSFER_OPTION && (
              <Link
                href={`/inventario/transferir?productId=${product.id}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10"
                title="Transferir stock"
                aria-label="Transferir stock"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-red-600 transition-colors hover:bg-red-50 dark:border-slate-700 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
              title="Eliminar producto"
              aria-label="Eliminar producto"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
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

      {/* Datos del producto: tres cards en grid simétrico */}
      <section className="grid min-w-0 gap-6 sm:grid-cols-1 lg:grid-cols-3">
        <div className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Identificación
          </h2>
            <dl className="mt-4 space-y-2 text-[13px]">
              <div className="flex justify-between gap-2"><dt className="font-medium text-slate-500 dark:text-slate-400">Código</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{product.sku || "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="font-medium text-slate-500 dark:text-slate-400">Categoría</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{product.category_name ?? "—"}</dd></div>
              {product.brand && <div className="flex justify-between gap-2"><dt className="font-medium text-slate-500 dark:text-slate-400">Marca</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{product.brand}</dd></div>}
              <div className="flex flex-col gap-1">
                <dt className="font-medium text-slate-500 dark:text-slate-400">Ubicación</dt>
                <dd className="font-semibold text-slate-800 dark:text-slate-100">
                  {locationsLoading ? (
                    <span className="font-medium text-slate-400 dark:text-slate-500">Cargando…</span>
                  ) : locationRows.length > 0 ? (
                    <LocationPathWithIcons path={locationRows.map((r) => r.path).join("; ")} iconClass="text-[13px]" />
                  ) : (
                    <span className="font-medium text-slate-500 dark:text-slate-400">Sin ubicación específica</span>
                  )}
                </dd>
              </div>
            </dl>
        </div>

        <div className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Descripción
          </h2>
          <p className="mt-4 text-[13px] font-medium leading-relaxed text-slate-600 dark:text-slate-400">
            {product.description?.trim() ? product.description : "Sin descripción."}
          </p>
        </div>

        <div className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Ubicación en bodega
          </h2>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Dónde está el producto en esta sucursal.
            </p>
            {locationsLoading ? (
              <p className="mt-3 text-[13px] font-medium text-slate-400 dark:text-slate-500">Cargando ubicaciones…</p>
            ) : locationRows.length > 0 ? (
              <>
                <ul className="mt-3 space-y-2">
                  {locationRows.map((row, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/40 px-3 py-2.5 text-[13px] dark:border-slate-800 dark:bg-slate-800/25">
                      <span className="min-w-0 flex-1">
                        <LocationPathWithIcons path={row.path} iconClass="text-[13px]" />
                      </span>
                      <span className="shrink-0 font-semibold text-slate-700 dark:text-slate-300">{row.quantity} und</span>
                    </li>
                  ))}
                </ul>
                <Link href="/inventario/ubicaciones" className="mt-3 inline-block text-[13px] font-medium text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300">
                  Gestionar ubicaciones
                </Link>
              </>
            ) : hasBodega === true && stockBodega === 0 ? (
              <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                No hay unidades en bodega en esta sucursal. Cuando ingreses stock en bodega (alta o ajuste), podrás asignar una ubicación en estante desde{" "}
                <Link href="/inventario/ubicaciones" className="font-semibold text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300">Ubicaciones bodega</Link>.
              </p>
            ) : hasBodega === true ? (
              <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Sin ubicación específica en estante. El stock en bodega ({stockBodega} und) está en inventario general. Puedes asignar una ubicación al actualizar el stock o desde{" "}
                <Link href="/inventario/ubicaciones" className="font-semibold text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300">Ubicaciones bodega</Link>.
              </p>
            ) : (
              <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Sin ubicación en estante. El inventario ({stock} und) está en esta sucursal. Si activas bodega en la sucursal, podrás separar local y bodega.
              </p>
            )}
        </div>
      </section>

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
