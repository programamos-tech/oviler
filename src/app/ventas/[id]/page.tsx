"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activities";
import { MdLocalShipping, MdStore, MdCancel, MdCheck, MdSchedule, MdPerson, MdBusiness, MdBadge } from "react-icons/md";
import Breadcrumb from "@/app/components/Breadcrumb";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";
import { getCopy, getStatusLabel, getStatusClass, type SalesMode } from "../sales-mode";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function displayInvoiceNumber(invoiceNumber: string) {
  if (!invoiceNumber) return invoiceNumber;
  const sin = invoiceNumber.replace(/^FV-?\s*/i, "").trim();
  return sin || invoiceNumber;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  mixed: "Mixto",
};

const PAYMENT_COLOR_CLASS: Record<string, string> = {
  cash: "font-semibold text-emerald-600 dark:text-emerald-400",
  transfer: "font-semibold text-blue-600 dark:text-blue-400",
  mixed: "font-semibold text-violet-600 dark:text-violet-400",
};

/** Opciones de estado con envío: flujo completo con alistamiento */
const ORDER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Creado" },
  { value: "preparing", label: "En alistamiento" },
  { value: "packing", label: "Alistado" },
  { value: "on_the_way", label: "Despachado" },
  { value: "completed", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
];

/** Venta sin envío: solo Pendiente → Completada / Anulada (sin alistamiento) */
const STORE_SALE_STATUS_VALUES = ["pending", "completed", "cancelled"] as const;

type SaleDetail = {
  id: string;
  branch_id: string;
  user_id: string;
  customer_id: string | null;
  invoice_number: string;
  total: number;
  payment_method: "cash" | "transfer" | "mixed";
  status: string;
  payment_pending?: boolean;
  is_delivery: boolean;
  delivery_address_id: string | null;
  delivery_fee: number | null;
  delivery_person_id: string | null;
  delivery_paid: boolean;
  created_at: string;
  cancellation_requested_at?: string | null;
  cancellation_requested_by?: string | null;
  customers: { name: string; phone: string | null; cedula: string | null } | null;
  users: { name: string } | null;
  delivery_persons: { name: string; code: string } | null;
  branches: {
    name: string;
    nit: string | null;
    address: string | null;
    phone: string | null;
    responsable_iva: boolean;
    invoice_print_type: "tirilla" | "block";
    invoice_cancel_requires_approval?: boolean;
  } | null;
};

type DeliveryAddress = {
  id: string;
  label: string;
  address: string;
  reference_point: string | null;
};

type SaleItemRow = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  quantity_picked: number | null;
  products: { name: string; sku: string | null } | null;
};

/** Forma de location con jerarquía stands/aisles/zones/floors/warehouses (para path de ubicación). */
type LocationRowForPath = {
  id: string;
  name: string;
  level?: number;
  stands?: {
    name?: string;
    aisles?: {
      name?: string;
      zones?: { name?: string; floors?: { name?: string; level?: number; warehouses?: { name?: string } } };
    };
  };
};

/** Cantidad a despachar: la alistada si está definida, sino la pedida. */
function fulfillmentQuantity(item: SaleItemRow): number {
  const q = item.quantity_picked;
  if (q !== null && q !== undefined) return q;
  return item.quantity;
}

function lineSubtotal(item: SaleItemRow): number {
  const raw = item.quantity * item.unit_price;
  const byPercent = raw * (Number(item.discount_percent) || 0) / 100;
  const byAmount = Number(item.discount_amount) || 0;
  return Math.max(0, Math.round(raw - byPercent - byAmount));
}

/** Subtotal de la línea según cantidad a despachar (para que el total del pedido refleje lo alistado). */
function lineSubtotalFulfillment(item: SaleItemRow): number {
  const fullSubtotal = lineSubtotal(item);
  if (item.quantity <= 0) return 0;
  const qty = fulfillmentQuantity(item);
  return Math.round((qty / item.quantity) * fullSubtotal);
}

/** Subtotal de la línea para una cantidad dada (para vista en vivo mientras se edita). */
function lineSubtotalForQty(item: SaleItemRow, qty: number): number {
  const fullSubtotal = lineSubtotal(item);
  if (item.quantity <= 0) return 0;
  return Math.round((qty / item.quantity) * fullSubtotal);
}

function hasLineDiscount(item: SaleItemRow): boolean {
  return (Number(item.discount_percent) || 0) > 0 || (Number(item.discount_amount) || 0) > 0;
}

