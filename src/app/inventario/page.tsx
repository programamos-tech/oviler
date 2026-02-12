"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/app/components/Breadcrumb";

const IVA_RATE = 0.19;
const PAGE_SIZE = 20;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  base_price: number | null;
  base_cost: number | null;
  apply_iva: boolean;
  description: string | null;
};

type CategoryOption = { id: string; name: string };

function salePrice(p: ProductRow): number {
  const base = Number(p.base_price) || 0;
  return p.apply_iva ? base + Math.round(base * IVA_RATE) : base;
}

type StockFilter = "all" | "sin-stock" | "bajo" | "con-stock";

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stockByProduct, setStockByProduct] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLoadingUI, setShowLoadingUI] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasFocusedList = useRef(false);
  const loadingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      loadingDelayRef.current = setTimeout(() => setShowLoadingUI(true), 400);
    } else {
      if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
      loadingDelayRef.current = null;
      setShowLoadingUI(false);
    }
    return () => {
      if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    };
  }, [loading]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const PAGE = 1000; // Supabase devuelve máx 1000 filas por consulta por defecto
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) return;

      const allCats: CategoryOption[] = [];
      let from = 0;
      while (true) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name")
          .eq("organization_id", userRow.organization_id)
          .order("display_order", { ascending: true })
          .order("name", { ascending: true })
          .range(from, from + PAGE - 1);
        if (cancelled) return;
        if (!cats?.length) break;
        allCats.push(...(cats as CategoryOption[]));
        if (cats.length < PAGE) break;
        from += PAGE;
      }
      if (!cancelled) setCategories(allCats);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) return;

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("products")
        .select("id, name, sku, category_id, base_price, base_cost, apply_iva, description", { count: "exact" })
        .eq("organization_id", userRow.organization_id)
        .order("name", { ascending: true })
        .range(from, to);
      const qTrim = searchQuery.trim();
      if (qTrim) q = q.or(`name.ilike.%${qTrim}%,sku.ilike.%${qTrim}%`);
      if (categoryFilter) q = q.eq("category_id", categoryFilter);

      const { data: productsData, count } = await q;
      if (cancelled) return;
      setProducts(productsData ?? []);
      setTotalCount(count ?? 0);

      const productIds = (productsData ?? []).map((p) => p.id);
      if (productIds.length === 0) {
        setStockByProduct({});
        setLoading(false);
        return;
      }

      const { data: invData } = await supabase
        .from("inventory")
        .select("product_id, quantity")
        .eq("branch_id", ub.branch_id)
        .in("product_id", productIds);

      const byProduct: Record<string, number> = {};
      if (invData) {
        for (const row of invData) {
          byProduct[row.product_id] = (byProduct[row.product_id] ?? 0) + (row.quantity ?? 0);
        }
      }
      if (!cancelled) setStockByProduct(byProduct);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey, page, searchQuery, categoryFilter]);

  const filteredProducts = products.filter((p) => {
    const stock = stockByProduct[p.id] ?? 0;
    const matchSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (p.sku?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ?? false);
    const matchStock =
      stockFilter === "all" ||
      (stockFilter === "sin-stock" && stock === 0) ||
      (stockFilter === "bajo" && stock > 0 && stock <= 10) ||
      (stockFilter === "con-stock" && stock > 10);
    const matchCategory = !categoryFilter || p.category_id === categoryFilter;
    return matchSearch && matchStock && matchCategory;
  });

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filteredProducts.length - 1)));
  }, [filteredProducts.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredProducts.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredProducts.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        router.push(`/inventario/${filteredProducts[selectedIndex].id}`);
      }
    },
    [filteredProducts, selectedIndex, router]
  );

  useEffect(() => {
    cardRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  useEffect(() => {
    if (!loading && filteredProducts.length > 0 && listRef.current && !hasFocusedList.current) {
      hasFocusedList.current = true;
      listRef.current.focus({ preventScroll: true });
    }
  }, [loading, filteredProducts.length]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showPagination = !loading && totalCount > 0;
  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const around = 2;
    const start = Math.max(1, page - around);
    const end = Math.min(totalPages, page + around);
    const nums: (number | "…")[] = [];
    if (start > 1) { nums.push(1); if (start > 2) nums.push("…"); }
    for (let i = start; i <= end; i++) nums.push(i);
    if (end < totalPages) { if (end < totalPages - 1) nums.push("…"); nums.push(totalPages); }
    return nums;
  })();

  const paginationBar = showPagination && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
        {totalCount} {totalCount === 1 ? "producto" : "productos"}
        {totalPages > 1 && <> · Página {page} de {totalPages}</>}
      </p>
      {totalPages > 1 && (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label="Página anterior"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {pageNumbers.map((n, i) =>
          n === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400">…</span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-2 text-[13px] font-medium ${
                page === n
                  ? "border-ov-pink bg-ov-pink text-white dark:bg-ov-pink dark:text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {n}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label="Página siguiente"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Inventario" }]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
                Productos
              </h1>
              <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Lista de tus productos. Busca, filtra y gestiona stock desde aquí.
              </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
            <Link
              href="/inventario/nuevo"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo producto
            </Link>
          </div>
        </div>
      </header>

      {/* Buscador y filtros: solo cuando terminó de cargar para evitar parpadeos al recargar */}
      {!loading && totalCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1 min-w-0 max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre o código..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-[14px] text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">Estado:</label>
            <select
              value={stockFilter}
              onChange={(e) => { setStockFilter(e.target.value as StockFilter); setPage(1); }}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Todos</option>
              <option value="sin-stock">Sin stock</option>
              <option value="bajo">Stock bajo</option>
              <option value="con-stock">Con stock</option>
            </select>
            <label className="ml-2 text-[13px] font-medium text-slate-600 dark:text-slate-400 sm:ml-0">Categoría:</label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Todas</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <section
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="space-y-3 outline-none"
        aria-label="Lista de productos. Usa flechas arriba y abajo para moverte, Enter para abrir."
      >
        {loading && showLoadingUI ? (
          <div className="flex min-h-[200px] items-center justify-center pt-48 pb-12">
            <p className="font-logo text-lg font-bold tracking-tight text-slate-800 dark:text-white sm:text-xl" aria-live="polite">
              NOU<span className="animate-pulse">...</span>
            </p>
          </div>
        ) : loading ? (
          <div className="min-h-[280px]" aria-hidden />
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
              {totalCount === 0 ? "Aún no tienes productos" : "Ningún producto coincide con los filtros en esta página"}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {totalCount === 0 ? "Crea tu primer producto para verlo aquí." : "Prueba cambiando la búsqueda, el estado o la categoría."}
            </p>
            <Link
              href="/inventario/nuevo"
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
            >
              Nuevo producto
            </Link>
          </div>
        ) : (
          filteredProducts.map((p, index) => {
            const stock = stockByProduct[p.id] ?? 0;
            const price = salePrice(p);
            const stockStatus =
              stock === 0
                ? { label: "Sin stock", class: "text-red-600 dark:text-red-400" }
                : stock <= 10
                  ? { label: "Stock bajo", class: "text-orange-600 dark:text-orange-400" }
                  : { label: "Con stock", class: "text-green-600 dark:text-green-400" };
            const isSelected = index === selectedIndex;
            return (
              <div
                key={p.id}
                ref={(el) => { cardRefs.current[index] = el; }}
                role="button"
                tabIndex={-1}
                onClick={() => router.push(`/inventario/${p.id}`)}
                className={`rounded-xl shadow-sm ring-1 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-slate-100 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600"
                    : "bg-white ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                }`}
              >
                <div className="grid grid-cols-2 sm:grid-cols-[1.5fr_1fr_1fr_0.8fr_1fr_1.2fr_auto] gap-x-3 gap-y-2 sm:gap-x-4 sm:gap-y-0 items-center px-4 py-3 sm:px-5 sm:py-4">
                  <div className="col-span-2 sm:col-span-1 min-w-0">
                    <p className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                      {p.name}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200 truncate">
                      {p.sku || "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200 truncate">
                      {categories.find((c) => c.id === p.category_id)?.name ?? "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold tabular-nums text-slate-900 dark:text-slate-50">
                      {stock} {stock === 1 ? "unidad" : "unidades"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[14px] font-bold ${stockStatus.class}`}>
                      {stockStatus.label}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-2 sm:gap-3">
                    <span className="text-[14px] sm:text-base font-bold text-slate-900 dark:text-slate-50 tabular-nums shrink-0 mr-3 sm:mr-5">
                      $ {formatMoney(price)}
                    </span>
                    <span className="group relative inline-flex" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/inventario/${p.id}`}
                        className="inline-flex shrink-0 items-center justify-center p-1 text-ov-pink hover:text-ov-pink-hover dark:text-ov-pink dark:hover:text-ov-pink-hover"
                        aria-label="Ver detalle"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-slate-700">
                        Ver detalle
                      </span>
                    </span>
                    <span className="group relative inline-flex" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/inventario/actualizar-stock?productId=${p.id}`}
                        className="inline-flex shrink-0 items-center justify-center p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        aria-label="Ajustar stock"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </Link>
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-slate-700">
                        Ajustar stock
                      </span>
                    </span>
                    <span className="group relative inline-flex" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/inventario/transferir?productId=${p.id}`}
                        className="inline-flex shrink-0 items-center justify-center p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        aria-label="Transferir"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                      </Link>
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-slate-700">
                        Transferir
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {paginationBar}
    </div>
  );
}
