"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const IVA_RATE = 0.19;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

/** Parsea string con separador de miles (p. ej. "48.314") a número */
function parseFormattedPrice(str: string): number {
  const digits = str.replace(/\D/g, "");
  return digits === "" ? 0 : parseInt(digits, 10);
}

function salePrice(basePrice: number, applyIva: boolean): number {
  const base = Number(basePrice) || 0;
  return applyIva ? base + Math.round(base * IVA_RATE) : base;
}

type CustomerOption = {
  id: string;
  name: string;
  cedula: string | null;
  email: string | null;
  phone: string | null;
};

type CustomerAddress = {
  id: string;
  label: string;
  address: string;
  reference_point: string | null;
  is_default: boolean;
  display_order: number;
};

type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
  base_price: number;
  base_cost: number | null;
  apply_iva: boolean;
};

type CartItem = {
  product_id: string;
  name: string;
  /** Referencia / SKU del producto */
  reference: string;
  quantity: number;
  unit_price: number;
  /** Precio de venta mínimo (no se puede vender por menos) */
  min_unit_price: number;
  /** Costo de compra por unidad (para alerta de no vender bajo costo) */
  unit_cost: number;
  /** Descuento en % (0-100) o en valor fijo $; solo uno por línea */
  discount_type?: "percent" | "fixed";
  discount_value?: number;
};

