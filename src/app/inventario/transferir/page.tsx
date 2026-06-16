"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";
import { logActivity } from "@/lib/activities";
import {
  clearInventarioListCache,
  invalidateInventarioDetail,
} from "@/lib/inventario-detail-cache";
import Breadcrumb from "@/app/components/Breadcrumb";
import { STORE_TECH_COPY } from "@/lib/store-tech-copy";
import { formatImeiDisplay, resolveImeiUnitIdsFromText } from "@/lib/imei";

const IME = STORE_TECH_COPY.imei;

type ProductOption = { id: string; name: string; sku: string | null; requires_imei?: boolean };
type ImeiStockUnit = { id: string; imei: string; location: "local" | "bodega" };

function mapTransferError(message: string): string {
  const m = message || "";
  if (m.includes("INSUFFICIENT_STOCK")) return "No hay unidades suficientes en el origen.";
  if (m.includes("BRANCH_NO_BODEGA")) return "Esta sucursal no tiene bodega activa.";
  if (m.includes("FORBIDDEN_BRANCH") || m.includes("FORBIDDEN_PRODUCT")) return "No tienes permiso para esta operación.";
  if (m.includes("PRODUCT_NOT_FOUND")) return "Producto no encontrado.";
  if (m.includes("INVALID_LOCATIONS") || m.includes("SAME_ORIGIN_DEST")) return "Origen y destino no válidos.";
  if (m.includes("INVALID_QUANTITY")) return "Indica una cantidad mayor que cero.";
  return m || "No se pudo completar la transferencia.";
}

