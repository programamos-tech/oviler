"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";
import { logActivity } from "@/lib/activities";
import Breadcrumb from "@/app/components/Breadcrumb";

type ProductOption = { id: string; name: string; sku: string | null };

function UpdateStockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdFromUrl = searchParams.get("productId");

  const [hasBodega, setHasBodega] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [location, setLocation] = useState<"local" | "bodega">("local");
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<ProductOption[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [movementType, setMovementType] = useState<"entrada" | "ajuste">("ajuste");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loadingProduct, setLoadingProduct] = useState(!!productIdFromUrl);
  const [saving, setSaving] = useState(false);
  const [branchReloadToken, setBranchReloadToken] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBranch = () => setBranchReloadToken((n) => n + 1);
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
  }, []);

  const fetchCurrentStock = useCallback(
    async (pid: string, bid: string, loc: "local" | "bodega", withLocation: boolean) => {
      const supabase = createClient();
      const q = supabase
        .from("inventory")
        .select("quantity, location")
        .eq("product_id", pid)
        .eq("branch_id", bid);
      const { data: rows } = await q;
      let total = 0;
      if (withLocation) {
        const row = (rows ?? []).find((r: { location: string }) => r.location === loc);
        total = row ? (row.quantity ?? 0) : 0;
      } else {
        total = (rows ?? []).reduce((s: number, r: { quantity?: number }) => s + (r.quantity ?? 0), 0);
      }
      setCurrentStock(total);
    },
    []
  );

  const loadProductAndStock = useCallback(
    async (productId: string) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const bid = await resolveActiveBranchId(supabase, user.id);
      if (!bid) return;

      const { data: product } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("id", productId)
        .single();
      if (!product) return;

      setSelectedProduct({ id: product.id, name: product.name, sku: product.sku });
      setBranchId(bid);
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const bid = await resolveActiveBranchId(supabase, user.id);
      if (!bid || cancelled) return;
      const { data: branch } = await supabase.from("branches").select("has_bodega").eq("id", bid).single();
      if (!cancelled) {
        setHasBodega(!!branch?.has_bodega);
        setBranchId(bid);
      }
    })();
    return () => { cancelled = true; };
  }, [branchReloadToken]);

  useEffect(() => {
    if (!productIdFromUrl) {
      setLoadingProduct(false);
      return;
    }
    let cancelled = false;
    setLoadingProduct(true);
    loadProductAndStock(productIdFromUrl).then(() => {
      if (!cancelled) setLoadingProduct(false);
    });
    return () => { cancelled = true; };
  }, [productIdFromUrl, loadProductAndStock, branchReloadToken]);

  useEffect(() => {
    if (!selectedProduct?.id || !branchId) return;
    fetchCurrentStock(selectedProduct.id, branchId, location, hasBodega);
  }, [selectedProduct?.id, branchId, location, hasBodega, fetchCurrentStock]);

  useEffect(() => {
    const q = productSearchQuery.trim();
    if (q.length < 2) {
      setProductSearchResults([]);
      setSearchDropdownOpen(!!q);
      return;
    }
    let cancelled = false;
    setSearchingProducts(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) return;
      const { data } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("organization_id", userRow.organization_id)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .order("name", { ascending: true })
        .limit(20);
      if (!cancelled) {
        setProductSearchResults((data as ProductOption[]) ?? []);
        setSearchDropdownOpen(true);
      }
      if (!cancelled) setSearchingProducts(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [productSearchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const qtyNum = quantity === "" ? null : parseInt(quantity, 10);
  const validQty = qtyNum !== null && !Number.isNaN(qtyNum) && qtyNum >= 0;
  const afterStock =
    currentStock !== null && validQty
      ? movementType === "entrada"
        ? currentStock + qtyNum
        : qtyNum
      : null;

  const canSubmit = selectedProduct && branchId && validQty;

  async function handleSubmit() {
    if (!canSubmit || !selectedProduct || !branchId || qtyNum === null) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userRow } = user ? await supabase.from("users").select("organization_id").eq("id", user.id).single() : { data: null };
    const newQty = movementType === "entrada" ? (currentStock ?? 0) + qtyNum : qtyNum;

    if (hasBodega) {
      const { data: existing } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("product_id", selectedProduct.id)
        .eq("branch_id", branchId)
        .eq("location", location)
        .maybeSingle();
      if (existing) {
        await supabase.from("inventory").update({ quantity: newQty }).eq("id", existing.id);
      } else {
        await supabase.from("inventory").insert({
          product_id: selectedProduct.id,
          branch_id: branchId,
          location,
          quantity: newQty,
        });
      }
    } else {
      const { data: existing } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("product_id", selectedProduct.id)
        .eq("branch_id", branchId)
        .maybeSingle();
      if (existing) {
        await supabase.from("inventory").update({ quantity: newQty }).eq("id", existing.id);
      } else {
        await supabase.from("inventory").insert({
          product_id: selectedProduct.id,
          branch_id: branchId,
          quantity: newQty,
        });
      }
    }

    if (user && userRow?.organization_id) {
      try {
        const previousQty = currentStock ?? 0;
        const deltaNum = newQty - previousQty;
        const deltaStr = deltaNum >= 0 ? `+${deltaNum}` : String(deltaNum);
        await logActivity(supabase, {
          organizationId: userRow.organization_id,
          branchId,
          userId: user.id,
          action: "stock_adjusted",
          entityType: "product",
          entityId: selectedProduct.id,
          summary: `${movementType === "entrada" ? "Registró entrada" : "Ajustó stock"}: ${selectedProduct.name} (${selectedProduct.sku ?? "—"}), estaba ${previousQty}, quedó en ${newQty} (${deltaStr})`,
          metadata: {
            productName: selectedProduct.name,
            sku: selectedProduct.sku ?? null,
            previousQuantity: previousQty,
            newQuantity: newQty,
            delta: deltaNum,
            movementType,
          },
        });
      } catch {
        // No bloquear el flujo si falla el registro de actividad
      }
    }

    setSaving(false);
    setQuantity("");
    setReason("");
    setCurrentStock(newQty);
    router.push(`/inventario/${selectedProduct.id}`);
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb
          items={[
            { label: "Inventario", href: "/inventario" },
            ...(selectedProduct && productIdFromUrl
              ? [{ label: selectedProduct.name, href: `/inventario/${selectedProduct.id}` }]
              : []),
            { label: "Actualizar stock" },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Actualizar stock
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registra entradas de stock (compré / me llegó) o ajustes por conteo (corrección después de contar).
            </p>
          </div>
          <Link
            href={productIdFromUrl ? `/inventario/${productIdFromUrl}` : "/inventario"}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
            title={productIdFromUrl ? "Volver al detalle del producto" : "Volver a inventario"}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
        </div>
      </header>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 space-y-4">
          <div className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Producto y movimiento
            </p>
            <label className="mb-1 mt-4 block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
              Buscar producto
            </label>
            <div className="mt-2 relative" ref={searchDropdownRef}>
              <input
                readOnly={!!loadingProduct}
                value={loadingProduct ? "Cargando…" : selectedProduct ? `${selectedProduct.name}${selectedProduct.sku ? ` (${selectedProduct.sku})` : ""}` : productSearchQuery}
                onChange={(e) => {
                  if (!loadingProduct) {
                    setProductSearchQuery(e.target.value);
                    if (selectedProduct) setSelectedProduct(null);
                  }
                }}
                onFocus={() => productSearchQuery.trim().length >= 2 && setSearchDropdownOpen(true)}
                placeholder="Nombre o código (escribe al menos 2 letras)"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-[color:var(--shell-sidebar)] focus:bg-white focus:ring-2 focus:ring-slate-400/35 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-zinc-500"
              />
              {selectedProduct && !loadingProduct && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setProductSearchQuery("");
                    setCurrentStock(null);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                >
                  Cambiar
                </button>
              )}
              {searchDropdownOpen && (productSearchQuery.trim().length >= 2 || productSearchResults.length > 0) && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {searchingProducts ? (
                    <p className="px-4 py-3 text-[13px] text-slate-500 dark:text-slate-400">Buscando…</p>
                  ) : productSearchResults.length === 0 ? (
                    <p className="px-4 py-3 text-[13px] text-slate-500 dark:text-slate-400">Ningún producto coincide.</p>
                  ) : (
                    <ul className="py-1">
                      {productSearchResults.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(p);
                              setProductSearchQuery("");
                              setSearchDropdownOpen(false);
                              setProductSearchResults([]);
                            }}
                            className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-[13px] hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <span className="font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                            {p.sku && <span className="text-[12px] text-slate-500 dark:text-slate-400">{p.sku}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
              {selectedProduct ? "Producto seleccionado." : "Escribe nombre o referencia para buscar y selecciona un producto."}
            </p>

            <div className="mt-4">
              <label className="mb-2 block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                Tipo de movimiento
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMovementType("ajuste")}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-colors ${
                    movementType === "ajuste"
                      ? "border border-slate-400 bg-slate-200/80 text-[color:var(--shell-sidebar)] dark:border-zinc-500/55 dark:bg-zinc-700/40 dark:text-zinc-300"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  }`}
                  title="El valor que ingresas es el nuevo stock total (reemplaza)"
                >
                  Reemplazar stock
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType("entrada")}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-colors ${
                    movementType === "entrada"
                      ? "border border-slate-400 bg-slate-200/80 text-[color:var(--shell-sidebar)] dark:border-zinc-500/55 dark:bg-zinc-700/40 dark:text-zinc-300"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  }`}
                  title="Compré o me llegó mercancía"
                >
                  Entrada (sumar)
                </button>
              </div>
              <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                Reemplazar: el valor que ingresas es el nuevo stock total. Entrada: sumas esa cantidad al stock actual.
              </p>
            </div>

            {hasBodega && (
              <div className="mt-4">
                <label className="mb-2 block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  Ubicación
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLocation("local")}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-colors ${
                      location === "local"
                        ? "border border-slate-400 bg-slate-200/80 text-[color:var(--shell-sidebar)] dark:border-zinc-500/55 dark:bg-zinc-700/40 dark:text-zinc-300"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Local
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation("bodega")}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-colors ${
                      location === "bodega"
                        ? "border border-slate-400 bg-slate-200/80 text-[color:var(--shell-sidebar)] dark:border-zinc-500/55 dark:bg-zinc-700/40 dark:text-zinc-300"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Bodega
                  </button>
                </div>
                <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                  Indica si la entrada o el ajuste aplica al stock en local o en bodega.
                </p>
              </div>
            )}

            <label className="mb-1 mt-4 block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
              Cantidad
            </label>
            <div className="mt-2">
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-[color:var(--shell-sidebar)] focus:bg-white focus:ring-2 focus:ring-slate-400/35 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-zinc-500"
              />
            </div>

            <label className="mb-1 mt-4 block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
              Motivo (opcional)
            </label>
            <div className="mt-2">
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej. Entrada por compra a proveedor"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-[color:var(--shell-sidebar)] focus:bg-white focus:ring-2 focus:ring-slate-400/35 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-zinc-500"
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Resumen del movimiento
            </p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Producto</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{selectedProduct?.name ?? "Selecciona un producto"}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Tipo</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{movementType === "entrada" ? "Entrada (sumar)" : "Reemplazar stock"}</p>
              </div>
              {hasBodega && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Ubicación</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">{location === "local" ? "Local" : "Bodega"}</p>
                </div>
              )}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Stock actual</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{selectedProduct && currentStock !== null ? currentStock : "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Después del movimiento</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{afterStock !== null ? afterStock : "—"}</p>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-3xl bg-white px-5 py-5 dark:bg-slate-900 sm:px-6 sm:py-6">
            <div className="space-y-3">
              <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-700 dark:text-slate-100">Paso final</p>
                <p className="mt-1">
                  Cuando confirmes, se registrará el movimiento en el inventario.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || saving}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:pointer-events-none disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Actualizar stock"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function UpdateStockPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Cargando...</p>
      </div>
    }>
      <UpdateStockContent />
    </Suspense>
  );
}
