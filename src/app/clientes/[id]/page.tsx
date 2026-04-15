"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/app/components/Breadcrumb";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import { getAvatarVariant } from "@/app/components/app-nav-data";
import {
  creditLineDisplayStatus,
  creditRowPending,
  creditStatusChip,
  formatDateShort,
  formatMoney as formatMoneyCredit,
  type CreditStatus,
} from "@/app/creditos/credit-ui";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function displayInvoiceNumber(invoiceNumber: string) {
  if (!invoiceNumber) return invoiceNumber;
  const sin = invoiceNumber.replace(/^FV-?\s*/i, "").trim();
  return sin || invoiceNumber;
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

type WarrantySummary = {
  total: number;
  processedRefunds: number;
};

type CustomerCreditRow = {
  id: string;
  public_ref: string;
  title: string | null;
  total_amount: number;
  amount_paid: number;
  due_date: string;
  status: CreditStatus;
  cancelled_at: string | null;
  sale_id: string | null;
  sales: { invoice_number: string } | null;
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [warrantySummary, setWarrantySummary] = useState<WarrantySummary>({ total: 0, processedRefunds: 0 });
  const [credits, setCredits] = useState<CustomerCreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, name, cedula, email, phone, created_at, customer_addresses(id, label, address, reference_point, is_default, display_order)")
        .eq("id", id)
        .eq("branch_id", ub.branch_id)
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

      const { data: creditsData } = await supabase
        .from("customer_credits")
        .select("id, public_ref, title, total_amount, amount_paid, due_date, status, cancelled_at, sale_id, sales(invoice_number)")
        .eq("branch_id", ub.branch_id)
        .eq("customer_id", id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setCredits((creditsData ?? []) as unknown as CustomerCreditRow[]);
      }

      const { data: warrantiesData } = await supabase
        .from("warranties")
        .select("status, warranty_type")
        .eq("customer_id", id);
      if (!cancelled) {
        const list = (warrantiesData ?? []) as Array<{ status: string; warranty_type: string }>;
        setWarrantySummary({
          total: list.length,
          processedRefunds: list.filter((w) => w.status === "processed" && w.warranty_type === "refund").length,
        });
      }

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
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
        <div className="min-h-[280px] animate-pulse rounded-2xl bg-white dark:bg-slate-900" aria-hidden />
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-4 font-sans text-[13px] text-slate-800 antialiased dark:text-slate-100">
        <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Cliente no encontrado.</p>
        <Link
          href="/clientes"
          className="inline-flex text-[14px] font-medium text-[color:var(--shell-sidebar)] transition-colors hover:underline dark:text-zinc-300"
        >
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
  const avatarSeed = `${customer.email || customer.name || customer.id}-${getAvatarVariant(null)}`;

  const completedSales = sales.filter((s) => s.status === "completed");
  const ticketPromedio = completedSales.length > 0
    ? completedSales.reduce((sum, s) => sum + Number(s.total), 0) / completedSales.length
    : 0;
  const totalVentas = completedSales.reduce((sum, s) => sum + Number(s.total), 0);

  const totalCreditoPendiente = credits.reduce(
    (s, c) => s + creditRowPending(Number(c.total_amount), Number(c.amount_paid), Boolean(c.cancelled_at)),
    0
  );

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb
          items={[
            { label: "Clientes", href: "/clientes" },
            { label: customer.name },
          ]}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:h-14 sm:w-14">
              <WorkspaceCharacterAvatar seed={avatarSeed} size={96} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
                {customer.name}
              </h1>
              <p className="mt-1 text-left text-[13px] font-medium leading-snug text-pretty text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 print:hidden sm:pt-0.5">
            <Link
              href="/clientes"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
              title="Volver a clientes"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <Link
              href={`/clientes/${customer.id}/editar`}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            >
              Editar
            </Link>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-slate-600 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {sales.length === 0 ? "Eliminar" : "Desactivar"}
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="grid grid-cols-1 gap-5 sm:flex sm:flex-row sm:flex-wrap sm:gap-6 sm:gap-y-0">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Ticket promedio</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">
                {completedSales.length > 0 ? `$ ${formatMoney(ticketPromedio)}` : "—"}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                {completedSales.length} {completedSales.length === 1 ? "venta" : "ventas"}
              </p>
            </div>
            <div className="sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Total comprado</p>
              <p className="mt-1 text-lg font-semibold text-[color:var(--shell-sidebar)] dark:text-zinc-300 sm:text-xl">
                {completedSales.length > 0 ? `$ ${formatMoney(totalVentas)}` : "—"}
              </p>
            </div>
            <div className="sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Garantías</p>
              <p className="mt-1 text-lg font-semibold text-violet-700 dark:text-violet-300 sm:text-xl">
                {warrantySummary.total}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Devoluciones procesadas
              </p>
            </div>
            <div className="sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Créditos pendientes</p>
              <p className="mt-1 text-lg font-semibold text-amber-800 dark:text-amber-200 sm:text-xl">
                {credits.length === 0 ? "—" : `$ ${formatMoney(totalCreditoPendiente)}`}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                {credits.length > 0 ? `${credits.length} ${credits.length === 1 ? "crédito" : "créditos"} · saldo por cobrar` : "Sin créditos"}
              </p>
            </div>
            <div className="min-w-0 flex-1 sm:min-w-[280px] sm:border-l sm:border-slate-100 sm:pl-6 dark:sm:border-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Direcciones</p>
              {addresses.length === 0 ? (
                <p className="mt-1 text-lg font-semibold text-slate-400 dark:text-slate-500 sm:text-xl">—</p>
              ) : (
                <ul className="mt-2 grid grid-cols-1 gap-2 sm:flex">
                  {addresses.map((addr) => (
                    <li key={addr.id} className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/30">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">{addr.label}</span>
                        {addr.is_default && (
                          <span className="shrink-0 rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--shell-sidebar)] dark:bg-zinc-700/40 dark:text-zinc-300">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] font-medium text-slate-600 break-words line-clamp-2 dark:text-slate-400" title={addr.address}>
                        {addr.address}
                      </p>
                      {addr.reference_point && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-500" title={addr.reference_point}>
                          Ref: {addr.reference_point}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Facturas
            </h2>
            <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Ventas con numeración de factura en esta sucursal. Abre el detalle para ver ítems y pagos.
            </p>
            {sales.length === 0 ? (
              <div className="mt-4 flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 py-10 dark:border-slate-700 dark:bg-slate-800/20">
                <svg className="h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="mt-3 text-[15px] font-semibold text-slate-800 dark:text-slate-200">Aún no hay ventas registradas</p>
                <p className="mt-2 max-w-[280px] text-center text-[13px] font-medium leading-snug text-pretty text-slate-500 dark:text-slate-400">
                  Cuando registres ventas con este cliente, aquí verás el detalle.
                </p>
              </div>
            ) : (
              <div className="mt-5 border-t border-slate-100 dark:border-slate-800">
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sales.map((sale) => (
                    <li key={sale.id}>
                      <Link
                        href={`/ventas/${sale.id}`}
                        className="-mx-1 flex items-center justify-between gap-3 rounded-lg px-1 py-3.5 transition-colors hover:bg-slate-50/90 dark:hover:bg-white/[0.04]"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                            Factura {displayInvoiceNumber(sale.invoice_number)}
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                            {formatDate(sale.created_at)} · {formatTime(sale.created_at)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[14px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">$ {formatMoney(Number(sale.total))}</p>
                          <p className={`mt-0.5 text-[11px] font-medium ${sale.status === "completed" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {sale.status === "completed" ? "Completada" : "Anulada"}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>

        <div className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Top productos comprados
          </h2>
            {topProducts.length === 0 ? (
              <div className="mt-4 flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 py-10 dark:border-slate-700 dark:bg-slate-800/20">
                <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200">Sin datos aún</p>
                <p className="mt-2 max-w-[280px] text-center text-[13px] font-medium leading-snug text-pretty text-slate-500 dark:text-slate-400">
                  Cuando las ventas incluyan ítems por producto, aquí verás el top de productos que ha comprado.
                </p>
              </div>
            ) : (
              <div className="mt-5 border-t border-slate-100 dark:border-slate-800">
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topProducts.map((p, index) => (
                    <li key={p.product_id} className="flex items-center justify-between gap-3 py-3.5">
                      <div className="flex min-w-0 items-baseline gap-3">
                        <span className="w-5 shrink-0 text-right text-[12px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
                          {index + 1}.
                        </span>
                        <span className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{p.product_name}</span>
                      </div>
                      <span className="shrink-0 text-[13px] font-medium tabular-nums text-slate-600 dark:text-slate-300">
                        {p.total_quantity} {p.total_quantity === 1 ? "vez" : "veces"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </section>

      <section className="min-w-0 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Créditos
            </h2>
            <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Ventas a crédito y abonos. Solo los de esta sucursal.
            </p>
          </div>
          <Link
            href={`/creditos/cliente/${customer.id}`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-[color:var(--shell-sidebar)] transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-zinc-300 dark:hover:bg-slate-800"
          >
            Ver cartera de créditos
          </Link>
        </div>
        {credits.length === 0 ? (
          <div className="mt-4 flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 py-8 dark:border-slate-700 dark:bg-slate-800/20">
            <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">Sin créditos registrados</p>
            <p className="mt-1 max-w-[320px] text-center text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Si registras una venta a crédito o un crédito manual, aparecerá aquí.
            </p>
            <Link
              href={`/creditos/nuevo?cliente=${customer.id}`}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            >
              Nuevo crédito
            </Link>
          </div>
        ) : (
          <div className="mt-5 border-t border-slate-100 dark:border-slate-800">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {credits.map((c) => {
                const pend = creditRowPending(Number(c.total_amount), Number(c.amount_paid), Boolean(c.cancelled_at));
                const disp = creditLineDisplayStatus(c.status, Number(c.total_amount), Number(c.amount_paid), c.cancelled_at);
                const chip = creditStatusChip(disp);
                const inv = c.sales?.invoice_number ?? null;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/creditos/${c.id}`}
                      className="-mx-1 flex items-center justify-between gap-3 rounded-lg px-1 py-3.5 transition-colors hover:bg-slate-50/90 dark:hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                          #{c.public_ref}
                          {c.title ? <span className="ml-1.5 font-sans text-[12px] font-normal text-slate-600 dark:text-slate-400">· {c.title}</span> : null}
                        </p>
                        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                          Vence {formatDateShort(c.due_date)}
                          {c.sale_id && inv ? (
                            <>
                              {" "}
                              · Factura{" "}
                              <span className="font-medium text-slate-600 dark:text-slate-300">{displayInvoiceNumber(inv)}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[14px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                          {pend > 0.005 && !c.cancelled_at ? (
                            <>$ {formatMoneyCredit(pend)}</>
                          ) : (
                            <span className="text-[13px] font-medium text-slate-500">$ {formatMoneyCredit(Number(c.total_amount))}</span>
                          )}
                        </p>
                        <span className={`mt-0.5 inline-flex ${chip.className}`}>{chip.label}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
