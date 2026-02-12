"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/app/components/Breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { MdStore, MdLocalShipping } from "react-icons/md";

const IVA_RATE = 0.19;

function getDayBounds(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function salePriceFromProduct(basePrice: number | null, applyIva: boolean): number {
  const base = Number(basePrice) ?? 0;
  return applyIva ? base + Math.round(base * IVA_RATE) : base;
}

export default function NewCashClosingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("fecha");
  
  // Función para obtener la fecha de hoy en formato YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Función para parsear fecha desde string YYYY-MM-DD en zona horaria local
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };
  
  const [selectedDate, setSelectedDate] = useState(() => {
    if (dateParam) {
      const parsed = parseLocalDate(dateParam);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // Si no hay parámetro, usar la fecha de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  
  // Efecto para actualizar la URL si no hay parámetro de fecha
  useEffect(() => {
    if (!dateParam) {
      const todayString = getTodayDateString();
      router.replace(`/cierre-caja/nuevo?fecha=${todayString}`);
    }
  }, [dateParam, router]);
  
  // Efecto para sincronizar selectedDate cuando cambia dateParam
  useEffect(() => {
    if (dateParam) {
      const parsed = parseLocalDate(dateParam);
      if (!isNaN(parsed.getTime())) {
        setSelectedDate(parsed);
      }
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedDate(today);
    }
  }, [dateParam]);
  
  const [branchId, setBranchId] = useState<string | null>(null);
  const [cashCloseData, setCashCloseData] = useState<{
    cash: number;
    transfer: number;
    cancelledInvoices: number;
    cancelledTotal: number;
    warranties: number;
    products: Array<{ 
      name: string; 
      quantity: number; 
      total: number;
      product_id: string;
      current_stock: number;
      min_stock: number;
      stock_after_sale: number;
    }>;
    totalSales: number;
    physicalSales: number;
    deliverySales: number;
    totalUnits: number;
    cashPercentage: number;
    transferPercentage: number;
    deliveryByPerson: Array<{ personId: string; personName: string; personCode: string; total: number; unpaid: number }>;
    warrantyEgressCash: number;
    warrantyEgressTransfer: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [actualTransfer, setActualTransfer] = useState("");
  const [differenceReason, setDifferenceReason] = useState("");
  const [notes, setNotes] = useState("");

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
      if (!ub?.branch_id || cancelled) return;
      setBranchId(ub.branch_id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { start, end } = getDayBounds(selectedDate);

      const { data: salesDay } = await supabase
        .from("sales")
        .select("id, total, payment_method, amount_cash, amount_transfer, status, invoice_number, is_delivery, delivery_fee, delivery_person_id, delivery_paid, delivery_persons(name, code)")
        .eq("branch_id", branchId)
        .gte("created_at", start)
        .lte("created_at", end);

      if (cancelled) return;

      const sales = (salesDay ?? []) as Array<{
        id: string;
        total: number;
        payment_method: string;
        amount_cash: number | null;
        amount_transfer: number | null;
        status: string;
        invoice_number: string;
        is_delivery: boolean;
        delivery_fee: number | null;
        delivery_person_id: string | null;
        delivery_paid: boolean;
        delivery_persons: { name: string; code: string } | null;
      }>;

      const completed = sales.filter((s) => s.status === "completed");
      const completedIds = completed.map((s) => s.id);

      let itemsDay: { data: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        discount_percent: number;
        discount_amount: number;
        products: { name: string } | null;
      }> | null } = { data: [] };

      if (completedIds.length > 0 && branchId) {
        const { data: items, error } = await supabase
          .from("sale_items")
          .select("product_id, quantity, unit_price, discount_percent, discount_amount, products(name)")
          .in("sale_id", completedIds);
        if (error) {
          console.error("Error fetching sale_items:", error);
        }
        itemsDay = { data: items ?? [] };
      }

      if (cancelled) return;

      const cancelledSales = sales.filter((s) => s.status === "cancelled");

      let cash = 0;
      let transfer = 0;
      completed.forEach((s) => {
        // Restar delivery_fee del total porque no es ingreso de la tienda
        const deliveryFee = Number(s.delivery_fee) || 0;
        const saleAmount = Number(s.total) - deliveryFee;
        
        if (s.payment_method === "cash") {
          cash += saleAmount;
        } else if (s.payment_method === "transfer") {
          transfer += saleAmount;
        } else if (s.payment_method === "mixed") {
          const ac = Number(s.amount_cash ?? 0);
          const at = Number(s.amount_transfer ?? 0);
          const sumMixed = ac + at;
          if (sumMixed > 0 && Math.abs(sumMixed - saleAmount) < 0.01) {
            cash += ac;
            transfer += at;
          } else if (sumMixed > 0) {
            const ratio = saleAmount / sumMixed;
            const cashPart = Math.round(ac * ratio);
            const transferPart = saleAmount - cashPart;
            cash += cashPart;
            transfer += transferPart;
          } else {
            cash += saleAmount;
          }
        }
      });

      const totalIncome = cash + transfer;
      const cashPercentage = totalIncome > 0 ? Math.round((cash / totalIncome) * 100) : 0;
      const transferPercentage = totalIncome > 0 ? Math.round((transfer / totalIncome) * 100) : 0;

      const cancelledTotal = cancelledSales.reduce((a, s) => a + Number(s.total), 0);

      const physicalSales = completed.filter((s) => !s.is_delivery).length;
      const deliverySales = completed.filter((s) => s.is_delivery).length;

      const items = (itemsDay?.data ?? []) as Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        discount_percent: number;
        discount_amount: number;
        products: { name: string } | null;
      }>;

      const byProduct: Record<string, { 
        name: string; 
        quantity: number; 
        total: number;
        product_id: string;
      }> = {};
      items.forEach((it) => {
        const lineTotal = Math.max(
          0,
          Math.round(
            it.quantity * Number(it.unit_price) * (1 - Number(it.discount_percent || 0) / 100) - Number(it.discount_amount || 0)
          )
        );
        const name = it.products?.name ?? "—";
        if (!byProduct[it.product_id]) {
          byProduct[it.product_id] = { name, quantity: 0, total: 0, product_id: it.product_id };
        }
        byProduct[it.product_id].quantity += it.quantity;
        byProduct[it.product_id].total += lineTotal;
      });

      // Obtener inventario actual de los productos vendidos
      const productIds = Object.keys(byProduct);
      const { data: inventoryData } = await supabase
        .from("inventory")
        .select("product_id, quantity, min_stock, products(name)")
        .eq("branch_id", branchId)
        .in("product_id", productIds.length > 0 ? productIds : [""]);

      // Crear un mapa de inventario por product_id
      const inventoryMap: Record<string, { quantity: number; min_stock: number }> = {};
      (inventoryData ?? []).forEach((inv: any) => {
        inventoryMap[inv.product_id] = {
          quantity: Number(inv.quantity ?? 0),
          min_stock: Number(inv.min_stock ?? 0),
        };
      });

      // Agregar información de inventario a cada producto
      const productsList = Object.values(byProduct).map((p) => {
        const inventory = inventoryMap[p.product_id] || { quantity: 0, min_stock: 0 };
        const stockAfterSale = Math.max(0, inventory.quantity - p.quantity);
        return {
          ...p,
          current_stock: inventory.quantity,
          min_stock: inventory.min_stock,
          stock_after_sale: stockAfterSale,
        };
      }).sort((a, b) => b.total - a.total);

      const totalUnits = productsList.reduce((sum, p) => sum + p.quantity, 0);

      // Calcular desglose por domiciliario
      const deliveryByPersonMap: Record<string, { personId: string; personName: string; personCode: string; total: number; unpaid: number }> = {};
      completed.forEach((s) => {
        if (s.is_delivery && s.delivery_person_id && s.delivery_fee) {
          const deliveryFee = Number(s.delivery_fee) || 0;
          const personId = s.delivery_person_id;
          const personName = s.delivery_persons?.name || "Sin asignar";
          const personCode = s.delivery_persons?.code || "";
          
          if (!deliveryByPersonMap[personId]) {
            deliveryByPersonMap[personId] = {
              personId,
              personName,
              personCode,
              total: 0,
              unpaid: 0,
            };
          }
          deliveryByPersonMap[personId].total += deliveryFee;
          if (!s.delivery_paid) {
            deliveryByPersonMap[personId].unpaid += deliveryFee;
          }
        }
      });
      const deliveryByPerson = Object.values(deliveryByPersonMap).sort((a, b) => a.personCode.localeCompare(b.personCode));

      // Garantías procesadas del día: ajustar efectivo/transferencia y egresos
      let warrantyCashImpact = 0;
      let warrantyTransferImpact = 0;
      let warrantiesCount = 0;
      let warrantyEgressCash = 0;
      let warrantyEgressTransfer = 0;
      const { data: warrantiesDay } = await supabase
        .from("warranties")
        .select("id, warranty_type, sale_id, sale_item_id, product_id, quantity, replacement_product_id, branch_id, sale_items(unit_price, quantity), sales(branch_id, payment_method, amount_cash, amount_transfer)")
        .eq("status", "processed")
        .gte("created_at", start)
        .lte("created_at", end);
      if (cancelled) return;

      const warrantyList = (warrantiesDay ?? []) as Array<{
        id: string;
        warranty_type: string;
        sale_id: string | null;
        sale_item_id: string | null;
        product_id: string;
        quantity: number;
        replacement_product_id: string | null;
        branch_id: string | null;
        sale_items: { unit_price: number; quantity: number } | Array<{ unit_price: number; quantity: number }> | null;
        sales: { branch_id: string; payment_method: string; amount_cash: number | null; amount_transfer: number | null } | Array<{ branch_id: string; payment_method: string; amount_cash: number | null; amount_transfer: number | null }> | null;
      }>;

      const forBranch = warrantyList.filter((w) => {
        const sal = Array.isArray(w.sales) ? w.sales[0] : w.sales;
        return w.branch_id === branchId || sal?.branch_id === branchId;
      });
      warrantiesCount = forBranch.length;

      if (forBranch.length > 0) {
        const productIds = [...new Set([...forBranch.map((w) => w.product_id), ...forBranch.map((w) => w.replacement_product_id).filter(Boolean) as string[]])];
        const { data: productsData } = await supabase
          .from("products")
          .select("id, base_price, apply_iva")
          .in("id", productIds);
        if (cancelled) return;
        const productsMap: Record<string, { base_price: number | null; apply_iva: boolean }> = {};
        (productsData ?? []).forEach((p: { id: string; base_price: number | null; apply_iva: boolean }) => {
          productsMap[p.id] = { base_price: p.base_price, apply_iva: !!p.apply_iva };
        });

        for (const w of forBranch) {
          const si = Array.isArray(w.sale_items) ? w.sale_items[0] : w.sale_items;
          const sal = Array.isArray(w.sales) ? w.sales[0] : w.sales;
          let productValue = 0;
          if (si && si.unit_price != null) {
            productValue = Number(si.unit_price) * (si.quantity ?? w.quantity ?? 1);
          } else {
            const prod = productsMap[w.product_id];
            if (prod) {
              productValue = salePriceFromProduct(prod.base_price, prod.apply_iva) * (w.quantity || 1);
            }
          }

          if (w.warranty_type === "refund") {
            const amount = productValue;
            if (sal?.payment_method === "transfer") {
              warrantyTransferImpact -= amount;
            } else if (sal?.payment_method === "mixed" && sal.amount_cash != null && sal.amount_transfer != null) {
              const total = Number(sal.amount_cash) + Number(sal.amount_transfer);
              if (total > 0) {
                warrantyCashImpact -= Math.round((Number(sal.amount_cash) / total) * amount);
                warrantyTransferImpact -= amount - Math.round((Number(sal.amount_cash) / total) * amount);
              } else {
                warrantyCashImpact -= amount;
              }
            } else {
              warrantyCashImpact -= amount;
            }
          } else if (w.warranty_type === "exchange" && w.replacement_product_id) {
            const repl = productsMap[w.replacement_product_id];
            const replacementValue = repl ? salePriceFromProduct(repl.base_price, repl.apply_iva) * (w.quantity || 1) : 0;
            const diff = replacementValue - productValue;
            warrantyCashImpact += diff;
          }
          // repair: no impacto
        }

        cash += warrantyCashImpact;
        transfer += warrantyTransferImpact;
        warrantyEgressCash = warrantyCashImpact < 0 ? -warrantyCashImpact : 0;
        warrantyEgressTransfer = warrantyTransferImpact < 0 ? -warrantyTransferImpact : 0;
      }

      const totalAfterWarranties = cash + transfer;
      const cashPct = totalAfterWarranties > 0 ? Math.round((cash / totalAfterWarranties) * 100) : 0;
      const transferPct = totalAfterWarranties > 0 ? Math.round((transfer / totalAfterWarranties) * 100) : 0;

      setCashCloseData({
        cash,
        transfer,
        cancelledInvoices: cancelledSales.length,
        cancelledTotal,
        warranties: warrantiesCount,
        products: productsList,
        totalSales: completed.length,
        physicalSales,
        deliverySales,
        totalUnits,
        cashPercentage: cashPct,
        transferPercentage: transferPct,
        deliveryByPerson,
        warrantyEgressCash,
        warrantyEgressTransfer,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, branchId]);

  const formatValue = (value: number) => {
    return `$${value.toLocaleString("es-CO")}`;
  };

  // Formatea número con separador de miles (punto)
  const formatNumber = (value: number | string): string => {
    if (!value || value === "") return "";
    const num = typeof value === "string" ? parseFloat(value.replace(/\./g, "")) || 0 : value;
    if (isNaN(num) || num === 0) return "";
    return num.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Parsea string con separador de miles a número
  const parseFormattedNumber = (str: string): number => {
    const cleaned = str.replace(/\./g, "").replace(/,/g, ".");
    return cleaned === "" ? 0 : parseFloat(cleaned) || 0;
  };

  const getInventoryStatus = (stockAfterSale: number, minStock: number) => {
    if (stockAfterSale === 0) {
      return { text: "Agotado", color: "text-red-600 dark:text-red-400" };
    } else if (minStock > 0 && stockAfterSale <= minStock) {
      return { text: "Stock bajo", color: "text-orange-600 dark:text-orange-400" };
    } else {
      return { text: "En stock", color: "text-green-600 dark:text-green-400" };
    }
  };

  const handleSave = async () => {
    if (!branchId || !cashCloseData) return;
    
    // Validar que si hay diferencia, el motivo sea obligatorio
    const cashDiff = Number(actualCash || cashCloseData.cash) - cashCloseData.cash;
    const transferDiff = Number(actualTransfer || cashCloseData.transfer) - cashCloseData.transfer;
    const hasDifference = cashDiff !== 0 || transferDiff !== 0;
    
    if (hasDifference && !differenceReason.trim()) {
      alert("Debes ingresar el motivo de la diferencia cuando hay sobra o falta de dinero.");
      return;
    }
    
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const closingDate = selectedDate.toISOString().split("T")[0];
      
      const { error } = await supabase.from("cash_closings").upsert({
        branch_id: branchId,
        user_id: user.id,
        closing_date: closingDate,
        expected_cash: cashCloseData.cash,
        expected_transfer: cashCloseData.transfer,
        actual_cash: Number(actualCash || cashCloseData.cash),
        actual_transfer: Number(actualTransfer || cashCloseData.transfer),
        cash_difference: Number(actualCash || cashCloseData.cash) - cashCloseData.cash,
        transfer_difference: Number(actualTransfer || cashCloseData.transfer) - cashCloseData.transfer,
        total_sales: cashCloseData.totalSales,
        physical_sales: cashCloseData.physicalSales,
        delivery_sales: cashCloseData.deliverySales,
        total_units: cashCloseData.totalUnits,
        cancelled_invoices: cashCloseData.cancelledInvoices,
        cancelled_total: cashCloseData.cancelledTotal,
        warranties_count: cashCloseData.warranties,
        notes: notes || null,
        difference_reason: differenceReason || null,
      }, {
        onConflict: "branch_id,closing_date"
      });

      if (error) throw error;

      // Actualizar ventas marcadas como pagadas
      const { start, end } = getDayBounds(selectedDate);
      const { data: salesData } = await supabase
        .from("sales")
        .select("id, delivery_person_id")
        .eq("branch_id", branchId)
        .eq("status", "completed")
        .gte("created_at", start)
        .lte("created_at", end);
      
      if (salesData) {
        // Para cada domiciliario marcado como pagado, actualizar sus ventas
        for (const person of cashCloseData.deliveryByPerson) {
          if (person.unpaid === 0) {
            // Este domiciliario está marcado como pagado
            const saleIds = salesData
              .filter(s => s.delivery_person_id === person.personId)
              .map(s => s.id);
            
            if (saleIds.length > 0) {
              await supabase
                .from("sales")
                .update({ 
                  delivery_paid: true,
                  delivery_paid_at: new Date().toISOString()
                })
                .in("id", saleIds);
            }
          }
        }
      }
      
      // Redirigir al detalle del cierre de caja
      const { data: savedClosing } = await supabase
        .from("cash_closings")
        .select("id")
        .eq("branch_id", branchId)
        .eq("closing_date", closingDate)
        .single();
      
      if (savedClosing) {
        router.push(`/cierre-caja/${savedClosing.id}`);
      } else {
        router.push("/cierre-caja");
      }
    } catch (error) {
      console.error("Error guardando cierre de caja:", error);
      alert("Error al guardar el cierre de caja. Por favor intenta de nuevo.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Cierres de caja", href: "/cierre-caja" },
            { label: "Nuevo cierre", href: "#" },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Cierre de caja manual
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Resumen del día {selectedDate.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link
            href="/cierre-caja"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Volver a cierres de caja"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-slate-500 dark:text-slate-400">Cargando datos...</p>
        </div>
      ) : cashCloseData ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
          {/* Columna izquierda: Arqueo de caja + Productos vendidos */}
          <div className="space-y-4">
            {/* Arqueo de caja - PRIMERO Y PRINCIPAL */}
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Arqueo de caja
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* Efectivo */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
                <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  Efectivo esperado
                </label>
                <div className="mb-3 text-xl font-bold text-slate-900 dark:text-slate-50">
                  {formatValue(cashCloseData.cash)}
                </div>
                <label className="mb-2 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  Efectivo ingresado
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={actualCash ? formatNumber(actualCash) : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.,]/g, "");
                    if (value === "") {
                      setActualCash("");
                      return;
                    }
                    const parsed = parseFormattedNumber(value);
                    setActualCash(parsed.toString());
                  }}
                  placeholder="0"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                {actualCash && (
                  <div className="mt-2">
                    <span className="text-[12px] text-slate-600 dark:text-slate-400">
                      Diferencia:{" "}
                    </span>
                    <span
                      className={`text-[13px] font-bold ${
                        Number(actualCash) - cashCloseData.cash === 0
                          ? "text-green-600 dark:text-green-400"
                          : Number(actualCash) - cashCloseData.cash < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-orange-600 dark:text-orange-400"
                      }`}
                    >
                      {Number(actualCash) - cashCloseData.cash >= 0 ? "+" : ""}
                      {formatValue(Number(actualCash) - cashCloseData.cash)}
                    </span>
                  </div>
                )}
              </div>

              {/* Transferencia */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
                <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  Transferencia esperada
                </label>
                <div className="mb-3 text-xl font-bold text-slate-900 dark:text-slate-50">
                  {formatValue(cashCloseData.transfer)}
                </div>
                <label className="mb-2 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  Transferencia ingresada
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={actualTransfer ? formatNumber(actualTransfer) : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.,]/g, "");
                    if (value === "") {
                      setActualTransfer("");
                      return;
                    }
                    const parsed = parseFormattedNumber(value);
                    setActualTransfer(parsed.toString());
                  }}
                  placeholder="0"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                {actualTransfer && (
                  <div className="mt-2">
                    <span className="text-[12px] text-slate-600 dark:text-slate-400">
                      Diferencia:{" "}
                    </span>
                    <span
                      className={`text-[13px] font-bold ${
                        Number(actualTransfer) - cashCloseData.transfer === 0
                          ? "text-green-600 dark:text-green-400"
                          : Number(actualTransfer) - cashCloseData.transfer < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-orange-600 dark:text-orange-400"
                      }`}
                    >
                      {Number(actualTransfer) - cashCloseData.transfer >= 0 ? "+" : ""}
                      {formatValue(Number(actualTransfer) - cashCloseData.transfer)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notas sobre diferencias */}
            {(actualCash || actualTransfer) &&
              (Number(actualCash || 0) - cashCloseData.cash !== 0 ||
                Number(actualTransfer || 0) - cashCloseData.transfer !== 0) && (
                <div className="mt-4">
                  <label className="mb-2 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    Motivo de la diferencia <span className="text-ov-pink">*</span>
                  </label>
                  <textarea
                    value={differenceReason}
                    onChange={(e) => setDifferenceReason(e.target.value)}
                    placeholder="Explica si falta o sobra dinero..."
                    rows={3}
                    required
                    className={`w-full rounded-lg border px-4 py-2 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:bg-slate-800 dark:text-slate-100 ${
                      !differenceReason
                        ? "border-red-300 dark:border-red-700"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  />
                  {!differenceReason && (
                    <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                      Este campo es obligatorio cuando hay diferencia
                    </p>
                  )}
                </div>
              )}
          </div>

          {/* Productos vendidos - SEGUNDO */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Productos vendidos
            </p>
            {cashCloseData.products.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Cantidad
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                    {cashCloseData.products.map((product, i) => {
                      const status = getInventoryStatus(product.stock_after_sale, product.min_stock);
                      return (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="whitespace-nowrap px-4 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-50">
                            {product.name}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-[13px] text-slate-600 dark:text-slate-400">
                            {product.quantity} unidades
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-[13px] font-medium text-slate-900 dark:text-slate-50">
                            {formatValue(product.total)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[13px]">
                            <span className={`font-medium ${status.color}`}>
                              {status.text}
                            </span>
                            <span className="ml-2 text-[11px] text-slate-500 dark:text-slate-400">
                              ({product.stock_after_sale} unidades)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800">
                    <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                      <td className="px-4 py-3 text-[13px] font-bold text-slate-900 dark:text-slate-50">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold text-slate-900 dark:text-slate-50">
                        {cashCloseData.totalUnits} unidades
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold text-slate-900 dark:text-slate-50">
                        {formatValue(cashCloseData.cash + cashCloseData.transfer)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-500 dark:text-slate-400">
                        {/* Columna vacía para mantener alineación */}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-slate-50/50 p-6 text-center text-[13px] text-slate-500 dark:bg-slate-800/30 dark:text-slate-400">
                No se vendieron productos este día
              </div>
            )}
          </div>
          </div>

          {/* Columna derecha: Resumen del día */}
          <div className="space-y-4">
            {/* Resumen */}
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Resumen del día
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Total ventas</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">
                    {cashCloseData.totalSales} {cashCloseData.totalSales === 1 ? "venta" : "ventas"}
                  </span>
                </div>
                {cashCloseData.totalSales > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-400">
                      <MdStore className="inline h-3.5 w-3.5 mr-1" />
                      Físicas
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {cashCloseData.physicalSales} ({Math.round((cashCloseData.physicalSales / cashCloseData.totalSales) * 100)}%)
                    </span>
                  </div>
                )}
                {cashCloseData.totalSales > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-400">
                      <MdLocalShipping className="inline h-3.5 w-3.5 mr-1" />
                      Delivery
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {cashCloseData.deliverySales} ({Math.round((cashCloseData.deliverySales / cashCloseData.totalSales) * 100)}%)
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Total unidades vendidas</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">
                    {cashCloseData.totalUnits} {cashCloseData.totalUnits === 1 ? "unidad" : "unidades"}
                  </span>
                </div>
                {cashCloseData.cancelledInvoices > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-400">Facturas anuladas</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {cashCloseData.cancelledInvoices} · {formatValue(cashCloseData.cancelledTotal)}
                    </span>
                  </div>
                )}
                {cashCloseData.warranties > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-400">Garantías</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {cashCloseData.warranties}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-[14px] text-slate-600 dark:text-slate-400">Efectivo esperado</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{formatValue(cashCloseData.cash)}</span>
                </div>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Transferencia esperada</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{formatValue(cashCloseData.transfer)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total del día</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-50">
                    {formatValue(cashCloseData.cash + cashCloseData.transfer)}
                  </span>
                </div>
              </div>

              {/* Egresos por garantías (dinero devuelto a clientes) - siempre visible */}
              <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Egresos por garantías
                </p>
                <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                  Dinero devuelto a clientes (devoluciones y diferencias de cambio)
                </p>
                <div className="mt-3 space-y-1.5">
                    {cashCloseData.warrantyEgressCash > 0 && (
                      <div className="flex items-center justify-between text-[14px]">
                        <span className="text-slate-600 dark:text-slate-400">Efectivo</span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {formatValue(cashCloseData.warrantyEgressCash)}
                        </span>
                      </div>
                    )}
                    {cashCloseData.warrantyEgressTransfer > 0 && (
                      <div className="flex items-center justify-between text-[14px]">
                        <span className="text-slate-600 dark:text-slate-400">Transferencia</span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {formatValue(cashCloseData.warrantyEgressTransfer)}
                        </span>
                      </div>
                    )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Total egresos</span>
                    <span className="font-bold text-slate-900 dark:text-slate-50">
                      {formatValue(cashCloseData.warrantyEgressCash + cashCloseData.warrantyEgressTransfer)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desglose por domiciliario */}
              {cashCloseData.deliveryByPerson.length > 0 && (
                <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                  <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Envíos a pagar
                  </p>
                  <div className="mt-3 space-y-3">
                    {cashCloseData.deliveryByPerson.map((person) => {
                      const isPaid = person.unpaid === 0;
                      return (
                        <div key={person.personId} className="flex items-center justify-between text-[14px]">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isPaid}
                              onChange={(e) => {
                                setCashCloseData(prev => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    deliveryByPerson: prev.deliveryByPerson.map(p =>
                                      p.personId === person.personId
                                        ? { ...p, unpaid: e.target.checked ? 0 : p.total }
                                        : p
                                    )
                                  };
                                });
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30 dark:border-slate-600"
                            />
                            <span className={`${isPaid ? 'text-slate-400 line-through' : 'text-slate-700'} dark:${isPaid ? 'text-slate-600' : 'text-slate-300'}`}>
                              {person.personCode} - {person.personName}
                            </span>
                          </div>
                          <div className="text-right">
                            {person.unpaid > 0 ? (
                              <>
                                <span className="font-bold text-slate-900 dark:text-slate-50">
                                  {formatValue(person.unpaid)}
                                </span>
                                {person.unpaid < person.total && (
                                  <span className="ml-2 text-[12px] text-slate-500 dark:text-slate-400">
                                    (de {formatValue(person.total)})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                                Pagado
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                      <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400">Total pendiente</span>
                      <span className="text-[14px] font-bold text-slate-900 dark:text-slate-50">
                        {formatValue(cashCloseData.deliveryByPerson.reduce((sum, p) => sum + p.unpaid, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Notas */}
              <div className="mt-4">
                <label className="mb-2 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  Notas <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agrega notas sobre el cierre de caja..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              
              <button
                onClick={handleSave}
                disabled={(() => {
                  if (saving || loading || !cashCloseData) return true;
                  const cashDiff = Number(actualCash || cashCloseData.cash) - cashCloseData.cash;
                  const transferDiff = Number(actualTransfer || cashCloseData.transfer) - cashCloseData.transfer;
                  const hasDifference = cashDiff !== 0 || transferDiff !== 0;
                  return hasDifference && !differenceReason.trim();
                })()}
                className="mt-4 w-full rounded-lg bg-ov-pink py-3 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:opacity-50 disabled:pointer-events-none dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
                aria-busy={saving}
                aria-disabled={saving}
              >
                {saving ? "Cerrando caja…" : "Cerrar caja"}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-slate-500 dark:text-slate-400">No hay datos disponibles para esta fecha.</p>
        </div>
      )}
    </div>
  );
}
