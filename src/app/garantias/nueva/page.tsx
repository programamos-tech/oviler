"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { MdSwapHoriz, MdAttachMoney, MdBuild } from "react-icons/md";

const IVA_RATE = 0.19;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function salePriceProduct(basePrice: number | null, applyIva: boolean): number {
  const base = Number(basePrice) ?? 0;
  return applyIva ? base + Math.round(base * IVA_RATE) : base;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

type SaleOption = {
  id: string;
  invoice_number: string;
  created_at: string;
  total: number;
  customer_id: string | null;
  customers: { name: string } | null;
};

type SaleItemOption = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products: { name: string; sku: string | null } | null;
};

type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
  base_price?: number | null;
  apply_iva?: boolean;
};

type CustomerOption = {
  id: string;
  name: string;
};

const WARRANTY_TYPE_LABELS: Record<string, string> = {
  exchange: "Cambio",
  refund: "Devolución",
  repair: "Reparación",
};

function NewWarrantyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const saleIdParam = searchParams.get("sale_id");

  const [saleSearch, setSaleSearch] = useState("");
  const [saleResults, setSaleResults] = useState<SaleOption[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleOption | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItemOption[]>([]);
  const [selectedSaleItem, setSelectedSaleItem] = useState<SaleItemOption | null>(null);
  const [warrantyType, setWarrantyType] = useState<"exchange" | "refund" | "repair" | null>(null);
  const [reason, setReason] = useState("");
  const [replacementProductSearch, setReplacementProductSearch] = useState("");
  const [replacementProductResults, setReplacementProductResults] = useState<ProductOption[]>([]);
  const [selectedReplacementProduct, setSelectedReplacementProduct] = useState<ProductOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [warrantyBySale, setWarrantyBySale] = useState<boolean>(true);
  // Por producto (cuando warrantyBySale === false)
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [quantityProduct, setQuantityProduct] = useState(1);
  const [stockProduct, setStockProduct] = useState<number | null>(null);
  const [stockReplacement, setStockReplacement] = useState<number | null>(null);

  // Cargar branch_id y configuración de garantías (por venta vs por producto)
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase
        .from("user_branches")
        .select("branch_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (!cancelled && ub?.branch_id) {
        setBranchId(ub.branch_id);
        const { data: branch } = await supabase.from("branches").select("warranty_by_sale").eq("id", ub.branch_id).single();
        if (branch) setWarrantyBySale(branch.warranty_by_sale !== false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cargar sale_id desde parámetro si existe
  useEffect(() => {
    if (saleIdParam) {
      const supabase = createClient();
      let cancelled = false;
      (async () => {
        const { data: saleData } = await supabase
          .from("sales")
          .select("id, invoice_number, created_at, total, customer_id, customers(name)")
          .eq("id", saleIdParam)
          .single();
        if (cancelled) return;
        if (saleData) {
          const transformedSale = {
            ...saleData,
            customers: Array.isArray(saleData.customers) ? (saleData.customers[0] || null) : saleData.customers,
          } as SaleOption;
          setSelectedSale(transformedSale);
          setSaleSearch(transformedSale.invoice_number);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [saleIdParam]);

  // Buscar clientes (para flujo por producto)
  useEffect(() => {
    if (warrantyBySale || !customerSearch.trim() || selectedCustomer) {
      setCustomerResults([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: org } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!org?.organization_id || cancelled) return;
      const { data } = await supabase
        .from("customers")
        .select("id, name")
        .eq("organization_id", org.organization_id)
        .eq("active", true)
        .or(`name.ilike.%${customerSearch.trim()}%,phone.ilike.%${customerSearch.trim()}%`)
        .order("name")
        .limit(10);
      if (cancelled) return;
      setCustomerResults((data ?? []) as CustomerOption[]);
    }, 300);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [warrantyBySale, customerSearch, selectedCustomer]);

  // Stock del producto con garantía (para saber si hay stock para cambio)
  const productUnderWarrantyId = warrantyBySale ? selectedSaleItem?.product_id : selectedProduct?.id;
  useEffect(() => {
    if (!branchId || !productUnderWarrantyId) {
      setStockProduct(null);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("branch_id", branchId)
        .eq("product_id", productUnderWarrantyId);
      if (cancelled) return;
      const total = (data ?? []).reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
      setStockProduct(total);
    })();
    return () => { cancelled = true; };
  }, [branchId, productUnderWarrantyId]);

  // Stock del producto de reemplazo (cuando tipo es cambio)
  useEffect(() => {
    if (!branchId || !selectedReplacementProduct?.id) {
      setStockReplacement(null);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("branch_id", branchId)
        .eq("product_id", selectedReplacementProduct.id);
      if (cancelled) return;
      const total = (data ?? []).reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
      setStockReplacement(total);
    })();
    return () => { cancelled = true; };
  }, [branchId, selectedReplacementProduct?.id]);

  // Buscar productos (para flujo por producto - producto con garantía)
  useEffect(() => {
    if (!warrantyBySale && productSearch.trim() && !selectedProduct) {
      const supabase = createClient();
      let cancelled = false;
      const timeoutId = setTimeout(async () => {
        const { data } = await supabase
          .from("products")
          .select("id, name, sku, base_price, apply_iva")
          .or(`name.ilike.%${productSearch.trim()}%,sku.ilike.%${productSearch.trim()}%`)
          .order("name")
          .limit(10);
        if (cancelled) return;
        setProductResults((data ?? []) as ProductOption[]);
      }, 300);
      return () => { cancelled = true; clearTimeout(timeoutId); };
    }
    setProductResults([]);
  }, [warrantyBySale, productSearch, selectedProduct]);

  // Buscar ventas
  useEffect(() => {
    if (!saleSearch.trim() || selectedSale) {
      setSaleResults([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, invoice_number, created_at, total, customer_id, customers(name)")
        .ilike("invoice_number", `%${saleSearch.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancelled) return;
      setSaleResults(((data ?? []) as Array<{
        id: string;
        invoice_number: string;
        created_at: string;
        total: number;
        customer_id: string | null;
        customers: { name: string }[] | { name: string } | null;
      }>).map((s) => ({
        ...s,
        customers: Array.isArray(s.customers) ? (s.customers[0] || null) : s.customers,
      })) as SaleOption[]);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [saleSearch, selectedSale]);

  // Cargar ítems de la venta seleccionada
  useEffect(() => {
    if (!selectedSale) {
      setSaleItems([]);
      setSelectedSaleItem(null);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sale_items")
        .select("id, product_id, quantity, unit_price, products(name, sku)")
        .eq("sale_id", selectedSale.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const transformedItems = ((data ?? []) as Array<{
        id: string;
        product_id: string;
        quantity: number;
        unit_price: number;
        products: { name: string; sku: string | null }[] | { name: string; sku: string | null } | null;
      }>).map((item) => ({
        ...item,
        products: Array.isArray(item.products) ? (item.products[0] || null) : item.products,
      })) as SaleItemOption[];
      setSaleItems(transformedItems);
      // Si solo hay un ítem, seleccionarlo automáticamente
      if (transformedItems && transformedItems.length === 1) {
        setSelectedSaleItem(transformedItems[0]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSale]);

  // Buscar productos de reemplazo (solo si es cambio)
  useEffect(() => {
    if (!replacementProductSearch.trim() || !warrantyType || warrantyType !== "exchange" || selectedReplacementProduct) {
      setReplacementProductResults([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      if (!branchId) return;
      const { data } = await supabase
        .from("products")
        .select("id, name, sku, base_price, apply_iva")
        .or(`name.ilike.%${replacementProductSearch.trim()}%,sku.ilike.%${replacementProductSearch.trim()}%`)
        .order("name", { ascending: true })
        .limit(10);
      if (cancelled) return;
      setReplacementProductResults((data ?? []) as ProductOption[]);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [replacementProductSearch, warrantyType, selectedReplacementProduct, branchId]);

  const handleSubmit = async () => {
    setError(null);
    if (!warrantyType) {
      setError("Debes seleccionar un tipo de garantía");
      return;
    }
    if (!reason.trim()) {
      setError("Debes ingresar el motivo de la garantía");
      return;
    }
    if (warrantyType === "exchange" && !selectedReplacementProduct) {
      setError("Debes seleccionar un producto de reemplazo para el cambio");
      return;
    }

    if (warrantyBySale) {
      if (!selectedSale) {
        setError("Debes seleccionar una venta");
        return;
      }
      if (!selectedSaleItem) {
        setError("Debes seleccionar un producto de la venta");
        return;
      }
    } else {
      if (!selectedCustomer) {
        setError("Debes seleccionar un cliente");
        return;
      }
      if (!selectedProduct) {
        setError("Debes seleccionar un producto");
        return;
      }
      if (!branchId) {
        setError("No se pudo obtener la sucursal");
        return;
      }
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Debes iniciar sesión");
      setSubmitting(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        customer_id: warrantyBySale ? selectedSale!.customer_id! : selectedCustomer!.id,
        product_id: warrantyBySale ? selectedSaleItem!.product_id : selectedProduct!.id,
        warranty_type: warrantyType,
        reason: reason.trim(),
        requested_by: user.id,
        replacement_product_id: warrantyType === "exchange" ? selectedReplacementProduct!.id : null,
      };
      if (warrantyBySale) {
        payload.sale_id = selectedSale!.id;
        payload.sale_item_id = selectedSaleItem!.id;
      } else {
        payload.branch_id = branchId;
        payload.quantity = Math.max(1, quantityProduct);
      }

      const { error: warrantyError } = await supabase
        .from("warranties")
        .insert(payload)
        .select("id")
        .single();

      if (warrantyError) {
        if (warrantyError.code === "23505") {
          setError("Ya existe una garantía para este ítem de venta");
        } else {
          setError("Error al crear la garantía: " + warrantyError.message);
        }
        setSubmitting(false);
        return;
      }

      router.push("/garantias");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear la garantía");
      setSubmitting(false);
    }
  };

  const quantityWarranty = warrantyBySale
    ? (selectedSaleItem?.quantity ?? 0)
    : quantityProduct;

  const productValue = warrantyBySale && selectedSaleItem
    ? selectedSaleItem.unit_price * selectedSaleItem.quantity
    : selectedProduct
      ? salePriceProduct(selectedProduct.base_price ?? null, !!selectedProduct.apply_iva) * quantityProduct
      : 0;

  const replacementValue =
    warrantyType === "exchange" && selectedReplacementProduct
      ? salePriceProduct(
          selectedReplacementProduct.base_price ?? null,
          !!selectedReplacementProduct.apply_iva
        ) * quantityWarranty
      : 0;

  const exchangeDifference =
    warrantyType === "exchange" && selectedReplacementProduct
      ? replacementValue - productValue
      : null;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Garantías", href: "/garantias" }, { label: "Nueva garantía" }]} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Nueva garantía
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              {warrantyBySale
                ? "Registra una nueva garantía: selecciona la venta, el producto y describe el motivo."
                : "Registra una nueva garantía: selecciona cliente, producto y describe el motivo (sin exigir factura)."}
            </p>
          </div>
          <Link
            href="/garantias"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a garantías"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-medium">{error}</p>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          {/* Flujo por producto: Cliente + Producto + Cantidad */}
          {!warrantyBySale && (
            <>
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Cliente <span className="text-ov-pink">*</span>
                </p>
                <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Buscar por nombre o teléfono
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                    onChange={(e) => {
                      setSelectedCustomer(null);
                      setCustomerSearch(e.target.value);
                    }}
                    placeholder="Ej. María López, 312..."
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {selectedCustomer && (
                    <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-medium text-ov-pink hover:underline">Cambiar</button>
                  )}
                </div>
                {customerResults.length > 0 && !selectedCustomer && (
                  <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                    {customerResults.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setCustomerResults([]); }} className="w-full px-4 py-2 text-left text-[14px] hover:bg-slate-50 dark:hover:bg-slate-700">
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Producto <span className="text-ov-pink">*</span>
                </p>
                <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Buscar producto con garantía
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedProduct ? selectedProduct.name : productSearch}
                    onChange={(e) => {
                      setSelectedProduct(null);
                      setProductSearch(e.target.value);
                    }}
                    placeholder="Nombre o código"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {selectedProduct && (
                    <button type="button" onClick={() => { setSelectedProduct(null); setProductSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-medium text-ov-pink hover:underline">Cambiar</button>
                  )}
                </div>
                {productResults.length > 0 && !selectedProduct && (
                  <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                    {productResults.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => { setSelectedProduct(p); setProductSearch(p.name); setProductResults([]); }} className="w-full px-4 py-2 text-left text-[14px] hover:bg-slate-50 dark:hover:bg-slate-700">
                          <div className="font-medium text-slate-900 dark:text-slate-50">{p.name}</div>
                          {p.sku && <div className="text-[12px] text-slate-500 dark:text-slate-400">{p.sku}</div>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3">
                  <label className="mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Cantidad</label>
                  <input type="number" min={1} value={quantityProduct} onChange={(e) => setQuantityProduct(Math.max(1, parseInt(e.target.value, 10) || 1))} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
                </div>
              </div>
            </>
          )}

          {/* Seleccionar venta (solo cuando garantías por venta) */}
          {warrantyBySale && (
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Venta <span className="text-ov-pink">*</span>
            </p>
            <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Buscar por número de factura
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedSale ? selectedSale.invoice_number : saleSearch}
                onChange={(e) => {
                  setSelectedSale(null);
                  setSaleSearch(e.target.value);
                }}
                placeholder="Ej. 001, 002..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              {selectedSale && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSale(null);
                    setSaleSearch("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-medium text-ov-pink hover:underline"
                >
                  Cambiar
                </button>
              )}
            </div>
            {saleResults.length > 0 && !selectedSale && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                {saleResults.map((sale) => (
                  <li key={sale.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSale(sale);
                        setSaleSearch(sale.invoice_number);
                        setSaleResults([]);
                      }}
                      className="w-full px-4 py-2 text-left text-[14px] hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-50">
                        Factura {sale.invoice_number}
                      </div>
                      <div className="text-[12px] text-slate-500 dark:text-slate-400">
                        {sale.customers?.name ?? "Cliente rápido"} · {formatDate(sale.created_at)} · $ {formatMoney(sale.total)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedSale && (
              <div className="mt-2 rounded-lg bg-slate-50 p-3 text-[13px] dark:bg-slate-800">
                <div className="font-medium text-slate-900 dark:text-slate-50">
                  Factura {selectedSale.invoice_number}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {selectedSale.customers?.name ?? "Cliente rápido"} · {formatDate(selectedSale.created_at)}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Seleccionar producto de la venta (solo por venta) */}
          {warrantyBySale && selectedSale && (
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Producto de la venta <span className="text-ov-pink">*</span>
              </p>
              <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
                Selecciona el producto por el cual se solicita la garantía:
              </p>
              {saleItems.length === 0 ? (
                <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">Cargando productos...</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {saleItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedSaleItem(item)}
                      className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                        selectedSaleItem?.id === item.id
                          ? "border-ov-pink bg-ov-pink/10 dark:bg-ov-pink/20"
                          : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-50">
                        {item.products?.name ?? "Producto"}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">
                        {item.products?.sku && <span>Ref. {item.products.sku}</span>}
                        {item.products?.sku && " · "}
                        <span>Cantidad: {item.quantity}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: Motivo, Tipo y Resumen */}
        <div className="space-y-4">
          {/* Motivo de la garantía */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Motivo de la garantía <span className="text-ov-pink">*</span>
            </p>
            <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Describe el problema o motivo
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ej. El producto presenta defecto de fábrica. El aceite tiene una fuga en el envase."
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Tipo de garantía */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Tipo de garantía <span className="text-ov-pink">*</span>
            </p>
            {productUnderWarrantyId && (
              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] dark:bg-slate-800">
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  Stock del producto:{" "}
                  {stockProduct !== null ? (
                    <span className={stockProduct > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                      {stockProduct} {stockProduct === 1 ? "unidad" : "unidades"} disponible{stockProduct === 0 ? " (no hay cambio por mismo producto)" : ""}
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">—</span>
                  )}
                </p>
                {warrantyType === "exchange" && selectedReplacementProduct && (
                  <p className="mt-1 font-medium text-slate-700 dark:text-slate-300">
                    Stock de reemplazo ({selectedReplacementProduct.name}):{" "}
                    {stockReplacement !== null ? (
                      <span className={stockReplacement > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                        {stockReplacement} {stockReplacement === 1 ? "unidad" : "unidades"}
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">—</span>
                    )}
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setWarrantyType("exchange");
                  setSelectedReplacementProduct(null);
                  setReplacementProductSearch("");
                }}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border-2 px-4 text-[13px] font-medium transition-colors ${
                  warrantyType === "exchange"
                    ? "border-ov-pink bg-ov-pink/10 text-ov-pink dark:bg-ov-pink/20"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <MdSwapHoriz className="h-5 w-5" />
                Cambio
              </button>
              <button
                type="button"
                onClick={() => {
                  setWarrantyType("refund");
                  setSelectedReplacementProduct(null);
                  setReplacementProductSearch("");
                }}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border-2 px-4 text-[13px] font-medium transition-colors ${
                  warrantyType === "refund"
                    ? "border-ov-pink bg-ov-pink/10 text-ov-pink dark:bg-ov-pink/20"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <MdAttachMoney className="h-5 w-5" />
                Devolución
              </button>
              <button
                type="button"
                onClick={() => {
                  setWarrantyType("repair");
                  setSelectedReplacementProduct(null);
                  setReplacementProductSearch("");
                }}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border-2 px-4 text-[13px] font-medium transition-colors ${
                  warrantyType === "repair"
                    ? "border-ov-pink bg-ov-pink/10 text-ov-pink dark:bg-ov-pink/20"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <MdBuild className="h-5 w-5" />
                Reparación
              </button>
            </div>
          </div>

          {/* Producto de reemplazo (solo si es cambio) */}
          {warrantyType === "exchange" && (
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Producto de reemplazo <span className="text-ov-pink">*</span>
              </p>
              <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Buscar producto para el cambio
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedReplacementProduct ? selectedReplacementProduct.name : replacementProductSearch}
                  onChange={(e) => {
                    setSelectedReplacementProduct(null);
                    setReplacementProductSearch(e.target.value);
                  }}
                  placeholder="Buscar por nombre o código"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                {selectedReplacementProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReplacementProduct(null);
                      setReplacementProductSearch("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-medium text-ov-pink hover:underline"
                  >
                    Cambiar
                  </button>
                )}
              </div>
              {replacementProductResults.length > 0 && !selectedReplacementProduct && (
                <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  {replacementProductResults.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReplacementProduct(product);
                          setReplacementProductSearch(product.name);
                          setReplacementProductResults([]);
                        }}
                        className="w-full px-4 py-2 text-left text-[14px] hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <div className="font-medium text-slate-900 dark:text-slate-50">
                          {product.name}
                        </div>
                        {product.sku && (
                          <div className="text-[12px] text-slate-500 dark:text-slate-400">
                            Código: {product.sku}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedReplacementProduct && (
                <div className="mt-2 rounded-lg bg-slate-50 p-3 text-[13px] dark:bg-slate-800">
                  <div className="font-medium text-slate-900 dark:text-slate-50">
                    {selectedReplacementProduct.name}
                  </div>
                  {selectedReplacementProduct.sku && (
                    <div className="text-slate-600 dark:text-slate-400">
                      Código: {selectedReplacementProduct.sku}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen de la garantía
            </p>
            <div className="mt-3 space-y-2">
              {warrantyBySale && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Venta</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50 text-right max-w-[60%]">
                    {selectedSale ? `Factura ${selectedSale.invoice_number}` : "—"}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-slate-600 dark:text-slate-400">Cliente</span>
                <span className="font-medium text-slate-900 dark:text-slate-50 text-right max-w-[60%]">
                  {warrantyBySale ? (selectedSale?.customers?.name ?? "—") : (selectedCustomer?.name ?? "—")}
                </span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-slate-600 dark:text-slate-400">Producto</span>
                <span className="font-medium text-slate-900 dark:text-slate-50 text-right max-w-[60%]">
                  {warrantyBySale ? (selectedSaleItem?.products?.name ?? "—") : (selectedProduct ? `${selectedProduct.name}${quantityProduct > 1 ? ` · ${quantityProduct} un.` : ""}` : "—")}
                </span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-slate-600 dark:text-slate-400">Tipo</span>
                <span className="font-medium text-slate-900 dark:text-slate-50">
                  {warrantyType ? WARRANTY_TYPE_LABELS[warrantyType] : "—"}
                </span>
              </div>
              {warrantyType === "exchange" && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Producto de reemplazo</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50 text-right max-w-[60%]">
                    {selectedReplacementProduct?.name ?? "—"}
                  </span>
                </div>
              )}
              {warrantyType === "refund" && productValue > 0 && (
                <>
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-400">Valor a devolver</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      $ {formatMoney(productValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total (a devolver al cliente)</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-50">
                      $ {formatMoney(productValue)}
                    </span>
                  </div>
                </>
              )}
              {warrantyType === "repair" && productValue > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Valor del producto (referencia)</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">
                    $ {formatMoney(productValue)}
                  </span>
                </div>
              )}
              {warrantyType === "exchange" && selectedReplacementProduct && (
                <>
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-400">Valor producto devuelto</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      $ {formatMoney(productValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-400">Valor producto reemplazo</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      $ {formatMoney(replacementValue)}
                    </span>
                  </div>
                  {exchangeDifference !== null && (
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="text-slate-600 dark:text-slate-400">Diferencia</span>
                      <span className={`font-medium ${exchangeDifference > 0 ? "text-ov-pink" : exchangeDifference < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                        {exchangeDifference > 0
                          ? `Cliente paga $ ${formatMoney(exchangeDifference)}`
                          : exchangeDifference < 0
                            ? `Se devuelve al cliente $ ${formatMoney(-exchangeDifference)}`
                            : "Sin diferencia"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {exchangeDifference !== null && exchangeDifference !== 0
                        ? exchangeDifference > 0
                          ? "Total (cliente paga)"
                          : "Total (a devolver)"
                        : "Total"}
                    </span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-50">
                      $ {formatMoney(exchangeDifference !== null ? Math.abs(exchangeDifference) : 0)}
                    </span>
                  </div>
                </>
              )}
              {warrantyType === "exchange" && !selectedReplacementProduct && productValue > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Valor del producto</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">
                    $ {formatMoney(productValue)}
                  </span>
                </div>
              )}
              {(!warrantyType || (warrantyType === "repair" && productValue === 0) || (warrantyType === "exchange" && !selectedReplacementProduct && productValue === 0)) && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-50">
                    {productValue > 0 ? `$ ${formatMoney(productValue)}` : "—"}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                submitting ||
                !warrantyType ||
                !reason.trim() ||
                (warrantyType === "exchange" && !selectedReplacementProduct) ||
                (warrantyBySale && (!selectedSale || !selectedSaleItem)) ||
                (!warrantyBySale && (!selectedCustomer || !selectedProduct || !branchId))
              }
              className="mt-4 w-full rounded-lg bg-ov-pink py-3 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:opacity-50 disabled:pointer-events-none dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              aria-busy={submitting}
              aria-disabled={submitting}
            >
              {submitting ? "Guardando…" : "Confirmar garantía"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function NewWarrantyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Cargando...</p>
      </div>
    }>
      <NewWarrantyContent />
    </Suspense>
  );
}
