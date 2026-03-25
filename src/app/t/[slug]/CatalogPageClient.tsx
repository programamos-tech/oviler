"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CatalogCartDrawer } from "@/app/components/catalog/CatalogCartDrawer";
import { CatalogProductCard } from "@/app/components/catalog/CatalogProductCard";
import { CatalogStorefrontFooter } from "@/app/components/catalog/CatalogStorefrontFooter";
import { CatalogStorefrontHeader } from "@/app/components/catalog/CatalogStorefrontHeader";
import { loadCart, saveCart, type CartLine } from "@/app/components/catalog/catalog-cart-storage";
import type { CatalogPayload, CatalogProductRow } from "@/app/components/catalog/catalog-storefront-types";

export default function CatalogPageClient() {
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const [data, setData] = useState<CatalogPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

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

  const setQty = useCallback(
    (productId: string, qty: number) => {
      setCart((prev) => {
        const p = productById.get(productId);
        const max = p?.stock ?? 0;
        const next = Math.min(Math.max(0, qty), max);
        let lines = prev.filter((l) => l.product_id !== productId);
        if (next > 0) lines = [...lines, { product_id: productId, quantity: next }];
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

  const byCategory = useMemo(() => {
    const products = data?.products ?? [];
    const uncategorized: CatalogProductRow[] = [];
    const map = new Map<string, CatalogProductRow[]>();
    for (const c of data?.categories ?? []) map.set(c.id, []);
    for (const p of products) {
      if (p.category_id && map.has(p.category_id)) {
        map.get(p.category_id)!.push(p);
      } else {
        uncategorized.push(p);
      }
    }
    return { map, uncategorized };
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        Cargando catálogo…
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

  return (
    <>
      <CatalogStorefrontHeader branch={data.branch} cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {data.categories.map((cat) => {
          const list = byCategory.map.get(cat.id) ?? [];
          if (list.length === 0) return null;
          return (
            <section key={cat.id} className="mb-12">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{cat.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <CatalogProductCard key={p.id} p={p} slug={slug} cart={cart} setQty={setQty} variant="surface" />
                ))}
              </div>
            </section>
          );
        })}

        {byCategory.uncategorized.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Otros</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {byCategory.uncategorized.map((p) => (
                <CatalogProductCard key={p.id} p={p} slug={slug} cart={cart} setQty={setQty} variant="plain" />
              ))}
            </div>
          </section>
        )}
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
