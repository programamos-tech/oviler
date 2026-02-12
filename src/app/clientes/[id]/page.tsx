"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/app/components/Breadcrumb";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

type CustomerAddress = {
  id: string;
  label: string;
  address: string;
  reference_point: string | null;
  is_default: boolean;
  display_order: number;
};

type Customer = {
  id: string;
  name: string;
  cedula: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  customer_addresses: CustomerAddress[] | null;
};

type SaleRow = {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  created_at: string;
};

type SaleItemRow = {
  product_id: string;
  quantity: number;
};

type TopProduct = {
  product_id: string;
  product_name: string;
  total_quantity: number;
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, name, cedula, email, phone, created_at, customer_addresses(id, label, address, reference_point, is_default, display_order)")
        .eq("id", id)
        .single();

      if (cancelled) return;
      if (customerError || !customerData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCustomer(customerData as Customer);

      const { data: salesData } = await supabase
        .from("sales")
        .select("id, invoice_number, total, status, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setSales((salesData ?? []) as SaleRow[]);

      const saleIds = (salesData ?? []).map((s: { id: string }) => s.id);
      if (saleIds.length > 0) {
        try {
          const { data: itemsData } = await supabase
            .from("sale_items")
            .select("product_id, quantity")
            .in("sale_id", saleIds);

          if (!cancelled && itemsData && itemsData.length > 0) {
            const byProduct: Record<string, number> = {};
            for (const row of itemsData as SaleItemRow[]) {
              byProduct[row.product_id] = (byProduct[row.product_id] ?? 0) + (row.quantity ?? 0);
            }
            const sorted = Object.entries(byProduct)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([product_id, total_quantity]) => ({ product_id, total_quantity }));
            const productIds = sorted.map((p) => p.product_id);
            const { data: productsData } = await supabase
              .from("products")
              .select("id, name")
              .in("id", productIds);
            const nameById: Record<string, string> = {};
            (productsData ?? []).forEach((p: { id: string; name: string }) => {
              nameById[p.id] = p.name ?? "—";
            });
            setTopProducts(
              sorted.map(({ product_id, total_quantity }) => ({
                product_id,
                product_name: nameById[product_id] ?? "—",
                total_quantity,
              }))
            );
          }
        } catch {
          // sale_items puede no existir aún; top productos queda vacío
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function handleDelete() {
    if (!customer?.id) return;
    setDeleting(true);
    const supabase = createClient();
    if (sales.length === 0) {
      await supabase.from("customers").delete().eq("id", customer.id);
    } else {
      await supabase.from("customers").update({ active: false }).eq("id", customer.id);
    }
    setDeleting(false);
    setDeleteOpen(false);
    router.push("/clientes");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex min-h-[200px] items-center justify-center py-24">
          <p className="font-logo text-lg font-bold tracking-tight text-slate-800 dark:text-white sm:text-xl">
            NOU<span className="animate-pulse">...</span>
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">Cliente no encontrado.</p>
        <Link href="/clientes" className="text-[14px] font-medium text-ov-pink hover:underline">
          Volver a clientes
        </Link>
      </div>
    );
  }

  const addresses = (customer.customer_addresses ?? []).sort(
    (a, b) => (a.is_default ? -1 : 0) - (b.is_default ? -1 : 0) || a.display_order - b.display_order
  );
  const subtitleParts = [customer.cedula ? `CC ${customer.cedula}` : null, customer.phone || null, customer.email ? customer.email : null].filter(Boolean);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Sin datos de contacto";

  const completedSales = sales.filter((s) => s.status === "completed");
  const ticketPromedio = completedSales.length > 0
    ? completedSales.reduce((sum, s) => sum + Number(s.total), 0) / completedSales.length
    : 0;
  const totalVentas = completedSales.reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <div className="space-y-6">
      {/* Card: nombre + resumen y acciones */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
        <Breadcrumb
          items={[
            { label: "Clientes", href: "/clientes" },
            { label: customer.name },
          ]}
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              {customer.name}
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
          <Link
            href="/clientes"
            className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a clientes"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4 sm:gap-6">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ticket promedio</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
                {completedSales.length > 0 ? `$ ${formatMoney(ticketPromedio)}` : "—"}
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                {completedSales.length} {completedSales.length === 1 ? "venta" : "ventas"}
              </p>
            </div>
            <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total comprado</p>
              <p className="mt-0.5 text-lg font-bold text-emerald-700 dark:text-emerald-300 sm:text-xl">
                {completedSales.length > 0 ? `$ ${formatMoney(totalVentas)}` : "—"}
              </p>
            </div>
            <div className="border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-6 min-w-0 max-w-[280px]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Direcciones</p>
              {addresses.length === 0 ? (
                <p className="mt-0.5 text-lg font-bold text-slate-500 dark:text-slate-400 sm:text-xl">—</p>
              ) : (
                <>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl truncate">
                      {addresses[0].label}
                    </span>
                    {addresses[0].is_default && (
                      <span className="rounded bg-ov-pink/15 px-2 py-0.5 text-[10px] font-bold text-ov-pink dark:bg-ov-pink/20 shrink-0">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] font-medium text-slate-600 dark:text-slate-400 truncate" title={addresses[0].address}>
                    {addresses[0].address}
                  </p>
                  {addresses.length > 1 && (
                    <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-500">
                      +{addresses.length - 1} {addresses.length === 2 ? "dirección más" : "direcciones más"}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/clientes/${customer.id}/editar`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
            >
              Editar
            </Link>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-ov-pink/50 bg-white px-4 text-[13px] font-medium text-ov-pink hover:bg-ov-pink/10 dark:border-ov-pink/50 dark:bg-slate-800 dark:text-ov-pink-muted dark:hover:bg-ov-pink/20"
            >
              {sales.length === 0 ? "Eliminar" : "Desactivar"}
            </button>
          </div>
        </div>
      </div>

      {/* Ventas y top productos, uno al lado del otro */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Ventas de este cliente
            </h2>
            {sales.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-700 min-h-[200px]">
                <svg className="h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="mt-3 text-[14px] font-medium text-slate-600 dark:text-slate-400">Aún no hay ventas registradas</p>
                <p className="mt-1 max-w-[260px] text-center text-[13px] text-slate-500 dark:text-slate-500">
                  Cuando registres ventas con este cliente, aquí verás el detalle.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2 max-h-[220px] overflow-y-auto">
                {sales.map((sale) => (
                  <li
                    key={sale.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/30"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{sale.invoice_number}</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400">
                        {formatDate(sale.created_at)} · {formatTime(sale.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[14px] font-bold text-slate-900 dark:text-slate-50">$ {formatMoney(Number(sale.total))}</p>
                      <p className={`text-[11px] font-medium ${sale.status === "completed" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {sale.status === "completed" ? "Completada" : "Anulada"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Top productos comprados
          </h2>
            {topProducts.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-700 min-h-[200px]">
                <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Sin datos aún</p>
                <p className="mt-1 max-w-[260px] text-center text-[13px] text-slate-500 dark:text-slate-500">
                  Cuando las ventas incluyan ítems por producto, aquí verás el top de productos que ha comprado.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {topProducts.map((p, index) => (
                  <li
                    key={p.product_id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-ov-pink/20 text-[11px] font-bold text-ov-pink">
                        {index + 1}
                      </span>
                      <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">{p.product_name}</span>
                    </div>
                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 shrink-0">
                      {p.total_quantity} {p.total_quantity === 1 ? "vez" : "veces"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </section>

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={sales.length === 0 ? "Eliminar cliente" : "Desactivar cliente"}
        message={sales.length === 0
          ? `¿Estás seguro de que quieres eliminar a "${customer.name}"? Se borrarán también sus direcciones.`
          : `Este cliente tiene ${sales.length} ${sales.length === 1 ? "venta" : "ventas"}. No se puede eliminar para no perder el historial. Se desactivará y dejará de aparecer en la lista de clientes.`}
        onConfirm={handleDelete}
        loading={deleting}
        ariaTitle={sales.length === 0 ? `Eliminar cliente ${customer.name}` : `Desactivar cliente ${customer.name}`}
      />
    </div>
  );
}