function TransferStockContent() {
  const searchParams = useSearchParams();
  const productIdFromUrl = searchParams.get("productId");

  const [hasBodega, setHasBodega] = useState<boolean | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<ProductOption[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const [qtyLocal, setQtyLocal] = useState<number | null>(null);
  const [qtyBodega, setQtyBodega] = useState<number | null>(null);
  const [direction, setDirection] = useState<"local_to_bodega" | "bodega_to_local">("local_to_bodega");
  const [quantity, setQuantity] = useState("");
  const [loadingProduct, setLoadingProduct] = useState(!!productIdFromUrl);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [branchReloadToken, setBranchReloadToken] = useState(0);
  const [productRequiresImei, setProductRequiresImei] = useState(false);
  const [stockImeiUnits, setStockImeiUnits] = useState<ImeiStockUnit[]>([]);
  const [loadingImeiUnits, setLoadingImeiUnits] = useState(false);
  const [selectedImeiUnitIds, setSelectedImeiUnitIds] = useState<string[]>([]);
  const [imeiSelectText, setImeiSelectText] = useState("");
  const [stockReloadToken, setStockReloadToken] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBranch = () => setBranchReloadToken((n) => n + 1);
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
  }, []);

  const loadProduct = useCallback(async (productId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const bid = await resolveActiveBranchId(supabase, user.id);
    if (!bid) return;
    const { data: product } = await supabase.from("products").select("id, name, sku, requires_imei").eq("id", productId).single();
    if (!product) return;
    setSelectedProduct({ id: product.id, name: product.name, sku: product.sku, requires_imei: !!product.requires_imei });
    setProductRequiresImei(!!product.requires_imei);
    setProductSearchQuery(product.name);
    setBranchId(bid);
  }, []);

  const refreshLocationStock = useCallback(async (productId: string, bid: string) => {
    const supabase = createClient();
    const { data: rows } = await supabase
      .from("inventory")
      .select("location, quantity")
      .eq("product_id", productId)
      .eq("branch_id", bid);
    let local = 0;
    let bodega = 0;
    for (const r of rows ?? []) {
      const q = r.quantity ?? 0;
      const loc = (r as { location?: string | null }).location;
      if (loc === "bodega") bodega += q;
      else local += q;
    }
    setQtyLocal(local);
    setQtyBodega(bodega);
  }, []);

  const fetchStockImeiUnits = useCallback(async (productId: string, bid: string) => {
    setLoadingImeiUnits(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("product_imei_units")
      .select("id, imei, location")
      .eq("branch_id", bid)
      .eq("product_id", productId)
      .eq("status", "in_stock")
      .order("imei");
    setStockImeiUnits(
      (data ?? []).map((r) => ({
        id: r.id as string,
        imei: r.imei as string,
        location: (r.location === "bodega" ? "bodega" : "local") as "local" | "bodega",
      }))
    );
    setLoadingImeiUnits(false);
  }, []);

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
        setHasBodega(branch?.has_bodega !== false);
        setBranchId(bid);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchReloadToken]);

  useEffect(() => {
    if (!productIdFromUrl) {
      setLoadingProduct(false);
      return;
    }
    let cancelled = false;
    setLoadingProduct(true);
    loadProduct(productIdFromUrl).finally(() => {
      if (!cancelled) setLoadingProduct(false);
    });
    return () => {
      cancelled = true;
    };
  }, [productIdFromUrl, loadProduct, branchReloadToken]);

  useEffect(() => {
    if (!selectedProduct?.id || !branchId || hasBodega !== true) return;
    void refreshLocationStock(selectedProduct.id, branchId);
    if (productRequiresImei) {
      void fetchStockImeiUnits(selectedProduct.id, branchId);
    } else {
      setStockImeiUnits([]);
    }
  }, [selectedProduct?.id, branchId, hasBodega, productRequiresImei, refreshLocationStock, fetchStockImeiUnits, stockReloadToken]);

  useEffect(() => {
    if (!selectedProduct?.id || !branchId || hasBodega !== true) return;
    const resync = () => {
      void refreshLocationStock(selectedProduct.id, branchId);
      if (productRequiresImei) void fetchStockImeiUnits(selectedProduct.id, branchId);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    window.addEventListener("pageshow", resync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", resync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [selectedProduct?.id, branchId, hasBodega, productRequiresImei, refreshLocationStock, fetchStockImeiUnits]);

  useEffect(() => {
    setSelectedImeiUnitIds([]);
    setImeiSelectText("");
  }, [direction, selectedProduct?.id]);

  useEffect(() => {
    const q = productSearchQuery.trim();
    if (q.length < 2) {
      setProductSearchResults([]);
      setSearchDropdownOpen(false);
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
        .select("id, name, sku, requires_imei")
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
  const validQty = qtyNum !== null && !Number.isNaN(qtyNum) && qtyNum > 0;
  const fromLocation = direction === "local_to_bodega" ? "local" : "bodega";
  const toLocation = direction === "local_to_bodega" ? "bodega" : "local";
  const originImeiUnits = stockImeiUnits.filter((u) => u.location === fromLocation);
  const pastedUnitIds = resolveImeiUnitIdsFromText(originImeiUnits, imeiSelectText);
  const effectiveSelectedIds = [
    ...new Set([...selectedImeiUnitIds, ...pastedUnitIds.ids]),
  ];
  const bl = productRequiresImei
    ? stockImeiUnits.filter((u) => u.location === "local").length
    : (qtyLocal ?? 0);
  const bb = productRequiresImei
    ? stockImeiUnits.filter((u) => u.location === "bodega").length
    : (qtyBodega ?? 0);
  const availableAtOrigin = direction === "local_to_bodega" ? bl : bb;
  const imeiTransferCount = effectiveSelectedIds.length;
  const previewQty = productRequiresImei ? imeiTransferCount : qtyNum;
  const canPreviewQty = productRequiresImei
    ? imeiTransferCount > 0 && pastedUnitIds.missing.length === 0 && imeiTransferCount <= availableAtOrigin
    : validQty && qtyNum !== null && qtyNum <= availableAtOrigin;
  const localAfterTransfer =
    direction === "local_to_bodega"
      ? bl - (canPreviewQty ? (previewQty ?? 0) : 0)
      : bl + (canPreviewQty ? (previewQty ?? 0) : 0);
  const bodegaAfterTransfer =
    direction === "local_to_bodega"
      ? bb + (canPreviewQty ? (previewQty ?? 0) : 0)
      : bb - (canPreviewQty ? (previewQty ?? 0) : 0);
  const exceedsOrigin = productRequiresImei
    ? imeiTransferCount > availableAtOrigin
    : validQty && qtyNum !== null && qtyNum > availableAtOrigin;
  const canTransfer = productRequiresImei
    ? Boolean(
        selectedProduct &&
          branchId &&
          hasBodega &&
          imeiTransferCount > 0 &&
          pastedUnitIds.missing.length === 0 &&
          imeiTransferCount <= availableAtOrigin
      )
    : Boolean(
        selectedProduct &&
          branchId &&
          hasBodega &&
          validQty &&
          qtyNum !== null &&
          qtyNum <= availableAtOrigin
      );

  function toggleImeiUnit(id: string) {
    setSelectedImeiUnitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function syncStockAfterTransfer(productId: string, bid: string, transferredCount: number, destLabel: string) {
    await refreshLocationStock(productId, bid);
    if (productRequiresImei) {
      await fetchStockImeiUnits(productId, bid);
    }
    setSelectedImeiUnitIds([]);
    setImeiSelectText("");
    setQuantity("");
    setStockReloadToken((n) => n + 1);
    invalidateInventarioDetail(productId);
    clearInventarioListCache();
    setSuccessMessage(
      transferredCount === 1
        ? `1 unidad transferida a ${destLabel}. Stock actualizado.`
        : `${transferredCount} unidades transferidas a ${destLabel}. Stock actualizado.`
    );
    setSaving(false);
  }

  async function handleTransfer() {
    if (!canTransfer || !selectedProduct || !branchId) return;
    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userRow } = user
      ? await supabase.from("users").select("organization_id, name").eq("id", user.id).single()
      : { data: null };
    const actorName = userRow?.name?.trim() || null;

    if (productRequiresImei) {
      if (pastedUnitIds.missing.length > 0) {
        setFormError(`${IME.imeiNotInStock}: ${pastedUnitIds.missing[0]}`);
        setSaving(false);
        return;
      }
      if (effectiveSelectedIds.length === 0) {
        setFormError("Selecciona al menos un IMEI en el origen.");
        setSaving(false);
        return;
      }
      const { error } = await supabase.rpc("transfer_product_imei_units", {
        p_branch_id: branchId,
        p_product_id: selectedProduct.id,
        p_imei_unit_ids: effectiveSelectedIds,
        p_to_location: toLocation,
      });
      if (error) {
        setFormError(mapTransferError(error.message));
        setSaving(false);
        return;
      }
      if (user && userRow?.organization_id) {
        try {
          await logActivity(supabase, {
            organizationId: userRow.organization_id,
            branchId,
            userId: user.id,
            action: "stock_adjusted",
            entityType: "product",
            entityId: selectedProduct.id,
            summary: `Transferió ${effectiveSelectedIds.length} IMEI(s) a ${toLocation === "bodega" ? "bodega" : "local"}: ${selectedProduct.name}`,
            metadata: {
              productName: selectedProduct.name,
              sku: selectedProduct.sku ?? null,
              imeiCount: effectiveSelectedIds.length,
              imeiMovement: "transferir",
              toLocation,
              from: fromLocation,
              previousQuantity: bl + bb,
              newQuantity: bl + bb,
              delta: 0,
              userName: actorName,
            },
          });
        } catch {
          /* actividad opcional */
        }
      }
      await syncStockAfterTransfer(
        selectedProduct.id,
        branchId,
        effectiveSelectedIds.length,
        toLocation === "bodega" ? "bodega" : "local"
      );
      return;
    }

    if (qtyNum === null) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.rpc("transfer_inventory_between_locations", {
      p_product_id: selectedProduct.id,
      p_branch_id: branchId,
      p_from: fromLocation,
      p_to: toLocation,
      p_quantity: qtyNum,
    });

    if (error) {
      setFormError(mapTransferError(error.message));
      setSaving(false);
      return;
    }

    if (user && userRow?.organization_id) {
      try {
        await logActivity(supabase, {
          organizationId: userRow.organization_id,
          branchId,
          userId: user.id,
          action: "stock_transferred",
          entityType: "product",
          entityId: selectedProduct.id,
          summary: `Transferencia: ${selectedProduct.name} (${selectedProduct.sku ?? "—"}) ${qtyNum} u. de ${fromLocation === "local" ? "local" : "bodega"} → ${toLocation === "local" ? "local" : "bodega"}`,
          metadata: {
            productName: selectedProduct.name,
            sku: selectedProduct.sku ?? null,
            quantity: qtyNum,
            from: fromLocation,
            to: toLocation,
          },
        });
      } catch {
        /* actividad opcional */
      }
    }

    await syncStockAfterTransfer(
      selectedProduct.id,
      branchId,
      qtyNum,
      toLocation === "bodega" ? "bodega" : "local"
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb items={[{ label: "Inventario", href: "/inventario" }, { label: "Transferir stock" }]} />
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">Transferir stock</h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Mueve unidades entre el local (punto de venta) y la bodega de la sucursal activa.
            </p>
          </div>
          <Link
            href={productIdFromUrl ? `/inventario/${productIdFromUrl}` : "/inventario"}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title={productIdFromUrl ? "Volver al producto" : "Volver a inventario"}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      {hasBodega === null && <p className="text-[13px] text-slate-500 dark:text-slate-400">Cargando…</p>}

      {hasBodega === false && (
        <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800">
          <p className="text-[14px] font-medium text-amber-800 dark:text-amber-200">Esta sucursal no tiene bodega activa.</p>
          <p className="mt-1 text-[13px] text-amber-700 dark:text-amber-300">
            Activa &quot;Esta sucursal tiene bodega&quot; en{" "}
            <Link href="/sucursales/configurar" className="font-semibold underline hover:no-underline">
              Configurar sucursal
            </Link>{" "}
            para separar stock local y bodega.
          </p>
        </div>
      )}

      {hasBodega === true && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-5 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:p-6">
            <div className="relative" ref={searchDropdownRef}>
              <label className="mb-1.5 block text-[13px] font-bold text-slate-800 dark:text-slate-200">Producto</label>
              <input
                value={productSearchQuery}
                onChange={(e) => {
                  setProductSearchQuery(e.target.value);
                  if (!e.target.value.trim()) {
                    setSelectedProduct(null);
                    setProductRequiresImei(false);
                  }
                }}
                onFocus={() => productSearchQuery.trim().length >= 2 && setSearchDropdownOpen(true)}
                placeholder="Buscar por nombre o SKU…"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[color:var(--shell-sidebar)]/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                disabled={loadingProduct}
              />
              {searchDropdownOpen && (productSearchResults.length > 0 || searchingProducts) && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
                  {searchingProducts && <li className="px-3 py-2 text-[13px] text-slate-500">Buscando…</li>}
                  {!searchingProducts &&
                    productSearchResults.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700"
                          onClick={() => {
                            setSelectedProduct(p);
                            setProductRequiresImei(!!p.requires_imei);
                            setProductSearchQuery(p.name);
                            setSearchDropdownOpen(false);
                          }}
                        >
                          <span className="font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                          <span className="text-slate-500 dark:text-slate-400">{p.sku ?? "Sin SKU"}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {loadingProduct && <p className="text-[13px] text-slate-500">Cargando producto…</p>}

            {selectedProduct && !loadingProduct && (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stock actual</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-2">
                    <div className="rounded-lg bg-white py-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-600">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Local</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{bl}</p>
                    </div>
                    <div className="rounded-lg bg-white py-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-600">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Bodega</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{bb}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[13px] font-bold text-slate-800 dark:text-slate-200">Dirección</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection("local_to_bodega")}
                      className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                        direction === "local_to_bodega"
                          ? "bg-[color:var(--shell-sidebar)] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      Local → Bodega
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection("bodega_to_local")}
                      className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                        direction === "bodega_to_local"
                          ? "bg-[color:var(--shell-sidebar)] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      Bodega → Local
                    </button>
                  </div>
                  <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                    {productRequiresImei
                      ? IME.movementTransferirHint
                      : (
                        <>
                          Disponible para mover desde el origen:{" "}
                          <strong className="text-slate-700 dark:text-slate-300">{availableAtOrigin}</strong> u.
                        </>
                      )}
                  </p>
                </div>

                {productRequiresImei ? (
                  <>
                    <p className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-[12px] text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
                      {IME.requiresHint}
                    </p>
                    <div>
                      <label className="mb-1 block text-[13px] font-bold text-slate-800 dark:text-slate-200">
                        {IME.selectUnitsTitle}
                      </label>
                      <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">
                        Unidades en {fromLocation === "local" ? "local" : "bodega"} (origen). Marca o pega IMEIs.
                      </p>
                      {loadingImeiUnits ? (
                        <p className="text-[13px] text-slate-500">Cargando unidades…</p>
                      ) : originImeiUnits.length === 0 ? (
                        <p className="text-[13px] text-slate-500 dark:text-slate-400">
                          No hay unidades en el origen para esta dirección.
                        </p>
                      ) : (
                        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                          {originImeiUnits.map((unit) => {
                            const checked = effectiveSelectedIds.includes(unit.id);
                            return (
                              <li key={unit.id}>
                                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleImeiUnit(unit.id)}
                                    className="h-4 w-4 rounded border-slate-300"
                                  />
                                  <span className="font-mono text-[12px] text-slate-800 dark:text-slate-100">
                                    {formatImeiDisplay(unit.imei)}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <textarea
                        rows={3}
                        value={imeiSelectText}
                        onChange={(e) => setImeiSelectText(e.target.value)}
                        placeholder="O pega IMEIs aquí (uno por línea)"
                        className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 font-mono text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-[color:var(--shell-sidebar)] focus:bg-white focus:ring-2 focus:ring-slate-400/35 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                      />
                      {pastedUnitIds.missing.length > 0 ? (
                        <p className="mt-1 text-[12px] text-red-600 dark:text-red-400">
                          {IME.imeiNotInStock}: {pastedUnitIds.missing.join(", ")}
                        </p>
                      ) : effectiveSelectedIds.length > 0 ? (
                        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                          {IME.transferCount}: {effectiveSelectedIds.length}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : (
                <div>
                  <label htmlFor="transfer-qty" className="mb-1.5 block text-[13px] font-bold text-slate-800 dark:text-slate-200">
                    Cantidad
                  </label>
                  <input
                    id="transfer-qty"
                    type="number"
                    min={1}
                    max={availableAtOrigin}
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="h-10 w-full max-w-[12rem] rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium tabular-nums text-slate-800 outline-none focus:ring-2 focus:ring-[color:var(--shell-sidebar)]/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                )}

                {successMessage && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                    {successMessage}
                  </div>
                )}

                {formError && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
                    {formError}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!canTransfer || saving}
                  onClick={() => void handleTransfer()}
                  className="inline-flex h-11 w-full max-w-md items-center justify-center rounded-xl bg-slate-900 px-4 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {saving ? "Transfiriendo…" : "Transferir"}
                </button>
              </>
            )}
          </div>

          <aside className="flex min-h-[280px] flex-col rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Resumen</p>

            {selectedProduct && !loadingProduct ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[12px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Operación</p>
                <p className="mt-1 line-clamp-2 text-[14px] font-semibold text-slate-900 dark:text-slate-50">{selectedProduct.name}</p>
                <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-300">
                  {direction === "local_to_bodega" ? (
                    <>
                      <span className="font-medium text-slate-800 dark:text-slate-200">Local → Bodega</span>
                      <span className="text-slate-500 dark:text-slate-400"> · mueves desde el mostrador hacia bodega</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-slate-800 dark:text-slate-200">Bodega → Local</span>
                      <span className="text-slate-500 dark:text-slate-400"> · mueves desde bodega al mostrador</span>
                    </>
                  )}
                </p>

                {!canPreviewQty ? (
                  <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    {productRequiresImei
                      ? "Selecciona al menos un IMEI del origen para ver el resumen."
                      : "Escribe una cantidad válida para ver cómo quedará el stock en local y en bodega."}
                  </p>
                ) : exceedsOrigin ? (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    Solo hay <strong className="tabular-nums">{availableAtOrigin}</strong> u. disponibles en el origen; reduce la selección para poder transferir.
                  </p>
                ) : (
                  <>
                    <p className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Después de transferir{" "}
                      <span className="tabular-nums text-slate-800 dark:text-slate-200">
                        {productRequiresImei ? imeiTransferCount : qtyNum}
                      </span>{" "}
                      u.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white py-2.5 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-600">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Local</p>
                        <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{localAfterTransfer}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                          <span className="tabular-nums">{bl}</span> → <span className="tabular-nums">{localAfterTransfer}</span>
                        </p>
                      </div>
                      <div className="rounded-lg bg-white py-2.5 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-600">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Bodega</p>
                        <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{bodegaAfterTransfer}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                          <span className="tabular-nums">{bb}</span> → <span className="tabular-nums">{bodegaAfterTransfer}</span>
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      Total en sucursal: <span className="tabular-nums text-slate-700 dark:text-slate-300">{bl + bb}</span> u. (sin cambio)
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">Elige un producto para ver el resumen de la operación.</p>
            )}

            <ul className="mt-auto space-y-2 border-t border-slate-200 pt-4 text-[12px] leading-snug text-slate-500 dark:border-slate-700/80 dark:text-slate-400">
              <li>El total en listado y en la ficha del producto sigue siendo la suma de local + bodega.</li>
              <li>Esta acción solo mueve unidades entre los dos depósitos; no crea ni elimina productos.</li>
              <li>Si usas ubicaciones detalladas en bodega, el total de bodega sigue reflejado en la columna agregada.</li>
            </ul>
          </aside>
        </section>
      )}
    </div>
  );
}

export default function TransferStockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">Cargando…</p>
        </div>
      }
    >
      <TransferStockContent />
    </Suspense>
  );
}