export default function NewSalePage() {
  const router = useRouter();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "mixed">("cash");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [amountCash, setAmountCash] = useState<string>("");
  const [amountTransfer, setAmountTransfer] = useState<string>("");
  const [isDelivery, setIsDelivery] = useState(false);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [selectedDeliveryAddressId, setSelectedDeliveryAddressId] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<string>("");
  const [deliveryPersons, setDeliveryPersons] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState<string | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [stockLimitProductId, setStockLimitProductId] = useState<string | null>(null);
  const [customerHighlightIndex, setCustomerHighlightIndex] = useState(0);
  const customerListRef = useRef<HTMLUListElement>(null);
  const customerItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [productHighlightIndex, setProductHighlightIndex] = useState(0);
  const [stockByProductId, setStockByProductId] = useState<Record<string, number>>({});
  const productListRef = useRef<HTMLUListElement>(null);
  const productItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset highlight cuando cambian los resultados de clientes
  useEffect(() => {
    setCustomerHighlightIndex(0);
  }, [customerResults]);

  // Cargar domiciliarios cuando se carga la sucursal
  useEffect(() => {
    if (!branchId) {
      setDeliveryPersons([]);
      setSelectedDeliveryPersonId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("delivery_persons")
        .select("id, name, code")
        .eq("branch_id", branchId)
        .eq("active", true)
        .order("code", { ascending: true });
      if (cancelled) return;
      const list = (data ?? []) as Array<{ id: string; name: string; code: string }>;
      setDeliveryPersons(list);
      // Si hay 1 o 2 domiciliarios, seleccionar automáticamente el primero (d1)
      // Si hay más de 2, mostrar el selector para que el usuario elija
      if (list.length > 0 && list.length <= 2 && !selectedDeliveryPersonId) {
        setSelectedDeliveryPersonId(list[0].id);
      }
    })();
    return () => { cancelled = true; };
  }, [branchId]);

  // Al cambiar cliente: cargar direcciones y resetear venta a domicilio
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerAddresses([]);
      setIsDelivery(false);
      setSelectedDeliveryAddressId(null);
      setDeliveryFee("");
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("customer_addresses")
        .select("id, label, address, reference_point, is_default, display_order")
        .eq("customer_id", selectedCustomer.id)
        .order("display_order", { ascending: true })
        .order("is_default", { ascending: false });
      if (cancelled) return;
      const list = (data ?? []) as CustomerAddress[];
      setCustomerAddresses(list);
      const defaultAddr = list.find((a) => a.is_default);
      setSelectedDeliveryAddressId(defaultAddr?.id ?? (list[0]?.id ?? null));
    })();
    return () => { cancelled = true; };
  }, [selectedCustomer?.id]);

  // Reset highlight cuando cambian los resultados de productos
  useEffect(() => {
    setProductHighlightIndex(0);
  }, [productResults]);

  // Productos que aún no están en el carrito; si la búsqueda está vacía solo los que tienen stock
  const filteredProductResults = useMemo(() => {
    const notInCart = productResults.filter((p) => !cart.some((c) => c.product_id === p.id));
    const hasSearch = productSearch.trim() !== "";
    if (hasSearch) return notInCart;
    return notInCart.filter((p) => (stockByProductId[p.id] ?? 0) > 0);
  }, [productResults, cart, productSearch, stockByProductId]);

  // Ajustar índice al quitar productos de la lista (p. ej. al agregar al carrito)
  useEffect(() => {
    setProductHighlightIndex((i) => Math.min(i, Math.max(0, filteredProductResults.length - 1)));
  }, [filteredProductResults.length]);

  // Stock por producto en la sucursal actual (búsqueda + productos en carrito)
  useEffect(() => {
    if (!branchId) {
      setStockByProductId({});
      return;
    }
    const searchIds = productResults.map((p) => p.id);
    const cartIds = cart.map((c) => c.product_id);
    const productIds = [...new Set([...searchIds, ...cartIds])];
    if (productIds.length === 0) {
      setStockByProductId({});
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("inventory")
        .select("product_id, quantity")
        .eq("branch_id", branchId)
        .in("product_id", productIds);
      if (cancelled) return;
      const byProduct: Record<string, number> = {};
      (data ?? []).forEach((row: { product_id: string; quantity: number }) => {
        byProduct[row.product_id] = (byProduct[row.product_id] ?? 0) + Number(row.quantity);
      });
      setStockByProductId(byProduct);
    })();
    return () => { cancelled = true; };
  }, [branchId, productResults, cart]);

  // Hacer scroll al ítem resaltado (clientes) al navegar con teclado
  useEffect(() => {
    if (customerResults.length === 0 || !customerListRef.current) return;
    const el = customerItemRefs.current[customerHighlightIndex];
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [customerHighlightIndex, customerResults.length]);

  // Hacer scroll al ítem resaltado (productos) al navegar con teclado
  useEffect(() => {
    if (filteredProductResults.length === 0 || !productListRef.current) return;
    const el = productItemRefs.current[productHighlightIndex];
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [productHighlightIndex, filteredProductResults.length]);

  // Auth + branch
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) return;
      setBranchId(ub.branch_id);
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (userRow?.organization_id) setOrgId(userRow.organization_id);
      const { data: branch } = await supabase.from("branches").select("name").eq("id", ub.branch_id).single();
      if (branch?.name) setBranchName(branch.name);
    })();
    return () => { cancelled = true; };
  }, []);

  // Cargar lista inicial de clientes (al hacer foco o Enter con campo vacío)
  const fetchInitialCustomers = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("customers")
      .select("id, name, cedula, email, phone")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name")
      .limit(10);
    setCustomerResults((data ?? []) as CustomerOption[]);
  }, [orgId]);

  // Search customers (debounced): con texto busca; sin texto no limpia
  useEffect(() => {
    if (!orgId) return;
    const q = customerSearch.trim();
    if (!q) return;
    const t = setTimeout(async () => {
      const supabase = createClient();
      let req = supabase
        .from("customers")
        .select("id, name, cedula, email, phone")
        .eq("organization_id", orgId)
        .eq("active", true)
        .or(`name.ilike.%${q}%,cedula.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .order("name")
        .limit(10);
      const { data, error: err } = await req;
      if (err) {
        const fallback = await supabase
          .from("customers")
          .select("id, name, cedula, email, phone")
          .eq("organization_id", orgId)
          .or(`name.ilike.%${q}%,cedula.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
          .order("name")
          .limit(10);
        setCustomerResults((fallback.data ?? []) as CustomerOption[]);
        return;
      }
      setCustomerResults((data ?? []) as CustomerOption[]);
    }, 300);
    return () => clearTimeout(t);
  }, [orgId, customerSearch]);

  // Cargar lista inicial de productos con stock en la sucursal (al hacer foco o Enter con campo vacío)
  const fetchInitialProducts = useCallback(async () => {
    if (!orgId || !branchId) return;
    const supabase = createClient();
    const { data: inv } = await supabase
      .from("inventory")
      .select("product_id")
      .eq("branch_id", branchId)
      .gt("quantity", 0);
    const idsWithStock = [...new Set((inv ?? []).map((r) => r.product_id).filter(Boolean))];
    if (idsWithStock.length === 0) {
      setProductResults([]);
      return;
    }
    const { data } = await supabase
      .from("products")
      .select("id, name, sku, base_price, base_cost, apply_iva")
      .eq("organization_id", orgId)
      .in("id", idsWithStock)
      .order("name")
      .limit(5);
    setProductResults((data ?? []) as ProductOption[]);
  }, [orgId, branchId]);

  // Search products (debounced): con texto busca; sin texto no limpia (para no borrar lista al hacer foco)
  useEffect(() => {
    if (!orgId) return;
    const q = productSearch.trim();
    if (!q) return;
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("id, name, sku, base_price, base_cost, apply_iva")
        .eq("organization_id", orgId)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .order("name")
        .limit(5);
      setProductResults((data ?? []) as ProductOption[]);
    }, 300);
    return () => clearTimeout(t);
  }, [orgId, productSearch]);

  const handleProductInputFocus = useCallback(() => {
    if (productSearch.trim() === "") fetchInitialProducts();
  }, [productSearch, fetchInitialProducts]);

  const selectCustomerAt = useCallback((index: number) => {
    const c = customerResults[index];
    if (c) {
      setSelectedCustomer(c);
      setCustomerSearch("");
      setCustomerResults([]);
    }
  }, [customerResults]);

  const handleCustomerInputFocus = useCallback(() => {
    if (!selectedCustomer && customerSearch.trim() === "") fetchInitialCustomers();
  }, [selectedCustomer, customerSearch, fetchInitialCustomers]);

  const handleCustomerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !selectedCustomer && customerSearch.trim() === "" && customerResults.length === 0) {
        e.preventDefault();
        fetchInitialCustomers();
        return;
      }
      if (customerResults.length === 0 || selectedCustomer) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCustomerHighlightIndex((i) => Math.min(i + 1, customerResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCustomerHighlightIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectCustomerAt(customerHighlightIndex);
      }
    },
    [customerResults, customerHighlightIndex, selectedCustomer, selectCustomerAt, customerSearch, fetchInitialCustomers]
  );

  const addToCart = useCallback((p: ProductOption, clearSearch = false, stock?: number) => {
    const price = salePrice(p.base_price, p.apply_iva);
    setCart((prev) => {
      const i = prev.findIndex((x) => x.product_id === p.id);
      if (i >= 0) {
        const next = [...prev];
        const current = next[i];
        const maxQty = stock ?? current.quantity + 1;
        const newQty = Math.min(current.quantity + 1, maxQty);
        next[i] = { ...current, quantity: newQty, reference: current.reference ?? p.sku ?? "", unit_cost: current.unit_cost ?? p.base_cost ?? 0 };
        return next;
      }
      return [...prev, { product_id: p.id, name: p.name, reference: p.sku ?? "", quantity: 1, unit_price: price, min_unit_price: price, unit_cost: p.base_cost ?? 0 }];
    });
    if (clearSearch) {
      setProductSearch("");
      setProductResults([]);
    }
  }, []);

  const handleProductKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && productSearch.trim() === "" && productResults.length === 0) {
        e.preventDefault();
        fetchInitialProducts();
        return;
      }
      if (filteredProductResults.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setProductHighlightIndex((i) => Math.min(i + 1, filteredProductResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setProductHighlightIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const p = filteredProductResults[productHighlightIndex];
        if (p) {
          const stock = stockByProductId[p.id] ?? 0;
          if (stock > 0) addToCart(p, true, stock);
        }
      }
    },
    [productSearch, productResults.length, filteredProductResults, productHighlightIndex, addToCart, stockByProductId, fetchInitialProducts]
  );

  const updateCartQuantity = useCallback((productId: string, delta: number, maxQty?: number) => {
    setCart((prev) => {
      const i = prev.findIndex((x) => x.product_id === productId);
      if (i < 0) return prev;
      const next = [...prev];
      let q = next[i].quantity + delta;
      if (maxQty != null && q > maxQty) q = maxQty;
      q = Math.max(0, q);
      if (q === 0) return next.filter((_, j) => j !== i);
      next[i] = { ...next[i], quantity: q };
      return next;
    });
  }, []);

  // Limpiar mensaje sutil de límite de stock tras 2 s
  useEffect(() => {
    if (!stockLimitProductId) return;
    const t = setTimeout(() => setStockLimitProductId(null), 2000);
    return () => clearTimeout(t);
  }, [stockLimitProductId]);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((x) => x.product_id !== productId));
  }, []);

  const setCartItemDiscount = useCallback((productId: string, type: "percent" | "fixed" | null, value: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product_id !== productId
          ? item
          : type === null
            ? { ...item, discount_type: undefined, discount_value: undefined }
            : { ...item, discount_type: type, discount_value: value }
      )
    );
  }, []);

  const setCartItemPrice = useCallback((productId: string, value: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        const price = Math.max(item.min_unit_price, value);
        return { ...item, unit_price: price };
      })
    );
  }, []);

  const lineTotal = useCallback((item: CartItem) => {
    const base = item.quantity * item.unit_price;
    if (item.discount_type === "percent" && item.discount_value != null) {
      return Math.max(0, Math.round(base * (1 - item.discount_value / 100)));
    }
    if (item.discount_type === "fixed" && item.discount_value != null) {
      return Math.max(0, Math.round(base - item.discount_value));
    }
    return Math.round(base);
  }, []);

  /** Subtotal antes de descuento y monto descontado (0 si no hay descuento) */
  const lineDiscountDetail = useCallback((item: CartItem) => {
    const baseTotal = Math.round(item.quantity * item.unit_price);
    const finalTotal = lineTotal(item);
    const discountAmount = baseTotal - finalTotal;
    return { baseTotal, discountAmount, finalTotal };
  }, [lineTotal]);

  const subtotal = cart.reduce((s, i) => s + lineTotal(i), 0);
  const subtotalBeforeDiscount = cart.reduce((s, i) => s + Math.round(i.quantity * i.unit_price), 0);
  const totalDiscount = subtotalBeforeDiscount - subtotal;
  const totalUnits = cart.reduce((s, i) => s + i.quantity, 0);
  const deliveryFeeAmount = isDelivery && deliveryFee.trim() !== "" ? parseFormattedPrice(deliveryFee) : 0;
  const total = subtotal + deliveryFeeAmount;

  const confirmSale = async () => {
    if (submittingRef.current) return;
    if (!branchId || !userId) {
      setError("Falta sucursal o usuario.");
      return;
    }
    if (!selectedCustomer) {
      setError("Debes seleccionar un cliente.");
      return;
    }
    if (cart.length === 0) {
      setError("Agrega al menos un producto al carrito.");
      return;
    }
    const payPending = isDelivery && paymentPending;
    if (!payPending && paymentMethod === "mixed") {
      const cash = parseFormattedPrice(amountCash);
      const trans = parseFormattedPrice(amountTransfer);
      if (cash + trans !== total) {
        setError("En pago mixto, la suma de efectivo y transferencia debe ser igual al total.");
        return;
      }
    }
    submittingRef.current = true;
    setError(null);
    setSubmitting(true);
    const supabase = createClient();

    try {
      const { count } = await supabase.from("sales").select("*", { count: "exact", head: true }).eq("branch_id", branchId);
      const nextNum = (count ?? 0) + 1;
      const invoiceNumber = nextNum >= 1000 ? String(nextNum) : String(nextNum).padStart(3, "0");

      const payload: Record<string, unknown> = {
        branch_id: branchId,
        user_id: userId,
        customer_id: selectedCustomer.id,
        invoice_number: invoiceNumber,
        total,
        payment_method: paymentMethod,
        status: "completed",
      };
      if (paymentMethod === "cash" && amountReceived.trim() !== "") {
        payload.amount_received = parseFormattedPrice(amountReceived) || null;
      }
      if (paymentMethod === "mixed") {
        const cash = parseFormattedPrice(amountCash);
        const trans = parseFormattedPrice(amountTransfer);
        if (cash > 0 || trans > 0) {
          payload.amount_cash = cash || null;
          payload.amount_transfer = trans || null;
        }
      }
      if (isDelivery) {
        payload.is_delivery = true;
        if (selectedDeliveryAddressId) payload.delivery_address_id = selectedDeliveryAddressId;
        if (deliveryFee.trim() !== "") payload.delivery_fee = parseFormattedPrice(deliveryFee) || null;
        if (selectedDeliveryPersonId) payload.delivery_person_id = selectedDeliveryPersonId;
        payload.delivery_paid = false; // Por defecto no pagado
        if (paymentPending) payload.payment_pending = true;
      }
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert(payload)
        .select("id")
        .single();

      if (saleError) throw saleError;
      if (!sale?.id) throw new Error("No se creó la venta");

      const items = cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_type === "percent" ? (item.discount_value ?? 0) : 0,
        discount_amount: item.discount_type === "fixed" ? (item.discount_value ?? 0) : 0,
      }));
      const { error: itemsError } = await supabase.from("sale_items").insert(items);
      if (itemsError) throw itemsError;

      router.push(`/ventas/${sale.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear la venta");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!branchId || !userId) {
    return (
      <div className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">Nueva venta</h1>
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Cargando sucursal…</p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Ventas", href: "/ventas" }, { label: "Nueva venta" }]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">Nueva venta</h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Selecciona el cliente, agrega productos al carrito y elige el método de pago.
            </p>
          </div>
          <Link
            href="/ventas"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Volver a ventas"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        {/* Columna izquierda: Productos + Carrito (productos seleccionados) */}
        <div className="space-y-4">
          {/* Productos */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Productos</p>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onFocus={handleProductInputFocus}
              onKeyDown={handleProductKeyDown}
              placeholder="Buscar por nombre o código"
              className="mt-3 h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              aria-autocomplete="list"
              aria-expanded={filteredProductResults.length > 0}
              aria-controls="product-results-list"
              aria-activedescendant={filteredProductResults.length > 0 ? `product-option-${productHighlightIndex}` : undefined}
            />
            <div className="mt-4 space-y-2">
              {productResults.length === 0 && productSearch.trim() && (
                <p className="mt-4 text-[13px] text-slate-500 dark:text-slate-400">Ningún producto coincide con la búsqueda.</p>
              )}
              {productResults.length > 0 && filteredProductResults.length === 0 && (
                <p className="mt-4 text-[13px] text-slate-500 dark:text-slate-400">Todos los resultados ya están en el carrito.</p>
              )}
              {filteredProductResults.length > 0 && (
                <ul
                  ref={productListRef}
                  id="product-results-list"
                  role="listbox"
                  className="mt-2 max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:hover:bg-slate-400 dark:[&::-webkit-scrollbar-track]:bg-slate-800 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-slate-500"
                >
                  {filteredProductResults.map((p, index) => {
                    const stock = stockByProductId[p.id] ?? 0;
                    const noStock = stock === 0;
                    return (
                      <li key={p.id} role="option" aria-selected={index === productHighlightIndex} aria-disabled={noStock}>
                        <button
                          ref={(el) => { productItemRefs.current[index] = el; }}
                          type="button"
                          id={`product-option-${index}`}
                          disabled={noStock}
                          onClick={() => {
                            if (stock > 0) addToCart(p, true, stock);
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[14px] ${
                            noStock
                              ? "cursor-not-allowed opacity-60 text-slate-500 dark:text-slate-500"
                              : "cursor-pointer text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                          } ${index === productHighlightIndex && !noStock ? "bg-slate-100 dark:bg-slate-700" : ""}`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className={`font-bold ${noStock ? "text-slate-500 dark:text-slate-500" : "text-slate-900 dark:text-slate-50"}`}>{p.name}</span>
                            <span className="font-normal text-slate-600 dark:text-slate-400">
                              {" · "}
                              {p.sku || "—"} · Stock: {stock} uds
                              {noStock && " (sin stock)"}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Productos seleccionados (carrito) */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Productos seleccionados
              {cart.length > 0 && (
                <span className="ml-2 rounded-full bg-ov-pink/20 px-2 py-0.5 text-[12px] font-semibold text-ov-pink">
                  {cart.length} {cart.length === 1 ? "producto" : "productos"}
                </span>
              )}
            </p>

            {cart.length === 0 ? (
              <p className="mt-4 text-[14px] text-slate-500 dark:text-slate-400">Agrega productos desde la búsqueda.</p>
            ) : (
              <div className="mt-3 space-y-2 text-[14px]">
                  {[...cart].reverse().map((item) => (
                    <div
                      key={item.product_id}
                      className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-slate-50">
                            {item.name} × <span className="text-base font-bold">{item.quantity}</span>
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                            {item.reference ? `Ref: ${item.reference}` : "Sin referencia"}
                            {" · "}
                            Stock: {stockByProductId[item.product_id] ?? 0} uds
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {(() => {
                            const { baseTotal, discountAmount, finalTotal } = lineDiscountDetail(item);
                            const hasDiscount = discountAmount > 0;
                            const minCostTotal = item.quantity * (item.unit_cost ?? 0);
                            const belowCost = (item.unit_cost ?? 0) > 0 && finalTotal < minCostTotal;
                            return (
                              <>
                                {hasDiscount && (
                                  <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                    <span className="line-through">$ {formatMoney(baseTotal)}</span>
                                    {" · "}
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {item.discount_type === "percent"
                                        ? `${item.discount_value}% desc.: −$ ${formatMoney(discountAmount)}`
                                        : `Desc.: −$ ${formatMoney(discountAmount)}`}
                                    </span>
                                  </p>
                                )}
                                <p className="text-base font-bold text-slate-900 dark:text-slate-50">
                                  $ {formatMoney(finalTotal)}
                                </p>
                                {belowCost && (
                                  <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                    Por debajo del costo de compra ($ {formatMoney(minCostTotal)})
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Precio:</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="h-8 w-28 rounded border border-slate-300 bg-white px-2 text-[13px] font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            value={formatMoney(item.unit_price)}
                            onChange={(e) => {
                              const v = parseFormattedPrice(e.target.value);
                              if (e.target.value.trim() === "") {
                                setCartItemPrice(item.product_id, item.min_unit_price);
                                return;
                              }
                              setCartItemPrice(item.product_id, Math.max(item.min_unit_price, v));
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Descuento:</span>
                          <div className="flex items-center gap-1 rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => setCartItemDiscount(item.product_id, "percent", item.discount_type === "percent" ? (item.discount_value ?? 0) : 0)}
                              className={`h-8 px-2.5 text-[12px] font-bold ${item.discount_type === "percent" ? "bg-ov-pink/20 text-ov-pink dark:bg-ov-pink/30" : "text-slate-500 dark:text-slate-400"}`}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() => setCartItemDiscount(item.product_id, "fixed", item.discount_type === "fixed" ? (item.discount_value ?? 0) : 0)}
                              className={`h-8 px-2.5 text-[12px] font-bold ${item.discount_type === "fixed" ? "bg-ov-pink/20 text-ov-pink dark:bg-ov-pink/30" : "text-slate-500 dark:text-slate-400"}`}
                            >
                              $
                            </button>
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={item.discount_type !== "fixed" ? "%" : "$"}
                            className="h-8 w-24 rounded border border-slate-300 bg-white px-2 text-[13px] font-medium text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-600/50"
                            value={
                              item.discount_type != null && item.discount_value != null
                                ? item.discount_type === "fixed"
                                  ? formatMoney(item.discount_value)
                                  : String(item.discount_value)
                                : ""
                            }
                            onChange={(e) => {
                              const type = item.discount_type ?? "percent";
                              if (type === "fixed") {
                                const v = parseFormattedPrice(e.target.value);
                                if (e.target.value.trim() === "") {
                                  setCartItemDiscount(item.product_id, null, 0);
                                  return;
                                }
                                if (v >= 0) setCartItemDiscount(item.product_id, "fixed", v);
                              } else {
                                const raw = e.target.value.replace(/\D/g, "");
                                if (raw === "") {
                                  setCartItemDiscount(item.product_id, null, 0);
                                  return;
                                }
                                const v = parseInt(raw, 10);
                                if (v >= 0 && v <= 100) setCartItemDiscount(item.product_id, "percent", v);
                              }
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product_id, -1)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-200/80 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                          aria-label="Menos"
                        >
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-base font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const stock = stockByProductId[item.product_id] ?? 0;
                            if (item.quantity >= stock) {
                              setStockLimitProductId(item.product_id);
                              return;
                            }
                            updateCartQuantity(item.product_id, 1, stock);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-200/80 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                          aria-label="Más"
                        >
                          +
                        </button>
                        {stockLimitProductId === item.product_id && (
                          <span className="text-[11px] text-amber-600/90 dark:text-amber-400/80" role="status">
                            No hay más stock
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product_id)}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                          aria-label="Quitar producto"
                        >
                          <svg className="h-4 w-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: Cliente + Método de pago + Resumen */}
        <div className="space-y-4">
          {/* Cliente (obligatorio) */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Cliente <span className="text-ov-pink">*</span>
            </p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={selectedCustomer ? selectedCustomer.name : customerSearch}
                  onChange={(e) => {
                    setSelectedCustomer(null);
                    setCustomerSearch(e.target.value);
                  }}
                  onFocus={handleCustomerInputFocus}
                  onKeyDown={handleCustomerKeyDown}
                  placeholder="Buscar por nombre, cédula, email o teléfono"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  aria-autocomplete="list"
                  aria-expanded={customerResults.length > 0 && !selectedCustomer}
                  aria-controls="customer-results-list"
                  aria-activedescendant={customerResults.length > 0 ? `customer-option-${customerHighlightIndex}` : undefined}
                />
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-medium text-ov-pink hover:underline"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <Link
                href="/clientes/nueva"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo cliente
              </Link>
            </div>
            {customerResults.length > 0 && !selectedCustomer && (
              <ul
                ref={customerListRef}
                id="customer-results-list"
                role="listbox"
                className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:hover:bg-slate-400 dark:[&::-webkit-scrollbar-track]:bg-slate-800 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-slate-500"
              >
                {customerResults.map((c, index) => (
                  <li key={c.id} role="option" aria-selected={index === customerHighlightIndex}>
                    <button
                      ref={(el) => { customerItemRefs.current[index] = el; }}
                      type="button"
                      id={`customer-option-${index}`}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch("");
                        setCustomerResults([]);
                      }}
                      className={`w-full px-4 py-2 text-left text-[14px] text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 ${
                        index === customerHighlightIndex ? "bg-slate-100 dark:bg-slate-700" : ""
                      }`}
                    >
                      <span className="font-bold">{c.name}</span>
                      {(c.cedula ?? c.phone) && (
                        <span className="font-normal text-slate-600 dark:text-slate-400">
                          {" · "}
                          {c.cedula ?? c.phone}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Venta a domicilio */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <label className={`flex items-center gap-2 ${selectedCustomer ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
              <input
                type="checkbox"
                checked={isDelivery}
                disabled={!selectedCustomer}
                onChange={(e) => { 
                  setIsDelivery(e.target.checked); 
                  if (!e.target.checked) {
                    setPaymentPending(false);
                  } else {
                    // Si se activa delivery y hay 1 o 2 domiciliarios, seleccionar automáticamente el primero
                    if (deliveryPersons.length > 0 && deliveryPersons.length <= 2 && !selectedDeliveryPersonId) {
                      setSelectedDeliveryPersonId(deliveryPersons[0].id);
                    }
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <svg className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h.01" />
              </svg>
              <span className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Venta a domicilio</span>
            </label>
            {!selectedCustomer && (
              <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                Selecciona un cliente para habilitar la venta a domicilio
              </p>
            )}
            {isDelivery && selectedCustomer && (
                <div className="mt-3 space-y-3">
                  {customerAddresses.length === 0 ? (
                    <p className="text-[13px] text-slate-500 dark:text-slate-400">Este cliente no tiene direcciones registradas.</p>
                  ) : (
                    <div>
                      <p className="mb-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">Dirección de entrega</p>
                      <ul className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-800/30">
                        {customerAddresses.map((addr) => (
                          <li key={addr.id}>
                            <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50">
                              <input
                                type="radio"
                                name="delivery-address"
                                checked={selectedDeliveryAddressId === addr.id}
                                onChange={() => setSelectedDeliveryAddressId(addr.id)}
                                className="mt-1.5 h-4 w-4 border-slate-300 text-ov-pink focus:ring-ov-pink/30"
                              />
                              <div className="min-w-0 flex-1 text-[13px]">
                                <span className="font-medium text-slate-800 dark:text-slate-100">{addr.label}</span>
                                <p className="text-slate-600 dark:text-slate-400">{addr.address}</p>
                                {addr.reference_point && (
                                  <p className="text-[12px] text-slate-500 dark:text-slate-500">Ref: {addr.reference_point}</p>
                                )}
                              </div>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {deliveryPersons.length > 0 && (
                    <div>
                      <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                        Domiciliario
                        {deliveryPersons.length <= 2 && selectedDeliveryPersonId && (
                          <span className="ml-2 text-[11px] font-normal text-slate-400">
                            ({deliveryPersons.find(p => p.id === selectedDeliveryPersonId)?.code})
                          </span>
                        )}
                      </label>
                      {deliveryPersons.length > 2 ? (
                        <select
                          value={selectedDeliveryPersonId || ""}
                          onChange={(e) => setSelectedDeliveryPersonId(e.target.value || null)}
                          className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[14px] font-medium text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-600/50"
                        >
                          <option value="">Seleccionar domiciliario</option>
                          {deliveryPersons.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.code} - {person.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[14px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {selectedDeliveryPersonId 
                            ? `${deliveryPersons.find(p => p.id === selectedDeliveryPersonId)?.code} - ${deliveryPersons.find(p => p.id === selectedDeliveryPersonId)?.name}`
                            : "Sin domiciliarios disponibles"}
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      Valor del domicilio <span className="font-normal text-slate-400">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="mt-1 h-9 w-full max-w-[140px] rounded-md border border-slate-300 bg-white px-3 text-[14px] font-medium text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-600/50"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."))}
                    />
                  </div>
                  <label className="mt-3 flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={paymentPending}
                      onChange={(e) => setPaymentPending(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30"
                    />
                    <span className="text-[12px] text-slate-600 dark:text-slate-300">
                      Pago pendiente (cobro en entrega o transferencia por confirmar)
                    </span>
                  </label>
                </div>
              )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Método de pago</p>
            <div className="mt-3 flex gap-1 rounded-lg bg-slate-100/80 p-1 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => { setPaymentMethod("cash"); setAmountCash(""); setAmountTransfer(""); }}
                className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors ${
                  paymentMethod === "cash"
                    ? "bg-white text-ov-pink shadow-sm dark:bg-slate-700 dark:text-ov-pink"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod("transfer"); setAmountReceived(""); setAmountCash(""); setAmountTransfer(""); }}
                className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors ${
                  paymentMethod === "transfer"
                    ? "bg-white text-ov-pink shadow-sm dark:bg-slate-700 dark:text-ov-pink"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Transferencia
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod("mixed"); setAmountReceived(""); }}
                className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors ${
                  paymentMethod === "mixed"
                    ? "bg-white text-ov-pink shadow-sm dark:bg-slate-700 dark:text-ov-pink"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                Mixto
              </button>
            </div>
            {paymentMethod === "cash" && (
              <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700/80 dark:bg-slate-800/40">
                <div className="grid grid-cols-2 items-start gap-x-8 gap-y-0">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Cuánto me dieron</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[14px] font-medium leading-9 text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-600/50"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Cuánto regreso</label>
                    <div className="flex h-9 items-center text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                      {amountReceived.trim() !== "" ? (
                        <span className="text-emerald-600 dark:text-emerald-400">$ {formatMoney(Math.max(0, parseFormattedPrice(amountReceived) - total))}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {paymentMethod === "mixed" && (
              <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Total a cobrar: $ {formatMoney(total)}</p>
                <div className="flex flex-wrap gap-4 sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400">Cuánto a efectivo</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-3 text-[14px] font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      value={amountCash}
                      onChange={(e) => setAmountCash(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."))}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400">Cuánto a transferencia</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-3 text-[14px] font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      value={amountTransfer}
                      onChange={(e) => setAmountTransfer(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."))}
                    />
                  </div>
                </div>
                {(() => {
                  const cash = parseFormattedPrice(amountCash);
                  const trans = parseFormattedPrice(amountTransfer);
                  const sum = cash + trans;
                  if (sum > 0 && sum !== total) {
                    const missing = total - sum;
                    return (
                      <p className="text-[12px] font-medium text-amber-600 dark:text-amber-400">
                        {missing > 0 ? (
                          <>Falta: <span className="font-bold">$ {formatMoney(missing)}</span> para completar el total.</>
                        ) : (
                          <>La suma supera el total por <span className="font-bold">$ {formatMoney(-missing)}</span>.</>
                        )}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>

          {/* Resumen */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Resumen</p>
            <div className="mt-3 space-y-2">
              {cart.length > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Referencias</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">
                    {cart.length} {cart.length === 1 ? "producto" : "productos"} · {totalUnits} {totalUnits === 1 ? "unidad" : "unidades"}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                <span className="font-medium text-slate-900 dark:text-slate-50">$ {formatMoney(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Descuentos</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">−$ {formatMoney(totalDiscount)}</span>
                </div>
              )}
              {isDelivery && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Domicilio</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">
                    {deliveryFeeAmount > 0 ? `$ ${formatMoney(deliveryFeeAmount)}` : "—"}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total</span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-50">$ {formatMoney(total)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={confirmSale}
              disabled={
                !selectedCustomer ||
                cart.length === 0 ||
                submitting ||
                (paymentMethod === "mixed" && parseFormattedPrice(amountCash) + parseFormattedPrice(amountTransfer) !== total)
              }
              className="mt-4 w-full rounded-lg bg-ov-pink py-3 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:opacity-50 disabled:pointer-events-none dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              aria-busy={submitting}
              aria-disabled={submitting}
            >
              {submitting ? "Guardando…" : "Confirmar venta"}
            </button>
            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
