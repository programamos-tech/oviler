"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/app/components/Breadcrumb";
import DatePickerCard from "@/app/components/DatePickerCard";
import { workspaceFormInputMdClass } from "@/lib/workspace-field-classes";
import { logActivity } from "@/lib/activities";

const IVA_RATE = 0.19;

type CustomerOption = {
  id: string;
  name: string;
  cedula: string | null;
  email: string | null;
  phone: string | null;
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
  reference: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function parseFormattedPrice(str: string): number {
  const digits = str.replace(/\D/g, "");
  return digits === "" ? 0 : parseInt(digits, 10);
}

function salePrice(basePrice: number, applyIva: boolean): number {
  const base = Number(basePrice) || 0;
  return applyIva ? base + Math.round(base * IVA_RATE) : base;
}

function formatDateEs(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return dateToIsoLocal(d);
}

function parseIsoLocalDate(iso: string): Date | null {
  const parts = iso.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function dateToIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function NuevoCreditoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preCliente = searchParams.get("cliente") ?? "";

  const [branchId, setBranchId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerHighlightIndex, setCustomerHighlightIndex] = useState(0);
  const customerListRef = useRef<HTMLUListElement>(null);
  const customerItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productHighlightIndex, setProductHighlightIndex] = useState(0);
  const [stockByProductId, setStockByProductId] = useState<Record<string, number>>({});
  const productListRef = useRef<HTMLUListElement>(null);
  const productItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [stockLimitProductId, setStockLimitProductId] = useState<string | null>(null);
  const [cashClosedToday, setCashClosedToday] = useState(false);

  const [dueDate, setDueDate] = useState("");
  const [duePreset, setDuePreset] = useState<7 | 30 | 90 | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const cardClass =
    "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800";
  const cardClassDue =
    "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800/85";
  const inputClass = workspaceFormInputMdClass;
  const requiredMarkClass = "text-[color:var(--shell-sidebar)] dark:text-zinc-300";
  const softListClass =
    "mt-2 max-h-[28rem] overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:hover:bg-slate-400 dark:[&::-webkit-scrollbar-track]:bg-slate-800 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-slate-500";

  const filteredProductResults = useMemo(() => {
    const notInCart = productResults.filter((p) => !cart.some((c) => c.product_id === p.id));
    const hasSearch = productSearch.trim() !== "";
    if (hasSearch) return notInCart;
    return notInCart.filter((p) => (stockByProductId[p.id] ?? 0) > 0);
  }, [productResults, cart, productSearch, stockByProductId]);

  useEffect(() => {
    setCustomerHighlightIndex(0);
  }, [customerResults]);

  useEffect(() => {
    setProductHighlightIndex((i) => Math.min(i, Math.max(0, filteredProductResults.length - 1)));
  }, [filteredProductResults.length]);

  useEffect(() => {
    if (customerResults.length === 0 || !customerListRef.current) return;
    const el = customerItemRefs.current[customerHighlightIndex];
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [customerHighlightIndex, customerResults.length]);

  useEffect(() => {
    if (filteredProductResults.length === 0 || !productListRef.current) return;
    const el = productItemRefs.current[productHighlightIndex];
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [productHighlightIndex, filteredProductResults.length]);

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
    return () => {
      cancelled = true;
    };
  }, [branchId, productResults, cart]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);
      const { data: ub } = await supabase
        .from("user_branches")
        .select("branch_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setBranchId(ub?.branch_id ?? null);
      const { data: me } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (cancelled) return;
      setOrgId(me?.organization_id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!branchId) {
      setCashClosedToday(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const today = `${y}-${m}-${d}`;
      const { data } = await supabase
        .from("cash_closings")
        .select("id")
        .eq("branch_id", branchId)
        .eq("closing_date", today)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setCashClosedToday(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    if (!preCliente || !orgId) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("customers")
        .select("id, name, cedula, email, phone")
        .eq("id", preCliente)
        .eq("organization_id", orgId)
        .eq("active", true)
        .maybeSingle();
      if (cancelled || !data) return;
      setSelectedCustomer(data as CustomerOption);
      setCustomerSearch("");
      setCustomerResults([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [preCliente, orgId]);

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
        next[i] = {
          ...current,
          quantity: newQty,
          reference: current.reference ?? p.sku ?? "",
          unit_cost: current.unit_cost ?? p.base_cost ?? 0,
        };
        return next;
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          reference: p.sku ?? "",
          quantity: 1,
          unit_price: price,
          unit_cost: p.base_cost ?? 0,
        },
      ];
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
    [
      productSearch,
      productResults.length,
      filteredProductResults,
      productHighlightIndex,
      addToCart,
      stockByProductId,
      fetchInitialProducts,
    ]
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

  const floorUnitPrice = useCallback((item: CartItem) => (item.unit_cost > 0 ? item.unit_cost : 0), []);

  const setCartItemPrice = useCallback((productId: string, value: number) => {
    setCart((prev) => prev.map((item) => (item.product_id === productId ? { ...item, unit_price: value } : item)));
  }, []);

  const clampCartItemUnitPriceToCost = useCallback((productId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        const floor = item.unit_cost > 0 ? item.unit_cost : 0;
        return { ...item, unit_price: Math.max(floor, item.unit_price) };
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

  const lineDiscountDetail = useCallback(
    (item: CartItem) => {
      const baseTotal = Math.round(item.quantity * item.unit_price);
      const finalTotal = lineTotal(item);
      const discountAmount = baseTotal - finalTotal;
      return { baseTotal, discountAmount, finalTotal };
    },
    [lineTotal]
  );

  const subtotal = cart.reduce((s, i) => s + lineTotal(i), 0);
  const subtotalBeforeDiscount = cart.reduce((s, i) => s + Math.round(i.quantity * i.unit_price), 0);
  const totalDiscount = subtotalBeforeDiscount - subtotal;
  const totalUnits = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = subtotal;

  function applyDuePreset(days: 7 | 30 | 90) {
    setDueDate(addDaysIso(days));
    setDuePreset(days);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (savingRef.current) return;
    setError(null);
    if (!branchId || !orgId || !userId || !selectedCustomer) {
      setError("Selecciona un cliente.");
      return;
    }
    if (cart.length === 0) {
      setError("Agrega al menos un producto al carrito.");
      return;
    }
    if (!dueDate) {
      setError("Indica la fecha de vencimiento.");
      return;
    }
    if (cashClosedToday) {
      setError("Caja cerrada hoy: no se pueden registrar ventas ni créditos en esta sucursal hasta el próximo día.");
      return;
    }

    const cartClamped = cart.map((item) => {
      const floor = item.unit_cost > 0 ? item.unit_cost : 0;
      return { ...item, unit_price: Math.max(floor, item.unit_price) };
    });
    const totalClamped = cartClamped.reduce((s, i) => s + lineTotal(i), 0);
    if (totalClamped <= 0) {
      setError("El total debe ser mayor a cero.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sesión expirada.");
        return;
      }

      const { count } = await supabase.from("sales").select("*", { count: "exact", head: true }).eq("branch_id", branchId);
      const nextNum = (count ?? 0) + 1;
      const invoiceNumber = nextNum >= 1000 ? String(nextNum) : String(nextNum).padStart(3, "0");

      const salePayload: Record<string, unknown> = {
        branch_id: branchId,
        user_id: userId,
        customer_id: selectedCustomer.id,
        invoice_number: invoiceNumber,
        total: totalClamped,
        payment_method: "transfer",
        status: "pending",
        payment_pending: true,
      };

      const { data: sale, error: saleError } = await supabase.from("sales").insert(salePayload).select("id").single();
      if (saleError) throw saleError;
      if (!sale?.id) throw new Error("No se pudo crear la factura.");

      const items = cartClamped.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_type === "percent" ? (item.discount_value ?? 0) : 0,
        discount_amount: item.discount_type === "fixed" ? (item.discount_value ?? 0) : 0,
      }));
      const { error: itemsError } = await supabase.from("sale_items").insert(items);
      if (itemsError) throw itemsError;

      const { error: completeError } = await supabase
        .from("sales")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", sale.id);
      if (completeError) throw completeError;

      const { data: creditRow, error: creditErr } = await supabase
        .from("customer_credits")
        .insert({
          organization_id: orgId,
          branch_id: branchId,
          customer_id: selectedCustomer.id,
          sale_id: sale.id,
          total_amount: totalClamped,
          due_date: dueDate,
          notes: notes.trim() || null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (creditErr) throw creditErr;
      if (!creditRow?.id) throw new Error("No se pudo crear el crédito.");

      try {
        await logActivity(supabase, {
          organizationId: orgId,
          branchId,
          userId,
          action: "sale_created",
          entityType: "sale",
          entityId: sale.id,
          summary: `Factura a crédito ${invoiceNumber}${selectedCustomer.name ? ` — ${selectedCustomer.name}` : ""}`,
          metadata: {
            invoice_number: invoiceNumber,
            total: totalClamped,
            customer_name: selectedCustomer.name ?? null,
            credit: true,
            items: cartClamped.map((i) => ({ name: i.name, quantity: i.quantity, reference: i.reference || null })),
          },
        });
      } catch {
        // no bloquear
      }

      router.push(`/creditos/${creditRow.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el crédito.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!branchId || !orgId || !userId) {
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
        <header className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">Nuevo crédito</h1>
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Cargando sucursal…</p>
        </header>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb items={[{ label: "Créditos", href: "/creditos" }, { label: "Nuevo crédito" }]} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">Nuevo crédito</h1>
            <p className="mt-1 text-[13px] font-medium leading-snug text-pretty text-slate-500 dark:text-slate-400">
              Arma la factura con productos como en ventas: el cobro queda pendiente y el cliente paga después según el vencimiento.
            </p>
          </div>
          <Link
            href="/creditos"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a créditos"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
          {cashClosedToday && (
            <div className="lg:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
              Caja cerrada hoy: no se pueden registrar créditos en esta sucursal hasta el próximo día.
            </div>
          )}
          <div className="space-y-4">
            <div className={cardClass}>
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Productos</p>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onFocus={handleProductInputFocus}
                onKeyDown={handleProductKeyDown}
                placeholder="Buscar por nombre o código"
                className={`mt-3 ${inputClass}`}
                aria-autocomplete="list"
                aria-expanded={filteredProductResults.length > 0}
                aria-controls="credit-product-results-list"
                aria-activedescendant={
                  filteredProductResults.length > 0 ? `credit-product-option-${productHighlightIndex}` : undefined
                }
              />
              <div className="mt-4 space-y-2">
                {productResults.length === 0 && productSearch.trim() && (
                  <p className="mt-4 text-[13px] text-slate-500 dark:text-slate-400">Ningún producto coincide con la búsqueda.</p>
                )}
                {productResults.length > 0 && filteredProductResults.length === 0 && (
                  <p className="mt-4 text-[13px] text-slate-500 dark:text-slate-400">Todos los resultados ya están en el carrito.</p>
                )}
                {filteredProductResults.length > 0 && (
                  <ul ref={productListRef} id="credit-product-results-list" role="listbox" className={softListClass}>
                    {filteredProductResults.map((p, index) => {
                      const stock = stockByProductId[p.id] ?? 0;
                      const noStock = stock === 0;
                      return (
                        <li key={p.id} role="option" aria-selected={index === productHighlightIndex} aria-disabled={noStock}>
                          <button
                            ref={(el) => {
                              productItemRefs.current[index] = el;
                            }}
                            type="button"
                            id={`credit-product-option-${index}`}
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
                              <span className={`font-bold ${noStock ? "text-slate-500 dark:text-slate-500" : "text-slate-900 dark:text-slate-50"}`}>
                                {p.name}
                              </span>
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

            <div className={cardClass}>
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Productos seleccionados
                {cart.length > 0 && (
                  <span className="ml-2 rounded-full bg-slate-200/90 px-2 py-0.5 text-[12px] font-semibold text-[color:var(--shell-sidebar)] dark:bg-white/10 dark:text-zinc-300">
                    {cart.length} {cart.length === 1 ? "producto" : "productos"}
                  </span>
                )}
              </p>

              {cart.length === 0 ? (
                <p className="mt-4 text-[14px] text-slate-500 dark:text-slate-400">Agrega productos desde la búsqueda.</p>
              ) : (
                <div className="mt-3 space-y-2 text-[14px]">
                  {[...cart].reverse().map((item) => (
                    <div key={item.product_id} className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
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
                                <p className="text-base font-bold text-slate-900 dark:text-slate-50">$ {formatMoney(finalTotal)}</p>
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
                                setCartItemPrice(item.product_id, floorUnitPrice(item));
                                return;
                              }
                              setCartItemPrice(item.product_id, v);
                            }}
                            onBlur={() => clampCartItemUnitPriceToCost(item.product_id)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Descuento:</span>
                          <div className="flex items-center gap-1 rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                setCartItemDiscount(
                                  item.product_id,
                                  "percent",
                                  item.discount_type === "percent" ? (item.discount_value ?? 0) : 0
                                )
                              }
                              className={`h-8 px-2.5 text-[12px] font-bold ${
                                item.discount_type === "percent"
                                  ? "bg-slate-200/90 text-[color:var(--shell-sidebar)] dark:bg-white/10 dark:text-zinc-300"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCartItemDiscount(
                                  item.product_id,
                                  "fixed",
                                  item.discount_type === "fixed" ? (item.discount_value ?? 0) : 0
                                )
                              }
                              className={`h-8 px-2.5 text-[12px] font-bold ${
                                item.discount_type === "fixed"
                                  ? "bg-slate-200/90 text-[color:var(--shell-sidebar)] dark:bg-white/10 dark:text-zinc-300"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
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
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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

          <div className="space-y-4">
            <div className={cardClass}>
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Cliente <span className={requiredMarkClass}>*</span>
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
                    className={inputClass}
                    aria-autocomplete="list"
                    aria-expanded={customerResults.length > 0 && !selectedCustomer}
                    aria-controls="credit-customer-results"
                    aria-activedescendant={
                      customerResults.length > 0 ? `credit-customer-option-${customerHighlightIndex}` : undefined
                    }
                  />
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <Link
                  href="/clientes/nueva"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
                  id="credit-customer-results"
                  role="listbox"
                  className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:hover:bg-slate-400 dark:[&::-webkit-scrollbar-track]:bg-slate-800 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-slate-500"
                >
                  {customerResults.map((c, index) => (
                    <li key={c.id} role="option" aria-selected={index === customerHighlightIndex}>
                      <button
                        ref={(el) => {
                          customerItemRefs.current[index] = el;
                        }}
                        type="button"
                        id={`credit-customer-option-${index}`}
                        onClick={() => selectCustomerAt(index)}
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

            <div className={cardClass}>
              <label className="flex cursor-not-allowed items-center gap-2 opacity-60">
                <input type="checkbox" disabled className="h-4 w-4 rounded border-slate-300" />
                <svg className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h.01"
                  />
                </svg>
                <span className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Envío</span>
              </label>
              <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">El envío no aplica al registrar un crédito en tienda.</p>
            </div>

            <div className={cardClassDue}>
              <p className="text-[13px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                Fecha de vencimiento <span className={requiredMarkClass}>*</span>
              </p>
              <div
                className="mt-3 flex flex-wrap items-stretch gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900/85 dark:ring-1 dark:ring-zinc-800/90"
                role="group"
                aria-label="Atajos de días o elegir fecha en calendario"
              >
                {([7, 30, 90] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => applyDuePreset(days)}
                    className={`flex h-10 min-w-0 flex-1 basis-[4.75rem] items-center justify-center rounded-lg px-2 text-[13px] font-medium transition-colors ${
                      duePreset === days
                        ? "bg-white text-[color:var(--shell-sidebar)] shadow-sm dark:bg-zinc-800 dark:text-zinc-300"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    {days} días
                  </button>
                ))}
                <div className="flex min-h-10 min-w-0 flex-1 basis-[10.5rem] items-stretch">
                  <DatePickerCard
                    id="credit-due-date"
                    value={dueDate ? parseIsoLocalDate(dueDate) : null}
                    onChange={(d) => {
                      setDuePreset(null);
                      setDueDate(d ? dateToIsoLocal(d) : "");
                    }}
                    placeholder="dd/mm/aaaa"
                    allowClear
                    size="md"
                    fullWidth
                    triggerTone="zinc"
                    aria-label="Fecha de vencimiento del crédito"
                  />
                </div>
              </div>
            </div>

            <div className={`${cardClassDue} w-full min-w-0 py-3`}>
              <p className="text-[12px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                Notas del crédito (opcional)
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones internas sobre el crédito…"
                className="mt-1.5 w-full min-h-0 resize-y rounded-lg border border-zinc-300/90 bg-white px-2.5 py-1.5 text-[13px] leading-snug text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600/30"
              />
            </div>

            <div className={cardClass}>
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Resumen</p>
              {error && (
                <div
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
                  role="alert"
                >
                  {error}
                </div>
              )}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Cliente</span>
                  <span className="max-w-[60%] truncate text-right font-medium text-slate-900 dark:text-slate-50">
                    {selectedCustomer?.name ?? "—"}
                  </span>
                </div>
                {cart.length > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-400">Líneas</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {cart.length} {cart.length === 1 ? "producto" : "productos"} · {totalUnits} {totalUnits === 1 ? "unidad" : "unidades"}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">$ {formatMoney(subtotalBeforeDiscount)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-400">Descuentos</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">−$ {formatMoney(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Vence</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{dueDate ? formatDateEs(dueDate) : "—"}</span>
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-500">Notas</p>
                  <p className="mt-1 max-h-20 overflow-y-auto break-words text-[13px] leading-snug text-slate-800 dark:text-zinc-200">
                    {notes.trim() ? notes.trim() : "—"}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total a crédito</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-50">
                    {cartTotal > 0 ? `$ ${formatMoney(cartTotal)}` : "$ 0"}
                  </span>
                </div>
              </div>
              <button
                type="submit"
                disabled={
                  !selectedCustomer || cart.length === 0 || cartTotal <= 0 || !dueDate || saving || cashClosedToday
                }
                className="mt-4 w-full rounded-xl bg-[color:var(--shell-sidebar)] py-3 text-[15px] font-bold text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:pointer-events-none disabled:opacity-50"
                aria-busy={saving}
              >
                {saving ? "Guardando…" : "Confirmar crédito"}
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

export default function NuevoCreditoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 dark:text-slate-400">Cargando…</div>}>
      <NuevoCreditoForm />
    </Suspense>
  );
}
