"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";

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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      <div className="space-y-4">
        <p className="text-[14px] text-slate-500 dark:text-slate-400">Cargando producto…</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">Producto no encontrado.</p>
        <Link href="/inventario" className="text-[14px] font-medium text-ov-pink hover:underline">
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
        ? "text-orange-600 dark:text-orange-400"
        : "text-green-600 dark:text-green-400";
  const inversiónEnStock = cost * stock;
  const gananciaBrutaEstimada = (price - cost) * stock;
  const margenGanancia = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Card: nombre del producto + métricas y acciones */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              {product.name}
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              {product.sku || "—"}{product.category_name ? ` · ${product.category_name}` : ""}{product.brand ? ` · ${product.brand}` : ""}
            </p>
          </div>
          <Link
            href="/inventario"
            className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a inventario"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4 sm:gap-6">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Precio de venta</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">$ {formatMoney(price)}</p>
              {product.apply_iva && <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">incl. IVA 19%</p>}
            </div>
            <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Stock en sucursal</p>
              <p className={`mt-0.5 text-lg font-bold sm:text-xl ${stockColorClass}`}>
                {stock} unidades
              </p>
            </div>
            <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Costo</p>
              <p className="mt-0.5 text-lg font-bold text-slate-700 dark:text-slate-300 sm:text-xl">$ {formatMoney(cost)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/inventario/${product.id}/editar`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover">
              Editar
            </Link>
            <Link href={`/inventario/actualizar-stock?productId=${product.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              Ajustar stock
            </Link>
            <Link href={`/inventario/transferir?productId=${product.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              Transferir
            </Link>
            <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-ov-pink/50 bg-white px-4 text-[13px] font-medium text-ov-pink hover:bg-ov-pink/10 dark:border-ov-pink/50 dark:bg-slate-800 dark:text-ov-pink-muted dark:hover:bg-ov-pink/20">
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Insights: valor en stock y ganancia */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Valor e ingresos estimados
        </h2>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
          Con el stock actual en esta sucursal.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Plata en stock
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              $ {formatMoney(inversiónEnStock)}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              Inversión en {stock} {stock === 1 ? "unidad" : "unidades"}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Ganancia bruta estimada
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-200 sm:text-2xl">
              $ {formatMoney(gananciaBrutaEstimada)}
            </p>
            <p className="mt-0.5 text-[12px] text-emerald-600/80 dark:text-emerald-400/80">
              Si vendes las {stock} {stock === 1 ? "unidad" : "unidades"}
            </p>
          </div>
          <div className="rounded-xl bg-ov-pink/10 p-4 dark:bg-ov-pink/20">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ov-pink dark:text-ov-pink-muted">
              Margen de ganancia
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              {margenGanancia}%
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              Por unidad vendida
            </p>
          </div>
        </div>
      </div>

      {/* Contenido en dos columnas */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Datos del producto */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Identificación
            </h2>
            <dl className="mt-3 space-y-2 text-[14px]">
              <div className="flex justify-between gap-2"><dt className="text-slate-500 dark:text-slate-400">Código</dt><dd className="font-medium text-slate-800 dark:text-slate-100">{product.sku || "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500 dark:text-slate-400">Categoría</dt><dd className="font-medium text-slate-800 dark:text-slate-100">{product.category_name ?? "—"}</dd></div>
              {product.brand && <div className="flex justify-between gap-2"><dt className="text-slate-500 dark:text-slate-400">Marca</dt><dd className="font-medium text-slate-800 dark:text-slate-100">{product.brand}</dd></div>}
            </dl>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Descripción
            </h2>
            <p className="mt-3 text-[14px] text-slate-600 dark:text-slate-400">
              {product.description?.trim() ? product.description : "Sin descripción."}
            </p>
          </div>
        </div>

        {/* Ventas de este producto */}
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Ventas de este producto
          </h2>
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-700">
            <svg className="h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-3 text-[14px] font-medium text-slate-600 dark:text-slate-400">Aún no hay ventas registradas</p>
            <p className="mt-1 max-w-[260px] text-center text-[13px] text-slate-500 dark:text-slate-500">
              Cuando las ventas incluyan ítems por producto, aquí verás el detalle.
            </p>
          </div>
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
