"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  const [stockReserved, setStockReserved] = useState<number>(0);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [locationRows, setLocationRows] = useState<{ quantity: number; path: string; locationId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const SHOW_TRANSFER_OPTION = false;

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: p, error } = await supabase
        .from("products")
        .select("id, name, sku, category_id, brand, description, base_price, base_cost, apply_iva")
        .eq("id", id)
        .single();

      if (error || !p || cancelled) {
        if (!cancelled) setNotFound(true);
        setLoading(false);
        return;
      }
      let productData: Product = p as Product;
      if (p.category_id) {
        const { data: cat } = await supabase.from("categories").select("name").eq("id", p.category_id).single();
        if (!cancelled && cat) productData = { ...productData, category_name: cat.name };
      }
      if (!cancelled) setProduct(productData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) return;

      const { data: inv } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("product_id", id)
        .eq("branch_id", ub.branch_id);

      const total = (inv ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
      if (!cancelled) setStock(total);

      if (!cancelled && ub.branch_id) setBranchId(ub.branch_id);

      // Stock reservado: solo ventas que aún no han descontado stock (pendientes, en alistamiento, alistadas).
      // Completadas y despachadas ya descontaron, no cuentan como reservado.
      const STATUSES_THAT_RESERVE = ["pending", "preparing", "packing"];
      const { data: reservedRows } = await supabase
        .from("sale_items")
        .select("quantity, sales!inner(branch_id, status)")
        .eq("product_id", id);
      const reserved = (reservedRows ?? []).reduce((sum, row) => {
        const raw = row as { quantity: number; sales: { branch_id: string; status: string } | { branch_id: string; status: string }[] | null };
        const s = Array.isArray(raw.sales) ? raw.sales[0] ?? null : raw.sales;
        if (!s || s.branch_id !== ub?.branch_id || s.status === "cancelled") return sum;
        if (!STATUSES_THAT_RESERVE.includes(s.status)) return sum; // ya pagado/despachado = ya descontado
        return sum + (Number(raw.quantity) || 0);
      }, 0);
      if (!cancelled) setStockReserved(reserved);

      const { data: ilData } = await supabase
        .from("inventory_locations")
        .select("location_id, quantity")
        .eq("product_id", id);
      if (cancelled) return;
      const locIds = (ilData ?? []).map((r) => r.location_id).filter(Boolean);
      if (locIds.length > 0) {
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
          .eq("branch_id", ub.branch_id);
        if (!cancelled && locs) {
          const rows: { quantity: number; path: string; locationId: string }[] = [];
          for (const il of ilData ?? []) {
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
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

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
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 print:hidden sm:pt-0.5">
            <Link
              href="/inventario"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
              title="Volver a inventario"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <Link href={`/inventario/${product.id}/editar`} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]">
              Editar
            </Link>
            <Link href={`/inventario/actualizar-stock?productId=${product.id}`} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10">
              Ajustar stock
            </Link>
            {SHOW_TRANSFER_OPTION && (
              <Link href={`/inventario/transferir?productId=${product.id}`} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10">
                Transferir
              </Link>
            )}
            <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-slate-700 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30">
              Eliminar
            </button>
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="grid grid-cols-1 gap-5 sm:flex sm:flex-row sm:flex-wrap sm:gap-6 sm:gap-y-0">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Precio de venta</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">$ {formatMoney(price)}</p>
              {product.apply_iva && <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">incl. IVA 19%</p>}
            </div>
            <div className="sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Stock en sucursal</p>
              <p className={`mt-1 text-lg font-semibold sm:text-xl ${stockColorClass}`}>
                {stock} unidades
              </p>
            </div>
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
                  {locationRows.length > 0 ? (
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
            {locationRows.length > 0 ? (
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
            ) : (
              <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Sin ubicación específica. El stock ({stock} und) está en inventario general. Puedes asignar una ubicación al actualizar el stock o desde{" "}
                <Link href="/inventario/ubicaciones" className="font-semibold text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300">Ubicaciones bodega</Link>.
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
