"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadOrgPlanSnapshot, type OrgPlanSnapshot } from "@/lib/org-plan-snapshot";
import { PlanLimitHeaderNote, PLAN_LIMIT_DISABLED_BUTTON_CLASS } from "@/app/components/PlanLimitNotice";
import { escapeSearchForFilter } from "@/lib/escape-search-for-filter";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";

const REPORTS_SURFACE = "berea-reports-surface";

const bereaFieldClass =
  "h-11 w-full rounded-xl border border-[var(--shell-workspace-search-border)] bg-[var(--shell-workspace-search-bg)] text-[14px] text-[var(--berea-ink)] shadow-[inset_0_0_0_0.5px_rgba(44,40,36,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--berea-ink-muted)] focus:border-[rgba(44,40,36,0.22)] focus:ring-0 dark:border-[var(--shell-nav-border)] dark:bg-[var(--shell-nav-card-bg)] dark:text-[var(--shell-nav-fg)] dark:placeholder:text-[var(--shell-nav-fg-subtle)]";

const bereaFilterLabel = "block text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]";

const IVA_RATE = 0.19;
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

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

/** Sobre qué cantidad aplican «Sin stock» / «Stock bajo» / «Con stock». */
type StockScope = "total" | "local" | "bodega";

type StockSplit = { local: number; bodega: number };

function stockForScope(split: StockSplit | undefined, scope: StockScope): number {
  const s = split ?? { local: 0, bodega: 0 };
  if (scope === "local") return s.local;
  if (scope === "bodega") return s.bodega;
  return s.local + s.bodega;
}

/** Valor del único select «Estado»: `all` o `sin-stock|bajo|con-stock` + `:` + alcance. */
function parseStockStatusOption(v: string): { kind: StockFilter; scope: StockScope } {
  if (v === "all") return { kind: "all", scope: "total" };
  const parts = v.split(":");
  if (parts.length !== 2) return { kind: "all", scope: "total" };
  const [k, s] = parts;
  if (k !== "sin-stock" && k !== "bajo" && k !== "con-stock") return { kind: "all", scope: "total" };
  if (s !== "total" && s !== "local" && s !== "bodega") return { kind: "all", scope: "total" };
  return { kind: k as StockFilter, scope: s as StockScope };
}

function StockEstadoSelect({
  id,
  value,
  onChange,
  hasBodega,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  hasBodega: boolean | null;
  className: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      aria-label="Estado de stock"
    >
      <option value="all">Todos</option>
      {hasBodega === true ? (
        <>
          <optgroup label="Sin stock">
            <option value="sin-stock:total">Total (local + bodega)</option>
            <option value="sin-stock:local">Solo en local</option>
            <option value="sin-stock:bodega">Solo en bodega</option>
          </optgroup>
          <optgroup label="Stock bajo (1–10)">
            <option value="bajo:total">Total (local + bodega)</option>
            <option value="bajo:local">Solo en local</option>
            <option value="bajo:bodega">Solo en bodega</option>
          </optgroup>
          <optgroup label="Con stock (más de 10)">
            <option value="con-stock:total">Total (local + bodega)</option>
            <option value="con-stock:local">Solo en local</option>
            <option value="con-stock:bodega">Solo en bodega</option>
          </optgroup>
        </>
      ) : (
        <>
          <option value="sin-stock:total">Sin stock</option>
          <option value="bajo:total">Stock bajo</option>
          <option value="con-stock:total">Con stock</option>
        </>
      )}
    </select>
  );
}

