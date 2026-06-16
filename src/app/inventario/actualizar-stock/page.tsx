"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { logActivity } from "@/lib/activities";
import { createClient } from "@/lib/supabase/client";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";
import {
  clearInventarioListCache,
  invalidateInventarioDetail,
} from "@/lib/inventario-detail-cache";
import Breadcrumb from "@/app/components/Breadcrumb";
import { STORE_TECH_COPY } from "@/lib/store-tech-copy";
import { isValidImei, parseImeiList, formatImeiDisplay, resolveImeiUnitIdsFromText } from "@/lib/imei";

const IME = STORE_TECH_COPY.imei;

type ProductOption = { id: string; name: string; sku: string | null; requires_imei?: boolean };
type ImeiStockUnit = { id: string; imei: string; location: "local" | "bodega" };
type ImeiMovement = "entrada" | "baja";

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
  const [stockLocalQty, setStockLocalQty] = useState(0);
  const [stockBodegaQty, setStockBodegaQty] = useState(0);
  const [movementType, setMovementType] = useState<"entrada" | "ajuste">("ajuste");
  const [imeiMovement, setImeiMovement] = useState<ImeiMovement>("entrada");
  const [stockImeiUnits, setStockImeiUnits] = useState<ImeiStockUnit[]>([]);
  const [loadingImeiUnits, setLoadingImeiUnits] = useState(false);
  const [selectedImeiUnitIds, setSelectedImeiUnitIds] = useState<string[]>([]);
  const [imeiSelectText, setImeiSelectText] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [imeiBulkText, setImeiBulkText] = useState("");
  const [productRequiresImei, setProductRequiresImei] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
      const { data: rows } = await supabase
        .from("inventory")
        .select("quantity, location")
        .eq("product_id", pid)
        .eq("branch_id", bid);
      let local = 0;
      let bodega = 0;
      for (const r of rows ?? []) {
        const q = r.quantity ?? 0;
        if ((r as { location?: string }).location === "bodega") bodega += q;
        else local += q;
      }
      setStockLocalQty(local);
      setStockBodegaQty(bodega);
      if (withLocation) {
        setCurrentStock(loc === "bodega" ? bodega : local);
      } else {
        setCurrentStock(local + bodega);
      }
    },
    []
  );

  const fetchStockImeiUnits = useCallback(async (pid: string, bid: string) => {
    setLoadingImeiUnits(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("product_imei_units")
      .select("id, imei, location")
      .eq("branch_id", bid)
      .eq("product_id", pid)
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

  const loadProductAndStock = useCallback(
    async (productId: string) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const bid = await resolveActiveBranchId(supabase, user.id);
      if (!bid) return;

      const { data: product } = await supabase
        .from("products")
        .select("id, name, sku, requires_imei")
        .eq("id", productId)
        .single();
      if (!product) return;

      setSelectedProduct({ id: product.id, name: product.name, sku: product.sku, requires_imei: !!product.requires_imei });
      setProductRequiresImei(!!product.requires_imei);
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
    if (productRequiresImei) {
      fetchStockImeiUnits(selectedProduct.id, branchId);
    } else {
      setStockImeiUnits([]);
    }
  }, [selectedProduct?.id, branchId, location, hasBodega, productRequiresImei, fetchCurrentStock, fetchStockImeiUnits]);

  useEffect(() => {
    if (!productRequiresImei) return;
    setImeiMovement("entrada");
    setMovementType("entrada");
    setQuantity("");
    setSelectedImeiUnitIds([]);
    setImeiSelectText("");
  }, [productRequiresImei, selectedProduct?.id]);

  useEffect(() => {
    setSelectedImeiUnitIds([]);
    setImeiSelectText("");
    setImeiBulkText("");
  }, [imeiMovement, selectedProduct?.id]);

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
  const validQty = qtyNum !== null && !Number.isNaN(qtyNum) && qtyNum >= 0;
  const imeiList = parseImeiList(imeiBulkText);
  const imeiListValid = imeiList.length > 0 && imeiList.every(isValidImei);
  const hasInvalidImeis = imeiList.length > 0 && !imeiList.every(isValidImei);
  const pastedUnitIds = resolveImeiUnitIdsFromText(stockImeiUnits, imeiSelectText);
  const effectiveSelectedIds = [
    ...new Set([
      ...selectedImeiUnitIds,
      ...pastedUnitIds.ids,
    ]),
  ];
  const totalStock = stockLocalQty + stockBodegaQty;

  const afterStock = (() => {
    if (!selectedProduct) return null;
    if (productRequiresImei) {
      if (imeiMovement === "entrada" && imeiListValid) {
        return totalStock + imeiList.length;
      }
      if (imeiMovement === "baja" && effectiveSelectedIds.length > 0) {
        return totalStock - effectiveSelectedIds.length;
      }
      return null;
    }
    if (currentStock === null || !validQty) return null;
    return movementType === "entrada" ? currentStock + (qtyNum ?? 0) : (qtyNum ?? 0);
  })();

  const bajaReasonValid = reason.trim().length >= 3;

  const canSubmit = (() => {
    if (!selectedProduct || !branchId) return false;
    if (productRequiresImei) {
      if (imeiMovement === "entrada") return imeiListValid;
      if (imeiMovement === "baja") {
        return effectiveSelectedIds.length > 0 && pastedUnitIds.missing.length === 0 && bajaReasonValid;
      }
      return false;
    }
    return validQty;
  })();

  function toggleImeiUnit(id: string) {
    setSelectedImeiUnitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const imeiMovementLabel: Record<ImeiMovement, string> = {
    entrada: IME.movementEntrada,
    baja: IME.movementBaja,
  };

  async function handleSubmit() {
    if (!canSubmit || !selectedProduct || !branchId) return;
    setSaving(true);
    setSubmitError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userRow } = user
      ? await supabase.from("users").select("organization_id, name").eq("id", user.id).single()
      : { data: null };
    const actorName = userRow?.name?.trim() || null;

    if (productRequiresImei) {
      if (imeiMovement === "entrada") {
        const invalid = imeiList.find((x) => !isValidImei(x));
        if (invalid) {
          setSubmitError(`${IME.invalidImei}: ${invalid}`);
          setSaving(false);
          return;
        }
      const { error: rpcErr } = await supabase.rpc("register_product_imei_units", {
        p_branch_id: branchId,
        p_product_id: selectedProduct.id,
        p_imeis: imeiList,
        p_location: hasBodega ? location : "local",
      });
      if (rpcErr) {
        setSubmitError(rpcErr.message.includes("unique") ? IME.duplicateImei : rpcErr.message);
        setSaving(false);
        return;
      }
      const prevTotal = stockLocalQty + stockBodegaQty;
      const newTotal = prevTotal + imeiList.length;
      if (user && userRow?.organization_id) {
        try {
          await logActivity(supabase, {
            organizationId: userRow.organization_id,
            branchId,
            userId: user.id,
            action: "stock_adjusted",
            entityType: "product",
            entityId: selectedProduct.id,
            summary: `Entrada ${imeiList.length} IMEI(s) en ${hasBodega && location === "bodega" ? "bodega" : "local"}: ${selectedProduct.name} (estaba ${prevTotal}, quedó ${newTotal})`,
            metadata: {
              productName: selectedProduct.name,
              sku: selectedProduct.sku ?? null,
              imeiCount: imeiList.length,
              location: hasBodega ? location : "local",
              imeiMovement: "entrada",
              previousQuantity: prevTotal,
              newQuantity: newTotal,
              delta: imeiList.length,
            },
          });
        } catch {
          /* ignore */
        }
      }
      } else if (imeiMovement === "baja") {
        if (!bajaReasonValid) {
          setSubmitError(IME.bajaReasonMissing);
          setSaving(false);
          return;
        }
        if (pastedUnitIds.missing.length > 0) {
          setSubmitError(`${IME.imeiNotInStock}: ${pastedUnitIds.missing[0]}`);
          setSaving(false);
          return;
        }
        const removedImeis = stockImeiUnits
          .filter((u) => effectiveSelectedIds.includes(u.id))
          .map((u) => u.imei);
        const prevTotal = stockLocalQty + stockBodegaQty;
        const newTotal = prevTotal - effectiveSelectedIds.length;
        const { error: rpcErr } = await supabase.rpc("remove_product_imei_units", {
          p_branch_id: branchId,
          p_product_id: selectedProduct.id,
          p_imei_unit_ids: effectiveSelectedIds,
          p_reason: reason.trim(),
        });
        if (rpcErr) {
          setSubmitError(rpcErr.message);
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
              summary: `Baja ${effectiveSelectedIds.length} IMEI(s): ${selectedProduct.name} — ${reason.trim()} (estaba ${prevTotal}, quedó ${newTotal})`,
              metadata: {
                productName: selectedProduct.name,
                sku: selectedProduct.sku ?? null,
                imeiCount: effectiveSelectedIds.length,
                imeiMovement: "baja",
                reason: reason.trim(),
                imeis: removedImeis,
                previousQuantity: prevTotal,
                newQuantity: newTotal,
                delta: newTotal - prevTotal,
                userName: actorName,
              },
            });
          } catch {
            /* ignore */
          }
        }
      }
      setSaving(false);
      setImeiBulkText("");
      setImeiSelectText("");
      setSelectedImeiUnitIds([]);
      setReason("");
      invalidateInventarioDetail(selectedProduct.id);
      clearInventarioListCache();
      router.push(`/inventario/${selectedProduct.id}?refresh=${Date.now()}`);
      return;
    }

    if (qtyNum === null) {
      setSaving(false);
      return;
    }
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
    invalidateInventarioDetail(selectedProduct.id);
    clearInventarioListCache();
    router.push(`/inventario/${selectedProduct.id}?refresh=${Date.now()}`);
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
                              setProductRequiresImei(!!p.requires_imei);
                              setProductSearchQuery("");
                              setSearchDropdownOpen(false);
                              setProductSearchResults([]);
                              setImeiBulkText("");
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
              {productRequiresImei ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(["entrada", "baja"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setImeiMovement(mode)}
                        className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-colors ${
                          imeiMovement === mode
                            ? "border border-slate-400 bg-slate-200/80 text-[color:var(--shell-sidebar)] dark:border-zinc-500/55 dark:bg-zinc-700/40 dark:text-zinc-300"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {imeiMovementLabel[mode]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                    {imeiMovement === "entrada"
                      ? IME.movementEntradaHint
                      : IME.movementBajaHint}
                  </p>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            {hasBodega && (!productRequiresImei || imeiMovement === "entrada") && (
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
                  Indica si la entrada aplica al stock en local o en bodega.
                </p>
              </div>
            )}

            {productRequiresImei && (
              <p className="mt-2 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-[12px] text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
                {IME.requiresHint}
              </p>
            )}

            {productRequiresImei && imeiMovement === "entrada" ? (
              <>
                <label className="mb-1 mt-4 block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  {IME.registerTitle}
                </label>
                <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">{IME.registerHint}</p>
                <textarea
                  rows={5}
                  value={imeiBulkText}
                  onChange={(e) => setImeiBulkText(e.target.value)}
                  placeholder={IME.registerPlaceholder}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 font-mono text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-[color:var(--shell-sidebar)] focus:bg-white focus:ring-2 focus:ring-slate-400/35 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                />
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  {imeiList.length > 0
                    ? `${imeiList.length} IMEI(s) detectados${imeiListValid ? ` → +${imeiList.length} al stock` : hasInvalidImeis ? " (revisa que tengan 15 dígitos)" : ""}`
                    : "Un IMEI por línea (15 dígitos cada uno)"}
                </p>
              </>
            ) : productRequiresImei && imeiMovement === "baja" ? (
              <>
                <label className="mb-1 mt-4 block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  {IME.selectUnitsTitle}
                </label>
                <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">
                  Marca las unidades o pega los IMEIs abajo.
                </p>
                {loadingImeiUnits ? (
                  <p className="text-[13px] text-slate-500">Cargando unidades…</p>
                ) : stockImeiUnits.length === 0 ? (
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">{IME.selectUnitsEmpty}</p>
                ) : (
                  <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                    {stockImeiUnits.map((unit) => {
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
                            {hasBodega && (
                              <span className="ml-auto text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {unit.location === "bodega" ? "Bodega" : "Local"}
                              </span>
                            )}
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
                    {`${IME.removeCount}: ${effectiveSelectedIds.length}`}
                  </p>
                ) : null}
              </>
            ) : !productRequiresImei ? (
              <>
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
              </>
            ) : null}

            {submitError ? (
              <p className="mt-3 text-[13px] font-medium text-red-600 dark:text-red-400">{submitError}</p>
            ) : null}

            <label className="mb-1 mt-4 block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
              {productRequiresImei && imeiMovement === "baja" ? "Motivo de la baja" : "Motivo (opcional)"}
              {productRequiresImei && imeiMovement === "baja" ? (
                <span className="ml-1 font-normal text-red-600 dark:text-red-400">*</span>
              ) : null}
            </label>
            {productRequiresImei && imeiMovement === "baja" ? (
              <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">{IME.bajaReasonRequired}</p>
            ) : null}
            <div className="mt-2">
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required={productRequiresImei && imeiMovement === "baja"}
                placeholder={
                  productRequiresImei && imeiMovement === "baja"
                    ? IME.bajaReasonPlaceholder
                    : STORE_TECH_COPY.inventario.stockNotePlaceholder
                }
                className={`w-full rounded-xl border bg-slate-50/90 px-4 py-3 text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/35 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder:text-slate-500 ${
                  productRequiresImei && imeiMovement === "baja" && reason.trim().length > 0 && !bajaReasonValid
                    ? "border-red-300 focus:border-red-400 dark:border-red-800"
                    : "border-slate-200 focus:border-[color:var(--shell-sidebar)] dark:border-slate-700"
                }`}
              />
            </div>
            {productRequiresImei && imeiMovement === "baja" && reason.trim().length > 0 && !bajaReasonValid ? (
              <p className="mt-1 text-[12px] text-red-600 dark:text-red-400">{IME.bajaReasonMissing}</p>
            ) : null}
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
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {productRequiresImei
                    ? imeiMovementLabel[imeiMovement]
                    : movementType === "entrada"
                      ? "Entrada (sumar)"
                      : "Reemplazar stock"}
                </p>
              </div>
              {hasBodega && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Ubicación</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    {location === "local" ? "Local" : "Bodega"}
                  </p>
                </div>
              )}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Stock actual</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {selectedProduct
                    ? productRequiresImei && hasBodega
                      ? `${totalStock} total (Local ${stockLocalQty} · Bodega ${stockBodegaQty})`
                      : productRequiresImei
                        ? totalStock
                        : currentStock !== null
                          ? currentStock
                          : "—"
                    : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Después del movimiento</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {afterStock !== null
                    ? afterStock
                    : productRequiresImei && imeiMovement === "entrada" && imeiList.length > 0
                      ? "— (IMEI inválido)"
                      : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-3xl bg-white px-5 py-5 dark:bg-slate-900 sm:px-6 sm:py-6">
            <div className="space-y-3">
              <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-700 dark:text-slate-100">Paso final</p>
                <p className="mt-1">
                  {productRequiresImei
                    ? imeiMovement === "entrada"
                      ? "Confirma para cargar las unidades al inventario (1 IMEI = 1 unidad)."
                      : "Indica el motivo y confirma: las unidades saldrán del stock."
                    : "Cuando confirmes, se registrará el movimiento en el inventario."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || saving}
                className="inline-flex h-10 w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-[color:var(--shell-sidebar)] px-4 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:pointer-events-none disabled:opacity-50"
              >
                <span>{saving ? "Guardando…" : "Actualizar stock"}</span>
                {!saving && productRequiresImei && imeiMovement === "entrada" && imeiListValid ? (
                  <span className="text-[11px] font-normal text-white/85">+{imeiList.length} unidad{imeiList.length === 1 ? "" : "es"}</span>
                ) : null}
                {!saving && productRequiresImei && imeiMovement === "baja" && effectiveSelectedIds.length > 0 ? (
                  <span className="text-[11px] font-normal text-white/85">−{effectiveSelectedIds.length} unidad{effectiveSelectedIds.length === 1 ? "" : "es"}</span>
                ) : null}
              </button>
              {!canSubmit && !saving && selectedProduct ? (
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                  {productRequiresImei
                    ? imeiMovement === "entrada"
                      ? imeiList.length === 0
                        ? "Pega al menos un IMEI de 15 dígitos."
                        : hasInvalidImeis
                          ? IME.invalidImei
                          : null
                      : effectiveSelectedIds.length === 0
                        ? "Selecciona o pega al menos un IMEI en stock."
                        : !bajaReasonValid
                          ? IME.bajaReasonMissing
                          : pastedUnitIds.missing.length > 0
                            ? IME.imeiNotInStock
                            : null
                    : "Ingresa una cantidad válida."}
                </p>
              ) : null}
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
