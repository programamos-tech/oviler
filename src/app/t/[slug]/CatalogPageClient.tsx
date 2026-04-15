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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");

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

  const productsByCategory = useMemo(() => {
    const map = new Map<string, CatalogProductRow[]>();
    for (const c of data?.categories ?? []) map.set(c.id, []);
    for (const p of data?.products ?? []) {
      if (!p.category_id || !map.has(p.category_id)) continue;
      map.get(p.category_id)!.push(p);
    }
    return map;
  }, [data]);

  const categoryStats = useMemo(() => {
    return (data?.categories ?? [])
      .map((category) => ({
        ...category,
        productCount: (productsByCategory.get(category.id) ?? []).length,
      }))
      .filter((category) => category.productCount > 0);
  }, [data, productsByCategory]);

  const visibleProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (data?.products ?? []).filter((product) => {
      if (activeCategoryId !== "all" && product.category_id !== activeCategoryId) return false;
      if (!query) return true;
      const haystack = `${product.name} ${product.brand ?? ""} ${product.description ?? ""} ${product.category?.name ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [activeCategoryId, data, searchQuery]);

  useEffect(() => {
    if (!data) return;
    if (activeCategoryId === "all") return;
    const exists = data.categories.some((c) => c.id === activeCategoryId);
    if (!exists) setActiveCategoryId("all");
  }, [activeCategoryId, data]);

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
      <CatalogStorefrontHeader
        branch={data.branch}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-black/15 bg-[#1e3522] px-4 py-4 text-white sm:px-5">
          <div className="pointer-events-none absolute inset-0 bg-[#1e3522]" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_115%_72%_at_50%_108%,rgba(211,202,165,0.28),rgba(211,202,165,0.08)_38%,transparent_58%)]"
            aria-hidden
          />
          <div className="pointer-events-none absolute -bottom-32 left-1/2 h-44 w-[130%] -translate-x-1/2 rounded-[100%] bg-[#d3caa5]/[0.2] blur-[38px]" aria-hidden />
          <div className="relative flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.09em] text-white/70">Compra segura</p>
              <p className="text-[14px] font-semibold tracking-tight text-white">Tu tienda está respaldada por Oviler</p>
            </div>
            <p className="text-[12px] text-white/75">Seguimiento de pedidos, comprobantes y control de inventario.</p>
          </div>
        </section>

        <section className="sm:hidden">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Busca productos"
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50/90 pl-10 pr-4 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[color:var(--shell-sidebar)] focus:bg-white focus:ring-2 focus:ring-slate-400/35"
              aria-label="Buscar en la tienda"
            />
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveCategoryId("all")}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                  activeCategoryId === "all"
                    ? "border-[color:var(--shell-sidebar)] bg-slate-200/80 text-[color:var(--shell-sidebar)]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Todos
              </button>
              {categoryStats.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                    activeCategoryId === category.id
                      ? "border-[color:var(--shell-sidebar)] bg-slate-200/80 text-[color:var(--shell-sidebar)]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {category.name} <span className="text-slate-400">({category.productCount})</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">{visibleProducts.length} resultados</p>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center text-[13px] text-slate-600">
              No encontramos productos con esos filtros.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((p) => (
                <CatalogProductCard key={p.id} p={p} slug={slug} cart={cart} setQty={setQty} variant="surface" />
              ))}
            </div>
          )}
        </section>
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