function InventoryFilters({
  searchQuery,
  onSearchChange,
  stockStatusOption,
  onStockStatusChange,
  categoryFilter,
  onCategoryChange,
  categories,
  hasBodega,
  stockStatusId,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  stockStatusOption: string;
  onStockStatusChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  categories: CategoryOption[];
  hasBodega: boolean | null;
  stockStatusId: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
      <div className="relative min-w-0 w-full lg:min-w-0 lg:flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--berea-ink-muted)]">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Nombre o código (ej. Coca-Cola, REST-BB-04)"
          aria-label="Buscar producto por nombre o por código"
          className={`${bereaFieldClass} py-2.5 pl-11 pr-4`}
        />
      </div>
      <div className="grid min-w-0 w-full grid-cols-2 gap-2 sm:gap-3 lg:w-auto lg:shrink-0 lg:gap-3">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={stockStatusId} className={bereaFilterLabel}>
            Estado
          </label>
          <StockEstadoSelect
            id={stockStatusId}
            value={stockStatusOption}
            onChange={onStockStatusChange}
            hasBodega={hasBodega}
            className={`${bereaFieldClass} px-3 font-medium`}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${stockStatusId}-category`} className={bereaFilterLabel}>
            Categoría
          </label>
          <select
            id={`${stockStatusId}-category`}
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={`${bereaFieldClass} px-3 font-medium`}
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
    </div>
  );
}

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stockSplitByProduct, setStockSplitByProduct] = useState<Record<string, StockSplit>>({});
  const [hasBodega, setHasBodega] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [effectiveSearchQuery, setEffectiveSearchQuery] = useState("");
  /** Estado de stock + alcance (local / bodega / total) en un solo valor. */
  const [stockStatusOption, setStockStatusOption] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeBranchEpoch, setActiveBranchEpoch] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [planSnapshot, setPlanSnapshot] = useState<OrgPlanSnapshot | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasFocusedList = useRef(false);
  const prevFetchDepsRef = useRef({ refreshKey: 0, page: 1, categoryFilter: "", activeBranchEpoch: 0 });
  const isFirstFetchRef = useRef(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    if (typeof q === "string" && q.trim()) {
      const t = q.trim();
      setSearchQuery(t);
      setEffectiveSearchQuery(t);
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) return;
      const [snap, allCats] = await Promise.all([
        loadOrgPlanSnapshot(supabase, userRow.organization_id),
        (async () => {
          const PAGE = 1000;
          const out: CategoryOption[] = [];
          let from = 0;
          while (true) {
            const { data: cats } = await supabase
              .from("categories")
              .select("id, name")
              .eq("organization_id", userRow.organization_id)
              .order("display_order", { ascending: true })
              .order("name", { ascending: true })
              .range(from, from + PAGE - 1);
            if (cancelled) return [];
            if (!cats?.length) break;
            out.push(...(cats as CategoryOption[]));
            if (cats.length < PAGE) break;
            from += PAGE;
          }
          return out;
        })(),
      ]);
      if (!cancelled) {
        setPlanSnapshot(snap);
        setCategories(allCats);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    const t = setTimeout(() => setEffectiveSearchQuery(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBranch = () => setActiveBranchEpoch((n) => n + 1);
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const prev = prevFetchDepsRef.current;
    const searchOnly =
      !isFirstFetchRef.current &&
      prev.refreshKey === refreshKey &&
      prev.page === page &&
      prev.categoryFilter === categoryFilter &&
      prev.activeBranchEpoch === activeBranchEpoch;
    isFirstFetchRef.current = false;
    prevFetchDepsRef.current = { refreshKey, page, categoryFilter, activeBranchEpoch };
    if (!searchOnly) setLoading(true);
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const [userRes, branchId] = await Promise.all([
          supabase.from("users").select("organization_id").eq("id", user.id).single(),
          resolveActiveBranchId(supabase, user.id),
        ]);
        if (!userRes.data?.organization_id || cancelled) return;
        if (!branchId || cancelled) {
          if (!cancelled) {
            setProducts([]);
            setTotalCount(0);
            setStockSplitByProduct({});
            setLoading(false);
          }
          return;
        }
        const orgId = userRes.data.organization_id;

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        let productQ = supabase
          .from("products")
          .select("id, name, sku, category_id, base_price, base_cost, apply_iva, description", { count: "exact" })
          .eq("organization_id", orgId)
          .order("name", { ascending: true })
          .range(from, to);
        const qTrim = effectiveSearchQuery.trim();
        if (qTrim) {
          const escaped = escapeSearchForFilter(qTrim);
          productQ = productQ.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%`);
        }
        if (categoryFilter) productQ = productQ.eq("category_id", categoryFilter);

        const [
          { data: branchRow },
          { data: productsData, count },
        ] = await Promise.all([supabase.from("branches").select("has_bodega").eq("id", branchId).single(), productQ]);
        if (cancelled) return;
        if (!cancelled) setHasBodega(branchRow?.has_bodega !== false);
        setProducts(productsData ?? []);
        setTotalCount(count ?? 0);

        const productIds = (productsData ?? []).map((p) => p.id);
        if (productIds.length === 0) {
          setStockSplitByProduct({});
          setLoading(false);
          return;
        }

        const { data: invData } = await supabase
          .from("inventory")
          .select("product_id, quantity, location")
          .eq("branch_id", branchId)
          .in("product_id", productIds);

        const splitBy: Record<string, StockSplit> = {};
        if (invData) {
          for (const row of invData) {
            const pid = row.product_id;
            const q = row.quantity ?? 0;
            const loc = (row as { location?: string | null }).location;
            if (!splitBy[pid]) splitBy[pid] = { local: 0, bodega: 0 };
            if (loc === "bodega") splitBy[pid].bodega += q;
            else splitBy[pid].local += q;
          }
        }
        if (!cancelled) setStockSplitByProduct(splitBy);
      } catch {
        if (!cancelled) {
          setProducts([]);
          setTotalCount(0);
          setStockSplitByProduct({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey, page, effectiveSearchQuery, categoryFilter, activeBranchEpoch]);

  useEffect(() => {
    if (hasBodega !== false) return;
    setStockStatusOption((prev) => {
      if (prev === "all") return prev;
      const [, scope] = prev.split(":");
      if (scope === "total" || !scope) return prev;
      const kind = prev.split(":")[0];
      if (kind === "sin-stock" || kind === "bajo" || kind === "con-stock") return `${kind}:total`;
      return "all";
    });
  }, [hasBodega]);

  const stockStatusParsed = parseStockStatusOption(stockStatusOption);
  const effectiveStockScope: StockScope = hasBodega === true ? stockStatusParsed.scope : "total";

  const filteredProducts = products.filter((p) => {
    const split = stockSplitByProduct[p.id];
    const stock = stockForScope(split, effectiveStockScope);
    const matchSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (p.sku?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ?? false);
    const k = stockStatusParsed.kind;
    const matchStock =
      k === "all" ||
      (k === "sin-stock" && stock === 0) ||
      (k === "bajo" && stock > 0 && stock <= 10) ||
      (k === "con-stock" && stock > 10);
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
  const showPagination = !loading && totalCount > PAGE_SIZE;
  /** Sin filas en BD: sin búsqueda ni categoría en servidor (no confundir con “0 coincidencias”). */
  const isDatabaseEmpty =
    !loading && totalCount === 0 && !effectiveSearchQuery.trim() && !categoryFilter;
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
  const actionIconClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] hover:text-[var(--berea-ink)]";
  const SHOW_TRANSFER_OPTION = true;
  const stockBadgeBase = "inline-flex max-w-full items-center rounded-md px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset";
  const stockStatusChip = (stock: number) => {
    if (stock === 0) {
      return {
        label: "Sin stock",
        className: `${stockBadgeBase} bg-rose-100 text-rose-900 ring-rose-300`,
      };
    }
    if (stock <= 10) {
      return {
        label: "Stock bajo",
        className: `${stockBadgeBase} bg-amber-100 text-amber-950 ring-amber-300`,
      };
    }
    return {
      label: "Con stock",
      className: `${stockBadgeBase} bg-emerald-100 text-emerald-900 ring-emerald-300`,
    };
  };

  const filterProps = {
    searchQuery,
    onSearchChange: (value: string) => {
      setSearchQuery(value);
      setPage(1);
    },
    stockStatusOption,
    onStockStatusChange: (value: string) => {
      setStockStatusOption(value);
      setPage(1);
    },
    categoryFilter,
    onCategoryChange: (value: string) => {
      setCategoryFilter(value);
      setPage(1);
    },
    categories,
    hasBodega,
  };

  const paginationBar = showPagination && (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 sm:px-5 ${REPORTS_SURFACE}`}>
      <p className="text-[13px] font-medium text-[var(--berea-ink-muted)] md:text-[14px]">
        {totalCount} {totalCount === 1 ? "producto" : "productos"}
        {totalPages > 1 && <> · Página {page} de {totalPages}</>}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] disabled:pointer-events-none disabled:opacity-50 ${REPORTS_SURFACE}`}
            aria-label="Página anterior"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {pageNumbers.map((n, i) =>
            n === "…" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-[var(--berea-ink-subtle)]">…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-[13px] font-semibold transition-colors ${
                  page === n
                    ? "bg-[var(--berea-accent)] text-[var(--shell-nav-fg)]"
                    : `${REPORTS_SURFACE} text-[var(--berea-ink-muted)] hover:bg-[var(--shell-workspace)]`
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
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] disabled:pointer-events-none disabled:opacity-50 ${REPORTS_SURFACE}`}
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

  /** Grid alineado encabezado + filas: 8 cols con bodega (local + bodega separados), 7 sin. */
  const desktopInventoryHeaderGrid =
    hasBodega === true
      ? "grid grid-cols-[minmax(120px,1.35fr)_minmax(72px,0.78fr)_minmax(96px,0.95fr)_minmax(48px,0.34fr)_minmax(48px,0.34fr)_minmax(82px,0.68fr)_minmax(96px,0.78fr)_minmax(124px,auto)] gap-x-3 sm:gap-x-5 items-center px-4 sm:px-5 py-3"
      : "grid grid-cols-[minmax(120px,1.5fr)_1fr_1fr_1fr_minmax(90px,0.8fr)_minmax(115px,0.9fr)_minmax(140px,auto)] gap-x-6 items-center px-5 py-3";
  const desktopInventoryRowGrid =
    hasBodega === true
      ? "grid grid-cols-[minmax(120px,1.35fr)_minmax(72px,0.78fr)_minmax(96px,0.95fr)_minmax(48px,0.34fr)_minmax(48px,0.34fr)_minmax(82px,0.68fr)_minmax(96px,0.78fr)_minmax(124px,auto)] gap-x-3 sm:gap-x-5 items-center px-4 sm:px-5 py-4"
      : "grid grid-cols-[minmax(120px,1.5fr)_1fr_1fr_1fr_minmax(90px,0.8fr)_minmax(115px,0.9fr)_minmax(140px,auto)] gap-x-6 items-center px-5 py-4";

  return (
    <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 text-[15px] text-[var(--berea-ink)] sm:space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">
            Productos
          </h1>
          <p className="mt-0.5 text-[14px] text-[var(--berea-ink-muted)]">
            Lista de tus productos. Busca, filtra y gestiona stock desde aquí.
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold text-[var(--berea-ink)] hover:bg-[var(--shell-workspace)] ${REPORTS_SURFACE}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
              {planSnapshot && !planSnapshot.canCreateProduct ? (
                <span
                  className={`inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-lg px-4 ${PLAN_LIMIT_DISABLED_BUTTON_CLASS}`}
                  title="Límite de referencias alcanzado"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuevo producto
                </span>
              ) : (
                <Link
                  href="/inventario/nuevo"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuevo producto
                </Link>
              )}
          </div>
          {planSnapshot && !planSnapshot.canCreateProduct ? (
            <PlanLimitHeaderNote kind="products" planId={planSnapshot.planId} className="w-full justify-end" />
          ) : null}
        </div>
      </header>

      <section
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="outline-none"
        aria-label="Lista de productos. Usa flechas arriba y abajo para moverte, Enter para abrir."
      >
        {loading ? (
          <div className={`min-h-[280px] animate-pulse rounded-xl ${REPORTS_SURFACE}`} aria-hidden />
        ) : filteredProducts.length === 0 ? (
          <div className={`space-y-6 rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}`}>
            <InventoryFilters {...filterProps} stockStatusId="inv-stock-status-empty" />

            <div className="px-2 py-8 text-center sm:px-4">
              <p className="text-[15px] font-semibold text-[var(--berea-ink)]">
                {isDatabaseEmpty
                  ? "Aún no tienes productos"
                  : "Ningún producto coincide con tu búsqueda o filtros"}
              </p>
              <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">
                {isDatabaseEmpty
                  ? "Crea tu primer producto para verlo aquí."
                  : "Ajusta la búsqueda, el estado de stock o la categoría."}
              </p>
              {isDatabaseEmpty ? (
                planSnapshot && !planSnapshot.canCreateProduct ? (
                  <span className="mt-6 inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white opacity-50">
                    Nuevo producto
                  </span>
                ) : (
                  <Link
                    href="/inventario/nuevo"
                    className="mt-6 inline-flex h-9 items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
                  >
                    Nuevo producto
                  </Link>
                )
              ) : null}
            </div>
          </div>
        ) : (
          <div className={`space-y-6 rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}`}>
            <InventoryFilters {...filterProps} stockStatusId="inv-stock-status" />

            {/* Contenedor único: encabezado + filas con el mismo grid para alinear columnas (desktop) */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/30 xl:block">
              {/* Títulos de columna */}
              <div
                className={`${desktopInventoryHeaderGrid} border-b border-[var(--berea-card-border)]`}
                aria-hidden
              >
                <div className="min-w-0 text-[13px] font-semibold text-[var(--berea-ink-muted)]">Producto</div>
                <div className="min-w-0 text-[13px] font-semibold text-[var(--berea-ink-muted)]">Código</div>
                <div className="min-w-0 text-[13px] font-semibold text-[var(--berea-ink-muted)]">Categoría</div>
                {hasBodega === true ? (
                  <>
                    <div className="min-w-0 text-right sm:text-left text-[13px] font-semibold text-[var(--berea-ink-muted)]">Local</div>
                    <div className="min-w-0 text-right sm:text-left text-[13px] font-semibold text-[var(--berea-ink-muted)]">Bodega</div>
                  </>
                ) : (
                  <div className="min-w-0 text-[13px] font-semibold text-[var(--berea-ink-muted)]">Stock</div>
                )}
                <div className="min-w-0 text-[13px] font-semibold text-[var(--berea-ink-muted)]">Estado</div>
                <div className="min-w-0 w-full text-right text-[13px] font-semibold text-[var(--berea-ink-muted)]">Precio</div>
                <div className="min-w-0 text-right text-[13px] font-semibold text-[var(--berea-ink-muted)]">Acciones</div>
              </div>
              {filteredProducts.map((p, index) => {
                const split = stockSplitByProduct[p.id] ?? { local: 0, bodega: 0 };
                const stock = stockForScope(split, effectiveStockScope);
                const price = salePrice(p);
                const stockStatus = stockStatusChip(stock);
                const isSelected = index === selectedIndex;
                const isLast = index === filteredProducts.length - 1;
                return (
                  <div
                    key={p.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/inventario/${p.id}`)}
                    className={`${desktopInventoryRowGrid} cursor-pointer transition-colors border-b border-[var(--berea-card-border)]/60 ${
                      isLast ? "border-b-0" : ""
                    } ${
                      isSelected
                        ? "bg-[var(--shell-workspace)]"
                        : "hover:bg-[var(--shell-workspace)]/70"
                    }`}
                  >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--berea-ink)]">{p.name}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-[var(--berea-ink-muted)]">{p.sku || "—"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-[var(--berea-ink-muted)]">{categories.find((c) => c.id === p.category_id)?.name ?? "—"}</p>
                  </div>
                  {hasBodega === true ? (
                    <>
                      <div className="min-w-0 text-right sm:text-left">
                        <p className="text-[14px] font-medium tabular-nums text-[var(--berea-ink)]">{split.local}</p>
                      </div>
                      <div className="min-w-0 text-right sm:text-left">
                        <p className="text-[14px] font-medium tabular-nums text-[var(--berea-ink)]">{split.bodega}</p>
                      </div>
                    </>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium tabular-nums text-[var(--berea-ink)]">{stock}</p>
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className={stockStatus.className}>{stockStatus.label}</span>
                  </div>
                  <div className="min-w-0 w-full flex items-center justify-end">
                    <span className="text-[15px] font-semibold tabular-nums text-[var(--berea-ink)]">$ {formatMoney(price)}</span>
                  </div>
                  <div className="min-w-0 flex items-center justify-end gap-0 -space-x-0.5" onClick={(e) => e.stopPropagation()}>
                    <span className="relative inline-flex group/tooltip">
                      <Link href={`/inventario/${p.id}`} className={actionIconClass} aria-label="Ver detalle">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </Link>
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-[11px] font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover/tooltip:opacity-100 z-50">Ver detalle del producto</span>
                    </span>
                    <span className="relative inline-flex group/tooltip">
                      <Link href={`/inventario/${p.id}/editar`} className={actionIconClass} aria-label="Editar">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                      </Link>
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-[11px] font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover/tooltip:opacity-100 z-50">Editar nombre, precio, categoría y más</span>
                    </span>
                    <span className="relative inline-flex group/tooltip">
                      <Link href={`/inventario/actualizar-stock?productId=${p.id}`} className={actionIconClass} aria-label="Ajustar stock">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </Link>
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-[11px] font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover/tooltip:opacity-100 z-50">Ajustar o contar el stock de este producto</span>
                    </span>
                    {SHOW_TRANSFER_OPTION && (
                      <span className="relative inline-flex group/tooltip">
                        <Link href={`/inventario/transferir?productId=${p.id}`} className={actionIconClass} aria-label="Transferir">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                        </Link>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-[11px] font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover/tooltip:opacity-100 z-50">Transferir entre local y bodega</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            </div>

            {/* Mobile: tarjetas apiladas (misma lista, otra vista) */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:hidden">
              {filteredProducts.map((p, index) => {
                const split = stockSplitByProduct[p.id] ?? { local: 0, bodega: 0 };
                const stock = stockForScope(split, effectiveStockScope);
                const price = salePrice(p);
                const stockStatus = stockStatusChip(stock);
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={p.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/inventario/${p.id}`)}
                    className={`rounded-xl cursor-pointer transition-all px-4 py-3 ${REPORTS_SURFACE} ${
                      isSelected
                        ? "ring-2 ring-[var(--berea-accent)]/30"
                        : "hover:bg-[var(--shell-workspace)]/60"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Producto</span><p className="truncate text-right text-[15px] font-semibold text-[var(--berea-ink)]">{p.name}</p></div>
                      <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Código</span><p className="text-[14px] text-[var(--berea-ink-muted)]">{p.sku || "—"}</p></div>
                      <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Categoría</span><p className="text-[14px] text-[var(--berea-ink-muted)]">{categories.find((c) => c.id === p.category_id)?.name ?? "—"}</p></div>
                      {hasBodega === true ? (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Stock local</span>
                            <p className="text-[14px] font-medium tabular-nums text-[var(--berea-ink)]">{split.local}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Stock bodega</span>
                            <p className="text-[14px] font-medium tabular-nums text-[var(--berea-ink)]">{split.bodega}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Stock</span>
                          <p className="text-[14px] font-medium tabular-nums text-[var(--berea-ink)]">{stock}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Estado</span><span className={stockStatus.className}>{stockStatus.label}</span></div>
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800"><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Precio</span><p className="text-[15px] font-semibold tabular-nums text-[var(--berea-ink)]">$ {formatMoney(price)}</p></div>
                      <div
                        className="flex flex-nowrap items-center justify-end gap-0.5 pt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="relative inline-flex group/tooltip">
                          <Link href={`/inventario/${p.id}`} className={actionIconClass} aria-label="Ver detalle" title="Ver detalle del producto">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </Link>
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 dark:bg-slate-700">
                            Ver detalle
                          </span>
                        </span>
                        <span className="relative inline-flex group/tooltip">
                          <Link href={`/inventario/${p.id}/editar`} className={actionIconClass} aria-label="Editar" title="Editar producto">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </Link>
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 dark:bg-slate-700">
                            Editar
                          </span>
                        </span>
                        <span className="relative inline-flex group/tooltip">
                          <Link href={`/inventario/actualizar-stock?productId=${p.id}`} className={actionIconClass} aria-label="Ajustar stock" title="Ajustar stock">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </Link>
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 dark:bg-slate-700">
                            Ajustar stock
                          </span>
                        </span>
                        {SHOW_TRANSFER_OPTION && (
                          <span className="relative inline-flex group/tooltip">
                            <Link href={`/inventario/transferir?productId=${p.id}`} className={actionIconClass} aria-label="Transferir" title="Transferir stock">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                              </svg>
                            </Link>
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 dark:bg-slate-700">
                              Local ↔ bodega
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {paginationBar}

    </div>
  );
}
