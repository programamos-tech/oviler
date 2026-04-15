"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CatalogCartDrawer } from "@/app/components/catalog/CatalogCartDrawer";
import { CatalogStorefrontFooter } from "@/app/components/catalog/CatalogStorefrontFooter";
import { CatalogStorefrontHeader } from "@/app/components/catalog/CatalogStorefrontHeader";
import { loadCart, saveCart, type CartLine } from "@/app/components/catalog/catalog-cart-storage";
import type { CatalogPayload, CatalogProductRow } from "@/app/components/catalog/catalog-storefront-types";
import { formatMoney } from "@/lib/format-currency";
import { catalogFocusRing, catalogQtyButtonMd } from "@/app/components/catalog/catalog-ui-classes";

export default function ProductDetailClient() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) ?? "";
  const productId = (params?.productId as string) ?? "";

  const [data, setData] = useState<CatalogPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!slug) return;
    setCart(loadCart(slug));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/catalog/${encodeURIComponent(slug)}`);
        const json = (await res.json()) as CatalogPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(json.error ?? "No se pudo cargar el catálogo");
          return;
        }
        if (!cancelled) setData(json as CatalogPayload);
      } catch {
        if (!cancelled) setError("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const productById = useMemo(() => {
    const m = new Map<string, CatalogProductRow>();
    for (const p of data?.products ?? []) m.set(p.id, p);
    return m;
  }, [data]);

  const product = productById.get(productId) ?? null;

  const setQty = useCallback(
    (pid: string, qty: number) => {
      setCart((prev) => {
        const p = productById.get(pid);
        const max = p?.stock ?? 0;
        const next = Math.min(Math.max(0, qty), max);
        let lines = prev.filter((l) => l.product_id !== pid);
        if (next > 0) lines = [...lines, { product_id: pid, quantity: next }];
        saveCart(slug, lines);
        return lines;
      });
    },
    [productById, slug]
  );

  const cartTotal = useMemo(() => {
    let t = 0;
    for (const line of cart) {
      const p = productById.get(line.product_id);
      if (p) t += p.unit_price * line.quantity;
    }
    return t;
  }, [cart, productById]);

  const cartCount = useMemo(() => cart.reduce((a, l) => a + l.quantity, 0), [cart]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        Cargando…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{error ?? "Catálogo no disponible"}</p>
        <p className="mt-2 text-sm text-slate-500">Comprueba el enlace o contacta a la tienda.</p>
      </div>
    );
  }

  if (!product) {
    return (
      <>
        <CatalogStorefrontHeader
          branch={data.branch}
          cartCount={cartCount}
          onOpenCart={() => setCartOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Producto no encontrado</p>
          <button
            type="button"
            onClick={() => router.push(`/t/${encodeURIComponent(slug)}`)}
            className={`mt-4 rounded-lg text-sm font-medium text-ov-pink hover:underline ${catalogFocusRing}`}
          >
            ← Volver al catálogo
          </button>
        </div>
        <CatalogCartDrawer
          slug={slug}
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          productById={productById}
          cartTotal={cartTotal}
        />
      </>
    );
  }

  const qty = cart.find((c) => c.product_id === product.id)?.quantity ?? 0;

  return (
    <>
      <CatalogStorefrontHeader
        branch={data.branch}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <button
          type="button"
          onClick={() => router.push(`/t/${encodeURIComponent(slug)}`)}
          className={`mb-6 rounded-lg text-sm font-medium text-slate-600 hover:text-ov-pink dark:text-slate-400 ${catalogFocusRing}`}
        >
          ← Volver al catálogo
        </button>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-[rgb(var(--ov-surface-strong))] shadow-sm dark:border-[rgb(52_52_60)]">
          <div className="grid gap-0 md:grid-cols-2 md:min-h-[min(70vh,560px)] lg:min-h-[min(72vh,600px)]">
            <div className="relative min-h-[min(52vw,320px)] w-full bg-slate-100 dark:bg-slate-800 md:min-h-full">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[240px] items-center justify-center text-slate-400 md:min-h-full">
                  Sin foto
                </div>
              )}
            </div>
            <div className="flex min-h-0 flex-col justify-center p-5 sm:p-8 lg:p-10">
              {product.brand && (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{product.brand}</p>
              )}
              <h1 className={`text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl ${product.brand ? "mt-1" : ""}`}>
                {product.name}
              </h1>
              {product.sku && <p className="mt-2 text-sm text-slate-500">SKU: {product.sku}</p>}
              <p className="mt-4 text-3xl font-bold text-ov-pink sm:text-4xl">{formatMoney(product.unit_price)}</p>
              <p className="mt-2 text-sm text-slate-500">Stock disponible: {product.stock}</p>
              {product.description && (
                <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  {product.description}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-6 dark:border-[rgb(52_52_60)]">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Cantidad</span>
                <div className="flex items-center gap-2">
                  <button type="button" className={catalogQtyButtonMd} onClick={() => setQty(product.id, qty - 1)}>
                    −
                  </button>
                  <span className="min-w-[2rem] text-center text-lg font-semibold">{qty}</span>
                  <button type="button" className={catalogQtyButtonMd} onClick={() => setQty(product.id, qty + 1)}>
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CatalogCartDrawer
        slug={slug}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        productById={productById}
        cartTotal={cartTotal}
      />

      <CatalogStorefrontFooter />
    </>
  );
}
