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

function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

type CustomerAddress = {
  id: string;
  label: string;
  address: string;
  reference_point: string | null;
  is_default: boolean;
  display_order: number;
};

const LIFE_STAGE_LABELS: Record<string, string> = {
  niño: "Niño/a",
  adolescente: "Adolescente",
  joven: "Joven",
  joven_adulto: "Joven adulto",
  adulto: "Adulto",
  adulto_mayor: "Adulto mayor",
};
const OCCUPATION_LABELS: Record<string, string> = {
  empleado: "Empleado",
  emprendedor: "Emprendedor",
  estudiante: "Estudiante",
  sin_trabajo: "Sin trabajo",
  jubilado: "Jubilado / pensionado",
  otro: "Otro",
};
const MARITAL_LABELS: Record<string, string> = {
  soltero: "Soltero/a",
  casado: "Casado/a",
  divorciado: "Divorciado/a",
  viudo: "Viudo/a",
  union_libre: "Unión libre",
  otro: "Otro",
};
const FAITH_ORIGIN_LABELS: Record<string, string> = {
  nuevo_en_la_fe: "Nuevo en la fe",
  viene_de_otra_iglesia: "Viene de otra iglesia",
  otro: "Otro",
};

type Customer = {
  id: string;
  name: string;
  cedula: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  life_stage: string | null;
  occupation_status: string | null;
  marital_status: string | null;
  faith_origin: string | null;
  is_baptized: boolean | null;
  notes: string | null;
  created_at: string;
  customer_addresses: CustomerAddress[] | null;
};

type SaleRow = {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  created_at: string;
  income_type_id: string | null;
  income_types: { name: string }[] | { name: string } | null;
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
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
        .select("id, name, cedula, email, phone, birth_date, life_stage, occupation_status, marital_status, faith_origin, is_baptized, notes, created_at, customer_addresses(id, label, address, reference_point, is_default, display_order)")
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
        .select("id, invoice_number, total, status, created_at, income_type_id, income_types(name)")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      const rows = (salesData ?? []) as Array<SaleRow & { income_types?: { name: string }[] | { name: string } | null }>;
      setSales(rows.map((s) => ({
        ...s,
        income_types: Array.isArray(s.income_types) ? (s.income_types[0] || null) : s.income_types ?? null,
      })));
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
        <p className="text-[14px] text-slate-600 dark:text-slate-400">Miembro no encontrado.</p>
        <Link href="/clientes" className="text-[14px] font-medium text-ov-pink hover:underline">
          Volver a miembros
        </Link>
      </div>
    );
  }

  const addresses = (customer.customer_addresses ?? []).sort(
    (a, b) => (a.is_default ? -1 : 0) - (b.is_default ? -1 : 0) || a.display_order - b.display_order
  );
  const subtitleParts = [customer.cedula ? `CC ${customer.cedula}` : null, customer.phone || null, customer.email ? customer.email : null].filter(Boolean);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Sin datos de contacto";

  return (
    <div className="min-w-0 space-y-6">
      {/* Card: nombre + resumen y acciones */}
      <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
        <Breadcrumb
          items={[
            { label: "Miembros", href: "/clientes" },
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
          <div className="flex shrink-0 items-center gap-2 print:hidden">
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
            <Link
              href="/clientes"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Volver a miembros"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-6">
          {/* Datos del miembro: toda la info agregada al crearlo */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Datos del miembro</p>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Cédula</dt><dd className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200">{customer.cedula ? `CC ${customer.cedula}` : "—"}</dd></div>
              <div><dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Email</dt><dd className="mt-0.5 truncate text-[13px] font-medium text-slate-800 dark:text-slate-200" title={customer.email ?? undefined}>{customer.email || "—"}</dd></div>
              <div><dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Teléfono</dt><dd className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200">{customer.phone || "—"}</dd></div>
              <div><dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Fecha de nacimiento</dt><dd className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200">{customer.birth_date ? `${formatDate(customer.birth_date)}${ageFromBirthDate(customer.birth_date) != null ? ` (${ageFromBirthDate(customer.birth_date)} años)` : ""}` : "—"}</dd></div>
              <div><dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Etapa de vida</dt><dd className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200">{customer.life_stage ? (LIFE_STAGE_LABELS[customer.life_stage] ?? customer.life_stage) : "—"}</dd></div>
              <div><dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Situación laboral</dt><dd className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200">{customer.occupation_status ? (OCCUPATION_LABELS[customer.occupation_status] ?? customer.occupation_status) : "—"}</dd></div>
              <div><dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Estado civil</dt><dd className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200">{customer.marital_status ? (MARITAL_LABELS[customer.marital_status] ?? customer.marital_status) : "—"}</dd></div>
              <div><dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Origen en la fe</dt><dd className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200">{customer.faith_origin ? (FAITH_ORIGIN_LABELS[customer.faith_origin] ?? customer.faith_origin) : "—"}</dd></div>
              <div><dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Bautizado/a</dt><dd className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200">{customer.is_baptized ? "Sí" : "No"}</dd></div>
            </dl>
            {customer.notes && customer.notes.trim() && (
              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Notas</dt>
                <dd className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{customer.notes.trim()}</dd>
              </div>
            )}
            {addresses.length > 0 && (
              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Direcciones</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                      <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{addr.label}</span>
                      {addr.is_default && <span className="ml-1.5 rounded bg-ov-pink/15 px-1 py-0.5 text-[10px] font-medium text-ov-pink dark:bg-ov-pink/20">Principal</span>}
                      <p className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-300">{addr.address}</p>
                      {addr.reference_point && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Ref: {addr.reference_point}</p>}
                    </div>
                  ))}
                </dd>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="min-w-0">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Registro de donaciones
          </h2>
          {sales.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-700 min-h-[200px]">
              <svg className="h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-3 text-[14px] font-medium text-slate-600 dark:text-slate-400">Aún no hay donaciones registradas</p>
              <p className="mt-1 max-w-[280px] text-center text-[13px] text-slate-500 dark:text-slate-500">
                Cuando registres donaciones o diezmos de este miembro, aquí verás el detalle.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {sales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/30"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{sale.invoice_number}</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">
                      {formatDate(sale.created_at)} · {formatTime(sale.created_at)}
                      {sale.income_types?.name && (
                        <span className="ml-1.5 rounded bg-slate-200/80 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-200">
                          {sale.income_types.name}
                        </span>
                      )}
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
      </section>

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={sales.length === 0 ? "Eliminar miembro" : "Desactivar miembro"}
        message={sales.length === 0
          ? `¿Estás seguro de que quieres eliminar a "${customer.name}"? Se borrarán también sus direcciones.`
          : `Este miembro tiene ${sales.length} ${sales.length === 1 ? "donación registrada" : "donaciones registradas"}. No se puede eliminar para no perder el historial. Se desactivará y dejará de aparecer en la lista de miembros.`}
        onConfirm={handleDelete}
        loading={deleting}
        ariaTitle={sales.length === 0 ? `Eliminar miembro ${customer.name}` : `Desactivar miembro ${customer.name}`}
      />
    </div>
  );
}