function lineDiscountLabel(item: SaleItemRow): string {
  const pct = Number(item.discount_percent) || 0;
  const amt = Number(item.discount_amount) || 0;
  if (pct > 0 && amt > 0) return `${pct}% · $ ${formatMoney(amt)}`;
  if (pct > 0) return `${pct}%`;
  if (amt > 0) return `$ ${formatMoney(amt)}`;
  return "";
}

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [items, setItems] = useState<SaleItemRow[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markingDeliveryPaid, setMarkingDeliveryPaid] = useState(false);
  const [salesMode, setSalesMode] = useState<SalesMode>("sales");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productSearchAdd, setProductSearchAdd] = useState("");
  const [productResultsAdd, setProductResultsAdd] = useState<{ id: string; name: string; sku: string | null; base_price: number }[]>([]);
  const [selectedProductAdd, setSelectedProductAdd] = useState<{ id: string; name: string; sku: string | null; base_price: number } | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addUnitPrice, setAddUnitPrice] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);
  const [addProductError, setAddProductError] = useState<string | null>(null);
  const [branchOrgId, setBranchOrgId] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const addProductSearchRef = useRef<HTMLDivElement>(null);
  const [updatingPickingItemId, setUpdatingPickingItemId] = useState<string | null>(null);
  const [partialPickedInputs, setPartialPickedInputs] = useState<Record<string, string>>({});
  const [alistedFeedbackId, setAlistedFeedbackId] = useState<string | null>(null);
  const [locationByProductId, setLocationByProductId] = useState<Record<string, string>>({});
  const [deliveryPersonsList, setDeliveryPersonsList] = useState<{ id: string; name: string; code: string }[]>([]);
  const [updatingDeliveryPerson, setUpdatingDeliveryPerson] = useState(false);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select(
          "id, branch_id, user_id, customer_id, invoice_number, total, payment_method, status, payment_pending, is_delivery, delivery_address_id, delivery_fee, delivery_person_id, delivery_paid, created_at, customers(name, phone, cedula), users!user_id(name), delivery_persons(name, code)"
        )
        .eq("id", id)
        .single();

      if (cancelled) return;
      if (saleError || !saleData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const transformedSale = {
        ...saleData,
        customers: Array.isArray(saleData.customers) ? (saleData.customers[0] || null) : saleData.customers,
        users: Array.isArray(saleData.users) ? (saleData.users[0] || null) : saleData.users,
        delivery_persons: Array.isArray(saleData.delivery_persons) ? (saleData.delivery_persons[0] || null) : saleData.delivery_persons,
        branches: null, // Se asignará después
      } as SaleDetail & { branch_id: string };
      const s = transformedSale;
      let branchData: SaleDetail["branches"] = null;
      if (s.branch_id) {
        const { data: branchRow } = await supabase
          .from("branches")
          .select("name, nit, address, phone, responsable_iva, sales_mode, organization_id")
          .eq("id", s.branch_id)
          .single();
        if (!cancelled && branchRow) {
          const row = branchRow as { invoice_print_type?: string; invoice_cancel_requires_approval?: boolean; sales_mode?: string; organization_id?: string };
          branchData = {
            name: branchRow.name,
            nit: branchRow.nit ?? null,
            address: branchRow.address ?? null,
            phone: branchRow.phone ?? null,
            responsable_iva: Boolean(branchRow.responsable_iva),
            invoice_print_type: row.invoice_print_type === "tirilla" ? "tirilla" : "block",
            invoice_cancel_requires_approval: Boolean(row.invoice_cancel_requires_approval),
          };
          if (row.sales_mode === "orders") setSalesMode("orders");
          if (row.organization_id) setBranchOrgId(row.organization_id);
        }
      }
      const finalSale = {
        ...transformedSale,
        branches: branchData,
      } as SaleDetail;
      setSale(finalSale);

      const { data: itemsData } = await supabase
        .from("sale_items")
        .select("id, product_id, quantity, unit_price, discount_percent, discount_amount, quantity_picked, products(name, sku)")
        .eq("sale_id", id);

      if (!cancelled) {
        const transformedItems = ((itemsData ?? []) as Array<{
          id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          discount_percent: number;
          discount_amount: number;
          quantity_picked: number | null;
          products: { name: string; sku: string | null }[] | { name: string; sku: string | null } | null;
        }>).map((item) => ({
          ...item,
          quantity_picked: item.quantity_picked ?? null,
          products: Array.isArray(item.products) ? (item.products[0] || null) : item.products,
        })) as SaleItemRow[];
        setItems(transformedItems);
      }

      if (s.delivery_address_id) {
        const { data: addr } = await supabase
          .from("customer_addresses")
          .select("id, label, address, reference_point")
          .eq("id", s.delivery_address_id)
          .single();
        if (!cancelled && addr) setDeliveryAddress(addr as DeliveryAddress);
      }
      if (s.branch_id && s.is_delivery) {
        const { data: dps } = await supabase
          .from("delivery_persons")
          .select("id, name, code")
          .eq("branch_id", s.branch_id)
          .eq("active", true)
          .order("name");
        if (!cancelled && dps) setDeliveryPersonsList((dps ?? []) as { id: string; name: string; code: string }[]);
      } else if (!cancelled) setDeliveryPersonsList([]);
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled && user) {
        const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();
        setCurrentUserRole(userRow?.role ?? null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Ubicación en bodega por producto (para mostrar en En alistamiento)
  useEffect(() => {
    if (!sale?.branch_id || items.length === 0) {
      setLocationByProductId({});
      return;
    }
    const productIds = [...new Set(items.map((it) => it.product_id).filter(Boolean))];
    if (productIds.length === 0) {
      setLocationByProductId({});
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: ilData } = await supabase
        .from("inventory_locations")
        .select("product_id, location_id")
        .in("product_id", productIds)
        .gt("quantity", 0);
      if (cancelled || !ilData?.length) {
        if (!cancelled) setLocationByProductId({});
        return;
      }
      const locIds = [...new Set((ilData as { location_id: string }[]).map((r) => r.location_id).filter(Boolean))];
      const { data: locs } = await supabase
        .from("locations")
        .select(`
          id,
          name,
          level,
          stands ( name, aisles ( name, zones ( name, floors ( name, level, warehouses ( name ) ) ) ) )
        `)
        .in("id", locIds)
        .eq("branch_id", sale.branch_id);
      if (cancelled || !locs) return;
      const pathByLocId: Record<string, string> = {};
      for (const loc of locs as LocationRowForPath[]) {
        const stand = loc.stands;
        const a = stand?.aisles;
        const z = a?.zones;
        const f = z?.floors;
        const w = f?.warehouses;
        const path = [w?.name, z?.name, a?.name, stand?.name, loc.level != null ? `N${loc.level}` : loc?.name].filter(Boolean).join(" → ");
        pathByLocId[loc.id] = path || loc.name || "—";
      }
      const byProduct: Record<string, string> = {};
      for (const row of ilData as { product_id: string; location_id: string }[]) {
        const path = pathByLocId[row.location_id];
        if (!path) continue;
        if (!byProduct[row.product_id]) byProduct[row.product_id] = path;
        else if (!byProduct[row.product_id].includes(path)) byProduct[row.product_id] += " · " + path;
      }
      if (!cancelled) setLocationByProductId(byProduct);
    })();
    return () => { cancelled = true };
  }, [sale?.branch_id, items.map((it) => it.product_id).join(",")]);

  // Búsqueda de productos para agregar al pedido (header y modal)
  useEffect(() => {
    if (!branchOrgId) return;
    const q = productSearchAdd.trim();
    if (!q) {
      setProductResultsAdd([]);
      return;
    }
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("id, name, sku, base_price")
        .eq("organization_id", branchOrgId)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .order("name")
        .limit(15);
      setProductResultsAdd((data ?? []) as { id: string; name: string; sku: string | null; base_price: number }[]);
    }, 300);
    return () => clearTimeout(t);
  }, [branchOrgId, productSearchAdd]);

  const handleAddProduct = useCallback(async () => {
    if (!sale?.id || !selectedProductAdd) return;
    setAddProductError(null);
    const qty = Math.max(1, Math.floor(Number(addQty) || 1));
    const unitPrice = Math.max(0, Math.round(Number(String(addUnitPrice).replace(/\D/g, "")) || selectedProductAdd.base_price));
    const supabase = createClient();
    const alreadyInOrder = items.some((it) => it.product_id === selectedProductAdd.id);
    if (alreadyInOrder) {
      setAddProductError("Este producto ya está en el pedido.");
      return;
    }
    const { data: invRow } = await supabase
      .from("inventory")
      .select("quantity")
      .eq("branch_id", sale.branch_id)
      .eq("product_id", selectedProductAdd.id)
      .maybeSingle();
    const stock = invRow?.quantity ?? 0;
    if (stock < qty) {
      setAddProductError(`No hay stock suficiente. Disponible: ${stock}.`);
      return;
    }
    setAddingProduct(true);
    const { error: insertErr } = await supabase.from("sale_items").insert({
      sale_id: sale.id,
      product_id: selectedProductAdd.id,
      quantity: qty,
      unit_price: unitPrice,
      discount_percent: 0,
      discount_amount: 0,
    });
    if (insertErr) {
      setAddProductError(insertErr.message);
      setAddingProduct(false);
      return;
    }
    const { data: allItems } = await supabase
      .from("sale_items")
      .select("id, product_id, quantity, unit_price, discount_percent, discount_amount, quantity_picked, products(name, sku)")
      .eq("sale_id", sale.id);
    const transformed = ((allItems ?? []) as Array<{
      id: string; product_id: string; quantity: number; unit_price: number; discount_percent: number; discount_amount: number;
      quantity_picked: number | null;
      products: { name: string; sku: string | null }[] | { name: string; sku: string | null } | null;
    }>).map((item) => ({
      ...item,
      quantity_picked: item.quantity_picked ?? null,
      products: Array.isArray(item.products) ? (item.products[0] || null) : item.products,
    })) as SaleItemRow[];
    const newTotal = transformed.reduce((sum, it) => sum + lineSubtotal(it), 0);
    await supabase.from("sales").update({ total: newTotal }).eq("id", sale.id);
    setItems(transformed);
    setSale((prev) => (prev ? { ...prev, total: newTotal } : null));
    setAddProductOpen(false);
    setSelectedProductAdd(null);
    setProductSearchAdd("");
    setProductResultsAdd([]);
    setAddQty(1);
    setAddUnitPrice("");
    setAddProductError(null);
    setAddingProduct(false);
  }, [sale?.id, sale?.branch_id, selectedProductAdd, addQty, addUnitPrice, items]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    if (statusDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [statusDropdownOpen]);

  useEffect(() => {
    if (!alistedFeedbackId) return;
    const t = setTimeout(() => setAlistedFeedbackId(null), 2000);
    return () => clearTimeout(t);
  }, [alistedFeedbackId]);

  useEffect(() => {
    function handleClickOutsideAddSearch(e: MouseEvent) {
      if (addProductSearchRef.current && !addProductSearchRef.current.contains(e.target as Node)) {
        setProductSearchAdd("");
      }
    }
    if (productSearchAdd.trim()) {
      document.addEventListener("mousedown", handleClickOutsideAddSearch);
      return () => document.removeEventListener("mousedown", handleClickOutsideAddSearch);
    }
  }, [productSearchAdd]);

  async function handleOrderStatusChange(newStatus: string) {
    if (!sale?.id) return;
    setUpdatingStatus(true);
    const supabase = createClient();
    const previousStatus = sale.status;
    await supabase.from("sales").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", sale.id);
    setSale((prev) => (prev ? { ...prev, status: newStatus } : null));
    if (branchOrgId && sale.branch_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await logActivity(supabase, {
            organizationId: branchOrgId,
            branchId: sale.branch_id,
            userId: user.id,
            action: "sale_status_updated",
            entityType: "sale",
            entityId: sale.id,
            summary: `Cambió estado de venta ${sale.invoice_number ?? sale.id} a ${newStatus}`,
            metadata: { invoice_number: sale.invoice_number, previousStatus, newStatus },
          });
        } catch {
          // No bloquear
        }
      }
    }
    setUpdatingStatus(false);
  }

  async function handleSetQuantityPicked(itemId: string, value: number | null) {
    if (!sale?.id) return;
    setUpdatingPickingItemId(itemId);
    const supabase = createClient();
    const { error } = await supabase.from("sale_items").update({ quantity_picked: value }).eq("id", itemId);
    if (!error) {
      const nextItems = items.map((it) => (it.id === itemId ? { ...it, quantity_picked: value } : it));
      setItems(nextItems);
      setPartialPickedInputs((p) => ({ ...p, [itemId]: "" }));
      const newSubtotal = nextItems.reduce((sum, it) => sum + lineSubtotalFulfillment(it), 0);
      const deliveryFee = Number(sale.delivery_fee) || 0;
      const newTotal = newSubtotal + deliveryFee;
      await supabase.from("sales").update({ total: newTotal, updated_at: new Date().toISOString() }).eq("id", sale.id);
      setSale((prev) => (prev ? { ...prev, total: newTotal } : null));
    }
    setUpdatingPickingItemId(null);
  }

  async function handleCancel() {
    if (!sale?.id) return;
    setCancelling(true);
    const supabase = createClient();
    const requiresApproval = sale.branches?.invoice_cancel_requires_approval ?? false;
    const { data: { user } } = await supabase.auth.getUser();
    if (requiresApproval && user) {
      await supabase
        .from("sales")
        .update({
          cancellation_reason: cancelReason.trim() || null,
          cancellation_requested_at: new Date().toISOString(),
          cancellation_requested_by: user.id,
        })
        .eq("id", sale.id);
      setSale((prev) =>
        prev
          ? {
              ...prev,
              cancellation_requested_at: new Date().toISOString(),
              cancellation_requested_by: user.id,
            }
          : null
      );
    } else {
      await supabase
        .from("sales")
        .update({ status: "cancelled", cancellation_reason: cancelReason.trim() || null })
        .eq("id", sale.id);
      setSale((prev) => (prev ? { ...prev, status: "cancelled" as const } : null));
      if (branchOrgId && sale.branch_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            await logActivity(supabase, {
              organizationId: branchOrgId,
              branchId: sale.branch_id,
              userId: user.id,
              action: "sale_cancelled",
              entityType: "sale",
              entityId: sale.id,
              summary: `Anuló la venta ${sale.invoice_number ?? sale.id}`,
              metadata: { invoice_number: sale.invoice_number, reason: cancelReason.trim() || null },
            });
          } catch {
            // No bloquear
          }
        }
      }
    }
    setCancelling(false);
    setCancelOpen(false);
    setCancelReason("");
  }

  const isAdminOrOwner = currentUserRole === "owner" || currentUserRole === "admin";

  async function handleApproveCancel() {
    if (!sale?.id) return;
    setApproving(true);
    const supabase = createClient();
    await supabase
      .from("sales")
      .update({
        status: "cancelled",
        cancellation_requested_at: null,
        cancellation_requested_by: null,
      })
      .eq("id", sale.id);
    setSale((prev) =>
      prev
        ? { ...prev, status: "cancelled" as const, cancellation_requested_at: null, cancellation_requested_by: null }
        : null
    );
    if (branchOrgId && sale.branch_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await logActivity(supabase, {
            organizationId: branchOrgId,
            branchId: sale.branch_id,
            userId: user.id,
            action: "sale_cancelled",
            entityType: "sale",
            entityId: sale.id,
            summary: `Aprobó anulación de venta ${sale.invoice_number ?? sale.id}`,
            metadata: { invoice_number: sale.invoice_number },
          });
        } catch {
          // No bloquear
        }
      }
    }
    setApproving(false);
  }

  async function handleRejectCancel() {
    if (!sale?.id) return;
    setRejecting(true);
    const supabase = createClient();
    await supabase
      .from("sales")
      .update({
        cancellation_requested_at: null,
        cancellation_requested_by: null,
        cancellation_reason: null,
      })
      .eq("id", sale.id);
    setSale((prev) =>
      prev
        ? { ...prev, cancellation_requested_at: null, cancellation_requested_by: null }
        : null
    );
    setRejecting(false);
  }

  async function handleMarkAsPaid() {
    if (!sale?.id) return;
    setMarkingPaid(true);
    const supabase = createClient();
    await supabase.from("sales").update({ payment_pending: false }).eq("id", sale.id);
    setSale((prev) => (prev ? { ...prev, payment_pending: false } : null));
    setMarkingPaid(false);
  }

  async function handleMarkDeliveryAsPaid() {
    if (!sale?.id) return;
    setMarkingDeliveryPaid(true);
    const supabase = createClient();
    await supabase
      .from("sales")
      .update({ 
        delivery_paid: true,
        delivery_paid_at: new Date().toISOString()
      })
      .eq("id", sale.id);
    setSale((prev) => (prev ? { ...prev, delivery_paid: true } : null));
    setMarkingDeliveryPaid(false);
  }

  async function handleDeliveryPersonChange(personId: string | null) {
    if (!sale?.id) return;
    setUpdatingDeliveryPerson(true);
    const supabase = createClient();
    await supabase
      .from("sales")
      .update({ delivery_person_id: personId || null, updated_at: new Date().toISOString() })
      .eq("id", sale.id);
    const updated = personId && deliveryPersonsList.find((p) => p.id === personId) ? { name: deliveryPersonsList.find((p) => p.id === personId)!.name, code: deliveryPersonsList.find((p) => p.id === personId)!.code } : null;
    setSale((prev) => (prev ? { ...prev, delivery_person_id: personId || null, delivery_persons: updated } : null));
    setUpdatingDeliveryPerson(false);
  }

  function handlePrint() {
    window.print();
  }

  function esc(s: string) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function handlePrintDispatch() {
    const invoiceNum = sale?.invoice_number ?? id ?? "—";
    const customerName = sale?.customers?.name ?? "Cliente";
    const customerDoc = (sale?.customers as { cedula?: string | null } | null)?.cedula ?? "";
    const customerPhone = sale?.customers?.phone ?? "";
    const addressLine = deliveryAddress ? `${deliveryAddress.label}: ${deliveryAddress.address}${deliveryAddress.reference_point ? ` (${deliveryAddress.reference_point})` : ""}` : "";
    const transporterLine = sale?.delivery_persons ? `${sale.delivery_persons.code} - ${sale.delivery_persons.name}` : "Sin asignar";
    const branchName = sale?.branches?.name ?? "—";
    const branchNit = sale?.branches?.nit ?? "";
    const branchAddress = sale?.branches?.address ?? "";
    const branchPhone = sale?.branches?.phone ?? "";
    const responsableIva = sale?.branches?.responsable_iva ?? false;
    const regimeText = responsableIva ? "Responsable de IVA" : "No responsable de IVA";
    const saleDate = sale?.created_at ? formatDate(sale.created_at) : "—";
    const paymentLabel = PAYMENT_LABELS[sale?.payment_method ?? ""] ?? sale?.payment_method ?? "—";
    const deliveryFee = Number(sale?.delivery_fee) || 0;

    const rows = items.map((it) => {
      const qty = it.quantity_picked !== null && it.quantity_picked !== undefined ? it.quantity_picked : it.quantity;
      const sub = it.quantity <= 0 ? 0 : Math.round((qty / it.quantity) * (it.quantity * it.unit_price - (Number(it.discount_percent) || 0) / 100 * it.quantity * it.unit_price - (Number(it.discount_amount) || 0)));
      const productLabel = `${it.products?.name ?? "—"}${it.products?.sku ? ` (${it.products.sku})` : ""}`;
      return `<tr><td class="cell">${esc(productLabel)}</td><td class="cell num">${qty}</td><td class="cell num">$ ${formatMoney(it.unit_price)}</td><td class="cell num">$ ${formatMoney(sub)}</td></tr>`;
    }).join("");

    const subtotalDispatch = items.reduce((sum, it) => {
      const qty = it.quantity_picked !== null && it.quantity_picked !== undefined ? it.quantity_picked : it.quantity;
      if (it.quantity <= 0) return sum;
      return sum + Math.round((qty / it.quantity) * (it.quantity * it.unit_price - (Number(it.discount_percent) || 0) / 100 * it.quantity * it.unit_price - (Number(it.discount_amount) || 0)));
    }, 0);
    const totalDispatch = subtotalDispatch + deliveryFee;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Factura de venta ${esc(invoiceNum)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; line-height: 1.4; color: #1e293b; padding: 20px; max-width: 720px; margin: 0 auto; }
    .nou-header { background: #ff7f50; color: #fff; padding: 16px 20px; margin: -20px -20px 20px -20px; display: flex; align-items: center; justify-content: space-between; }
    .nou-logo { font-weight: 700; font-size: 20px; letter-spacing: -0.02em; }
    .nou-doc { font-size: 11px; opacity: 0.95; text-transform: uppercase; letter-spacing: 0.04em; }
    h1 { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; border-bottom: 2px solid #ff7f50; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
    .block-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; margin-bottom: 6px; }
    .block p { margin: 2px 0; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { text-align: left; padding: 10px 12px; background: #ff7f50; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; font-weight: 600; }
    th.num { text-align: right; }
    .cell { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .cell.num { text-align: right; }
    tfoot .cell { font-weight: 700; background: #f1f5f9; border-bottom: none; }
    tfoot tr:last-child .cell { background: #ff7f50; color: #fff; font-size: 14px; padding: 10px 12px; }
    .totals { margin-top: 16px; text-align: right; }
    .totals-row { display: flex; justify-content: flex-end; gap: 80px; padding: 4px 0; font-size: 12px; }
    .totals-row.final { font-weight: 700; font-size: 15px; margin-top: 8px; padding-top: 8px; border-top: 2px solid #ff7f50; }
    .legal { margin-top: 24px; font-size: 10px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="nou-header">
    <span class="nou-logo">NOU Tiendas</span>
    <span class="nou-doc">Factura de venta</span>
  </div>
  <h1>Factura de venta No. ${esc(invoiceNum)}</h1>
  <div class="grid">
    <div class="block">
      <div class="block-title">Emisor (vendedor)</div>
      <p><strong>${esc(branchName)}</strong></p>
      ${branchNit ? `<p>NIT: ${esc(branchNit)}</p>` : ""}
      ${branchAddress ? `<p>${esc(branchAddress)}</p>` : ""}
      ${branchPhone ? `<p>Tel: ${esc(branchPhone)}</p>` : ""}
      <p>${esc(regimeText)}</p>
    </div>
    <div class="block">
      <div class="block-title">Cliente (comprador)</div>
      <p><strong>${esc(customerName)}</strong></p>
      ${customerDoc ? `<p>NIT / Cédula: ${esc(customerDoc)}</p>` : ""}
      ${addressLine ? `<p>Dirección: ${esc(addressLine)}</p>` : ""}
      ${customerPhone ? `<p>Tel: ${esc(customerPhone)}</p>` : ""}
    </div>
  </div>
  <div class="block" style="margin-bottom: 16px;">
    <div class="block-title">Datos del comprobante</div>
    <p><strong>Nº Factura:</strong> ${esc(invoiceNum)} &nbsp;|&nbsp; <strong>Fecha de expedición:</strong> ${esc(saleDate)} &nbsp;|&nbsp; <strong>Forma de pago:</strong> ${esc(paymentLabel)}</p>
    ${sale?.is_delivery ? `<p><strong>Transportador:</strong> ${esc(transporterLine)}</p>` : ""}
  </div>
  <table>
    <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Subtotal</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="3" class="cell num">Subtotal productos</td><td class="cell num">$ ${formatMoney(subtotalDispatch)}</td></tr>
      ${deliveryFee > 0 ? `<tr><td colspan="3" class="cell num">Envío</td><td class="cell num">$ ${formatMoney(deliveryFee)}</td></tr>` : ""}
      <tr><td colspan="3" class="cell num">Total</td><td class="cell num">$ ${formatMoney(totalDispatch)}</td></tr>
    </tfoot>
  </table>
  <div class="legal">
    Documento generado por NOU Tiendas. Consérvese como soporte de la operación.
  </div>
</body>
</html>`;
    const w = window.open("", "_blank", "width=780,height=900");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.onload = () => { w.print(); };
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-500 dark:text-slate-400">Cargando pedido…</p>
      </div>
    );
  }

  if (notFound || !sale) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">Pedido no encontrado.</p>
        <Link href="/ventas" className="text-[14px] font-medium text-ov-pink hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const customerName = sale.customers?.name ?? "Cliente ocasional";
  const branchName = sale.branches?.name ?? "—";
  const userName = sale.users?.name ?? "—";
  const copy = getCopy(salesMode);
  const paymentLabel = PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method;
  // Con envío: etiquetas de pedido (Creado, Alistado, etc.). Sin envío: venta normal (Pendiente, Completada, Anulada).
  const orderStatusLabels = ["pending", "preparing", "packing", "on_the_way", "delivered", "completed", "cancelled"];
  const statusLabel = sale.is_delivery
    ? (orderStatusLabels.includes(sale.status) ? getStatusLabel(sale.status, "orders") : getStatusLabel(sale.status, salesMode))
    : getStatusLabel(sale.status, "sales");
  const statusClass = getStatusClass(sale.status);
  const pendingCancel = (sale.status === "completed" || sale.status === "delivered") && !!sale.cancellation_requested_at;
  const canCancel = (sale.status === "completed" || sale.status === "delivered") && !sale.cancellation_requested_at;
  const isOrderWorkflow = orderStatusLabels.includes(sale.status);
  const canChangeOrderStatus = sale.is_delivery
    ? (salesMode === "orders" || isOrderWorkflow) && sale.status !== "cancelled" && sale.status !== "completed"
    : sale.status !== "cancelled" && sale.status !== "completed";
  const canOpenStatusDropdown = sale.is_delivery
    ? (salesMode === "orders" || isOrderWorkflow) && sale.status !== "cancelled"
    : sale.status !== "cancelled";
  const itemsSubtotal = items.reduce((sum, it) => sum + lineSubtotalFulfillment(it), 0);
  const totalDiscount = items.reduce(
    (sum, it) => sum + (fulfillmentQuantity(it) * it.unit_price - lineSubtotalFulfillment(it)),
    0
  );
  const hasAnyDiscount = totalDiscount > 0;
  const deliveryFee = Number(sale.delivery_fee) || 0;
  const calculatedTotal = itemsSubtotal + deliveryFee;
  /** Solo ventas con envío pasan por alistamiento; en "En alistamiento" se puede agregar productos y editar cantidades. */
  const canAlistarGlobal = sale.is_delivery && sale.status === "preparing";
  const initialOrderSubtotal = items.reduce((sum, it) => sum + lineSubtotal(it), 0);
  const initialOrderTotal = initialOrderSubtotal + deliveryFee;
  function getEffectiveQty(it: SaleItemRow): number {
    const pv = partialPickedInputs[it.id];
    if (pv !== undefined && pv !== "") {
      return Math.max(0, Math.min(it.quantity, Math.floor(Number(pv) || 0)));
    }
    return fulfillmentQuantity(it);
  }
  /** En "En alistamiento": para el total solo cuentan las líneas con cantidad definida; si no has tocado la línea, cuenta 0. */
  function getQtyForTotal(it: SaleItemRow): number {
    if (!canAlistarGlobal) return getEffectiveQty(it);
    const hasSet = it.quantity_picked !== null && it.quantity_picked !== undefined || (partialPickedInputs[it.id] !== undefined && partialPickedInputs[it.id] !== "");
    return hasSet ? getEffectiveQty(it) : 0;
  }
  const itemsSubtotalLive = items.reduce((sum, it) => sum + lineSubtotalForQty(it, getQtyForTotal(it)), 0);
  const totalLive = itemsSubtotalLive + deliveryFee;
  const invoicePrintType = sale.branches?.invoice_print_type ?? "block";
  /** Todas las líneas tienen cantidad a despachar = cantidad pedida y fue definida explícitamente (no "sin tocar") → sugerir "Marcar como Alistado" */
  const allLinesAlisted = canAlistarGlobal && items.length > 0 && items.every((it) => {
    const hasSet = it.quantity_picked !== null && it.quantity_picked !== undefined || (partialPickedInputs[it.id] !== undefined && partialPickedInputs[it.id] !== "");
    return hasSet && getEffectiveQty(it) === it.quantity && it.quantity > 0;
  });

  return (
    <div
      className={`min-w-0 space-y-6 print:space-y-4 ${invoicePrintType === "tirilla" ? "print-invoice-tirilla" : ""}`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes estado-listo-brillo {
              0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.2); }
              50% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
            }
            .estado-listo-animar {
              animation: estado-listo-brillo 3s ease-in-out infinite;
            }
            @media print {
              .print-invoice-tirilla {
                max-width: 80mm !important;
                width: 80mm !important;
                margin: 0 auto !important;
                padding: 3mm !important;
                font-size: 11px !important;
                color: #000 !important;
              }
              .print-invoice-tirilla * { color: #000 !important; }
              .print-invoice-tirilla .print-tirilla-single-col { display: block !important; }
              .print-invoice-tirilla .print-tirilla-single-col > * { width: 100% !important; max-width: none !important; }
              .print-invoice-tirilla h1, .print-invoice-tirilla h2 { font-size: 12px !important; }
              .print-invoice-tirilla table { font-size: 10px !important; }
            }
          `,
        }}
      />
      {/* Encabezado legal solo para impresión: datos de la sucursal */}
      <div className="hidden print:block print:pb-4 print:border-b print:border-slate-300 print:mb-4">
        <div className="print:text-center print:text-black">
          <h2 className="print:text-lg print:font-bold print:uppercase print:tracking-tight">
            {sale.branches?.name ?? "Establecimiento"}
          </h2>
          {sale.branches?.nit && (
            <p className="print:mt-1 print:text-sm">
              <span className="print:font-semibold">NIT: </span>
              {sale.branches.nit}
            </p>
          )}
          {sale.branches?.address && (
            <p className="print:mt-0.5 print:text-sm">
              <span className="print:font-semibold">Dirección: </span>
              {sale.branches.address}
            </p>
          )}
          {sale.branches?.phone && (
            <p className="print:mt-0.5 print:text-sm">
              <span className="print:font-semibold">Teléfono: </span>
              {sale.branches.phone}
            </p>
          )}
          <p className="print:mt-0.5 print:text-sm">
            <span className="print:font-semibold">Responsable de IVA: </span>
            {sale.branches?.responsable_iva ? "Sí" : "No"}
          </p>
        </div>
        <p className="print:mt-3 print:text-center print:font-bold print:uppercase print:text-base print:text-black">
          Pedido #{displayInvoiceNumber(sale.invoice_number)}
        </p>
      </div>

      {/* Card: título + métricas y acciones */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6 print:shadow-none print:ring-0">
        <Breadcrumb
          items={[
            { label: copy.sectionTitle, href: "/ventas" },
            { label: `Pedido ${displayInvoiceNumber(sale.invoice_number)}` },
          ]}
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              Pedido #{displayInvoiceNumber(sale.invoice_number)}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <MdSchedule className="h-4 w-4 shrink-0" aria-hidden />
                {formatDate(sale.created_at)} · {formatTime(sale.created_at)}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MdPerson className="h-4 w-4 shrink-0" aria-hidden />
                {customerName}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                {sale.is_delivery ? (
                  <>
                    <MdLocalShipping className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Envío</span>
                  </>
                ) : (
                  <>
                    <MdStore className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Tienda</span>
                  </>
                )}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MdBusiness className="h-4 w-4 shrink-0" aria-hidden />
                {branchName}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MdBadge className="h-4 w-4 shrink-0" aria-hidden />
                {userName}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 print:hidden">
            <Link
              href="/ventas"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={`Volver a ${copy.sectionTitle.toLowerCase()}`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 sm:gap-y-0">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
                $ {formatMoney(initialOrderTotal)}
              </p>
            </div>
            <div className="border-l-0 pl-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Método de pago</p>
              <p className={`mt-0.5 text-lg sm:text-xl ${PAYMENT_COLOR_CLASS[sale.payment_method] ?? "text-slate-700 dark:text-slate-300"}`}>
                {paymentLabel}
              </p>
            </div>
            <div className="border-l-0 pl-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Estado del pago</p>
              <p className={`mt-0.5 text-lg font-medium sm:text-xl ${sale.payment_pending ? "text-amber-600 dark:text-amber-400" : "font-bold text-emerald-600 dark:text-emerald-400"}`}>
                {sale.payment_pending ? "Pendiente" : "Pagado"}
              </p>
            </div>
            {sale.is_delivery && (Number(sale.delivery_fee) || 0) > 0 && (
              <div className="border-l-0 pl-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pago del envío</p>
                <label className="mt-0.5 flex cursor-pointer items-center gap-3 print:pointer-events-none">
                  <span
                    role="checkbox"
                    aria-checked={!!sale.delivery_paid}
                    aria-label="Marcar pago del envío como recibido"
                    tabIndex={markingDeliveryPaid || sale.delivery_paid ? -1 : 0}
                    onKeyDown={(e) => {
                      if ((e.key === " " || e.key === "Enter") && !sale.delivery_paid && !markingDeliveryPaid) {
                        e.preventDefault();
                        handleMarkDeliveryAsPaid();
                      }
                    }}
                    onClick={() => !sale.delivery_paid && !markingDeliveryPaid && handleMarkDeliveryAsPaid()}
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ov-pink/40 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                      sale.delivery_paid
                        ? "border-ov-pink bg-ov-pink text-white dark:bg-ov-pink dark:border-ov-pink"
                        : "border-slate-300 bg-white hover:border-ov-pink/50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-ov-pink/50"
                    } ${(markingDeliveryPaid || sale.delivery_paid) ? "cursor-default opacity-90" : "cursor-pointer"}`}
                  >
                    {sale.delivery_paid && (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-lg font-medium sm:text-xl ${sale.delivery_paid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {markingDeliveryPaid ? "Guardando…" : sale.delivery_paid ? "Pagado" : "Pendiente"}
                  </span>
                </label>
              </div>
            )}
            {sale.is_delivery && (
              <div className="border-l-0 pl-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Transportador</p>
                <div className="mt-0.5 flex flex-nowrap items-center gap-2">
                  <select
                    value={sale.delivery_person_id ?? ""}
                    onChange={(e) => handleDeliveryPersonChange(e.target.value || null)}
                    disabled={updatingDeliveryPerson || deliveryPersonsList.length === 0}
                    className="w-[180px] shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-800 shadow-sm focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    aria-label="Asignar transportador"
                  >
                    <option value="">{deliveryPersonsList.length === 0 ? "Sin domiciliarios" : "Seleccionar…"}</option>
                    {deliveryPersonsList.map((dp) => (
                      <option key={dp.id} value={dp.id}>{dp.code} – {dp.name}</option>
                    ))}
                  </select>
                  {["packing", "on_the_way", "delivered", "completed"].includes(sale.status) && (
                    <button
                      type="button"
                      onClick={handlePrintDispatch}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimir
                    </button>
                  )}
                  {updatingDeliveryPerson && <span className="text-[12px] text-slate-500">Guardando…</span>}
                </div>
              </div>
            )}
            {!sale.is_delivery && ["packing", "on_the_way", "delivered", "completed"].includes(sale.status) && (
              <div className="border-l-0 pl-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Impresión</p>
                <div className="mt-0.5">
                  <button
                    type="button"
                    onClick={handlePrintDispatch}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimir
                  </button>
                </div>
              </div>
            )}
            </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden sm:border-l sm:border-slate-200 sm:pl-4 sm:pl-6 sm:dark:border-slate-700" ref={statusDropdownRef}>
            <div className="relative flex flex-col">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{sale.is_delivery ? "Estado del pedido" : "Estado de la venta"}</p>
              <button
                type="button"
                onClick={() => canOpenStatusDropdown && setStatusDropdownOpen((v) => !v)}
                disabled={updatingStatus || !canOpenStatusDropdown}
                className={`mt-0.5 inline-flex min-h-[1.75rem] min-w-[120px] items-center justify-between gap-1.5 rounded-lg border px-3 py-1.5 text-left text-[13px] font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ov-pink/30 disabled:cursor-default disabled:opacity-80 ${allLinesAlisted ? "estado-listo-animar " : ""}${
                  canOpenStatusDropdown
                    ? allLinesAlisted
                      ? "border-emerald-400 bg-emerald-50/50 text-slate-800 hover:bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-slate-200 dark:hover:bg-emerald-950/50"
                      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    : `border-transparent ${statusClass} bg-slate-100 dark:bg-slate-800`
                }`}
                aria-expanded={statusDropdownOpen}
                aria-haspopup="listbox"
                aria-label={sale.is_delivery ? "Estado del pedido" : "Estado de la venta"}
              >
                <span>{statusLabel}</span>
                {canOpenStatusDropdown && (
                  <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              {statusDropdownOpen && canOpenStatusDropdown && (
                <ul
                  className="absolute left-0 top-full z-20 mt-1 max-h-64 w-40 list-none overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
                  role="listbox"
                >
                  {(sale.is_delivery
                    ? ORDER_STATUS_OPTIONS
                    : STORE_SALE_STATUS_VALUES.map((value) => ({ value, label: getStatusLabel(value, "sales") }))
                  ).map((opt) => (
                    <li key={opt.value} role="option">
                      <button
                        type="button"
                        onClick={() => {
                          if (opt.value === "cancelled") {
                            setStatusDropdownOpen(false);
                            setCancelOpen(true);
                          } else {
                            handleOrderStatusChange(opt.value);
                            setStatusDropdownOpen(false);
                          }
                        }}
                        className={`block w-full px-4 py-2 text-left text-[13px] font-medium ${
                          opt.value === sale.status
                            ? "bg-ov-pink/10 text-ov-pink dark:bg-ov-pink/20 dark:text-ov-pink-muted"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                        } ${opt.value === "cancelled" ? "text-red-600 dark:text-red-400" : ""}`}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                  {sale.status === "completed" && (
                    <>
                      <li className="my-1 border-t border-slate-200 dark:border-slate-700" role="separator" />
                      <li>
                        <button
                          type="button"
                          onClick={() => { handlePrint(); setStatusDropdownOpen(false); }}
                          className="block w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          Imprimir comprobante final
                        </button>
                      </li>
                      {sale.payment_pending && (
                        <li>
                          <button
                            type="button"
                            onClick={() => { handleMarkAsPaid(); setStatusDropdownOpen(false); }}
                            disabled={markingPaid}
                            className="block w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            {markingPaid ? "Guardando…" : "Marcar como pagado"}
                          </button>
                        </li>
                      )}
                    </>
                  )}
                </ul>
              )}
            </div>
            {pendingCancel && (
              <>
                <span className="inline-flex h-9 items-center rounded-lg bg-amber-100 px-3 text-[13px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  Anulación pendiente de aprobación
                </span>
                {isAdminOrOwner && (
                  <>
                    <button
                      type="button"
                      onClick={handleApproveCancel}
                      disabled={approving || rejecting}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {approving ? "Aprobando…" : "Aprobar anulación"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectCancel}
                      disabled={approving || rejecting}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {rejecting ? "Rechazando…" : "Rechazar solicitud"}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Productos del pedido: misma tabla siempre. Alistar = definir cantidad a despachar; el total se actualiza. */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 print:shadow-none print:ring-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Productos del pedido
          </h2>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {canAlistarGlobal && sale.status !== "cancelled" && branchOrgId && (
            <div className="relative w-full min-w-0 max-w-xs sm:max-w-sm" ref={addProductSearchRef}>
              <label htmlFor="add-product-search" className="sr-only">Buscar producto para agregar</label>
              <input
                id="add-product-search"
                type="text"
                value={productSearchAdd}
                onChange={(e) => setProductSearchAdd(e.target.value)}
                placeholder="Buscar producto para agregar…"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-3 pr-9 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              {productSearchAdd.trim() && (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 list-none overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800" role="listbox">
                  {productResultsAdd.filter((p) => !items.some((it) => it.product_id === p.id)).length === 0 && (
                    <li className="px-3 py-3 text-center text-[13px] text-slate-500 dark:text-slate-400">
                      {productResultsAdd.length === 0 ? "Sin resultados" : "Los resultados ya están en el pedido"}
                    </li>
                  )}
                  {productResultsAdd.filter((p) => !items.some((it) => it.product_id === p.id)).map((p) => (
                    <li key={p.id} role="option">
                      <button
                        type="button"
                        onClick={() => {
                          if (items.some((it) => it.product_id === p.id)) return;
                          setSelectedProductAdd(p);
                          setAddUnitPrice(String(p.base_price));
                          setAddQty(1);
                          setAddProductOpen(true);
                          setAddProductError(null);
                          setProductSearchAdd("");
                          setProductResultsAdd([]);
                        }}
                        className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {p.name} {p.sku && <span className="text-slate-500">({p.sku})</span>} · $ {formatMoney(p.base_price)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-700">
            <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Sin productos en este pedido</p>
            {canAlistarGlobal && sale.status !== "cancelled" && (
              <button
                type="button"
                onClick={() => { setAddProductOpen(true); setSelectedProductAdd(null); setProductSearchAdd(""); setProductResultsAdd([]); setAddQty(1); setAddUnitPrice(""); }}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar producto
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-2 px-3 text-left font-semibold text-slate-600 dark:text-slate-300">Producto</th>
                  <th className="pb-2 px-3 text-left font-semibold text-slate-600 dark:text-slate-300">Cant. pedida</th>
                  <th className="pb-2 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">P. unit.</th>
                  {canAlistarGlobal && <th className="pb-2 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 min-w-[180px]">Ubicación</th>}
                  <th className="pb-2 px-3 text-left font-semibold text-slate-600 dark:text-slate-300">Cant.</th>
                  <th className="pb-2 px-3 text-left font-semibold text-slate-600 dark:text-slate-300">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, rowIndex) => {
                  const canAlistar = sale.status === "preparing";
                  const rowEven = rowIndex % 2 === 0;
                  const updating = updatingPickingItemId === it.id;
                  const partialVal = partialPickedInputs[it.id];
                  const effectiveQty = getEffectiveQty(it);
                  const hasDefinedQty = it.quantity_picked !== null && it.quantity_picked !== undefined || (partialVal !== undefined && partialVal !== "");
                  const effectiveIsFull = hasDefinedQty && effectiveQty === it.quantity;
                  const effectiveIsNone = hasDefinedQty && effectiveQty === 0;
                  const effectiveIsPartial = hasDefinedQty && effectiveQty > 0 && effectiveQty < it.quantity;
                  const displaySubtotal = canAlistarGlobal ? lineSubtotalForQty(it, getQtyForTotal(it)) : lineSubtotalFulfillment(it);
                  const qtyDespachar = fulfillmentQuantity(it);
                  const inputVal = partialVal !== undefined && partialVal !== "" ? partialVal : (it.quantity_picked !== null && it.quantity_picked !== undefined ? String(it.quantity_picked) : "");
                  const showAlistedFeedback = alistedFeedbackId === it.id;
                  const isAlisted = hasDefinedQty && effectiveQty === it.quantity && it.quantity > 0;
                  return (
                    <tr
                      key={it.id}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        rowEven ? "bg-slate-50/90 dark:bg-slate-800/50" : "bg-white dark:bg-slate-800/20"
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-start gap-2">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              {it.products?.name ?? "—"}
                              {it.products?.sku && (
                                <span className="ml-1.5 text-[12px] font-normal text-slate-500 dark:text-slate-400">({it.products.sku})</span>
                              )}
                            </span>
                            {hasLineDiscount(it) && (
                              <span className="inline-flex w-fit items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                Descuento: {lineDiscountLabel(it)}
                              </span>
                            )}
                          </div>
                          {isAlisted && (
                            <span className="mt-0.5 inline-flex shrink-0 text-emerald-600 dark:text-emerald-400" title="Alistado" aria-hidden>
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-left tabular-nums text-slate-700 dark:text-slate-200">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-left tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">$ {formatMoney(it.unit_price)}</td>
                      {canAlistarGlobal && (
                        <td className="py-2.5 px-3 text-left text-[13px] text-slate-600 dark:text-slate-400 min-w-[180px] align-top" title={locationByProductId[it.product_id] ?? ""}>
                          {locationByProductId[it.product_id] ? (
                            <span className="line-clamp-2">{locationByProductId[it.product_id]}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-left">
                        {canAlistar ? (
                          <div className="flex items-center justify-start gap-2">
                            <label htmlFor={"partial-" + it.id} className="sr-only">Cantidad a despachar</label>
                            <input
                              id={"partial-" + it.id}
                              type="number"
                              min={0}
                              max={it.quantity}
                              value={inputVal}
                              onChange={(e) => setPartialPickedInputs((p) => ({ ...p, [it.id]: e.target.value }))}
                              onBlur={() => {
                                const raw = partialVal !== undefined && partialVal !== "" ? partialVal : (it.quantity_picked != null ? String(it.quantity_picked) : "");
                                const n = Math.max(0, Math.min(it.quantity, Math.floor(Number(raw) || 0)));
                                if (n !== fulfillmentQuantity(it)) {
                                  handleSetQuantityPicked(it.id, n);
                                  setAlistedFeedbackId(it.id);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="h-8 w-14 rounded border border-slate-300 px-2 text-center text-[12px] tabular-nums dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              placeholder="0"
                            />
                            </div>
                        ) : (
                          <span className="tabular-nums text-slate-700 dark:text-slate-200">{qtyDespachar}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-left tabular-nums font-medium text-slate-800 dark:text-slate-100">$ {formatMoney(displaySubtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Resumen de totales: bloque aparte, compacto */}
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-[280px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="space-y-1 text-[12px]">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal productos</span>
                  <span className="tabular-nums text-slate-800 dark:text-slate-200">$ {formatMoney(canAlistarGlobal ? itemsSubtotalLive : itemsSubtotal)}</span>
                </div>
                {hasAnyDiscount && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Descuentos</span>
                    <span className="tabular-nums">−$ {formatMoney(totalDiscount)}</span>
                  </div>
                )}
                {sale.is_delivery && deliveryFee > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Envío{sale.delivery_persons ? ` (${sale.delivery_persons.code})` : ""}</span>
                    <span className="tabular-nums text-slate-800 dark:text-slate-200">$ {formatMoney(deliveryFee)}</span>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-2 dark:border-slate-600">
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Total a despachar</span>
                <span className={`tabular-nums text-lg font-bold ${canAlistarGlobal && totalLive !== initialOrderTotal ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-50"}`}>
                  $ {formatMoney(canAlistarGlobal ? totalLive : calculatedTotal)}
                </span>
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Modal Agregar producto manualmente */}
      {addProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70" onClick={() => !addingProduct && (setAddProductOpen(false), setAddProductError(null))} aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Agregar producto al pedido</h3>
            {!selectedProductAdd ? (
              <>
                <label className="mt-4 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Buscar producto</label>
                <input
                  type="text"
                  value={productSearchAdd}
                  onChange={(e) => setProductSearchAdd(e.target.value)}
                  placeholder="Nombre o código"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  {productResultsAdd.filter((p) => !items.some((it) => it.product_id === p.id)).length === 0 && productSearchAdd.trim() && (
                    <li className="px-3 py-4 text-center text-[13px] text-slate-500 dark:text-slate-400">
                      {productResultsAdd.length === 0 ? "Sin resultados" : "Los resultados ya están en el pedido"}
                    </li>
                  )}
                  {productResultsAdd.filter((p) => !items.some((it) => it.product_id === p.id)).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedProductAdd(p); setAddUnitPrice(String(p.base_price)); setAddProductError(null); }}
                        className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {p.name} {p.sku && <span className="text-slate-500">({p.sku})</span>} · $ {formatMoney(p.base_price)}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="mt-3 text-[14px] font-medium text-slate-700 dark:text-slate-300">{selectedProductAdd.name}</p>
                {addProductError && (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400" role="alert">
                    {addProductError}
                  </p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={addQty}
                      onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400">Precio unitario ($)</label>
                    <input
                      type="text"
                      value={addUnitPrice}
                      onChange={(e) => setAddUnitPrice(e.target.value)}
                      placeholder={String(selectedProductAdd.base_price)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedProductAdd(null); setAddUnitPrice(""); }}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
                  >
                    Cambiar producto
                  </button>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={addingProduct}
                    className="flex-1 rounded-lg bg-ov-pink px-3 py-2 text-[13px] font-medium text-white hover:bg-ov-pink-hover disabled:opacity-50 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
                  >
                    {addingProduct ? "Agregando…" : "Agregar"}
                  </button>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => !addingProduct && (setAddProductOpen(false), setAddProductError(null))}
              className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={cancelOpen}
        onClose={() => { setCancelOpen(false); setCancelReason(""); }}
        title="Anular pedido"
        message={
          sale.branches?.invoice_cancel_requires_approval
            ? `La anulación del pedido #${displayInvoiceNumber(sale.invoice_number)} requerirá aprobación de un administrador. Escribe el motivo de la solicitud.`
            : `¿Anular el pedido #${displayInvoiceNumber(sale.invoice_number)}? El pedido quedará en estado "Cancelado" y no se podrá revertir desde esta pantalla.`
        }
        confirmLabel={sale.branches?.invoice_cancel_requires_approval ? "Enviar solicitud" : "Anular"}
        onConfirm={handleCancel}
        loading={cancelling}
        ariaTitle={`Anular pedido ${displayInvoiceNumber(sale.invoice_number)}`}
        icon={<MdCancel className="h-5 w-5" aria-hidden />}
        reasonLabel="Motivo de anulación"
        reasonValue={cancelReason}
        reasonOnChange={setCancelReason}
        reasonPlaceholder="Ej. Error en datos del cliente, venta duplicada…"
      />
    </div>
  );
}

