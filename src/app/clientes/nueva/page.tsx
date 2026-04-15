"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activities";
import Breadcrumb from "@/app/components/Breadcrumb";
import { formatCedulaForStorage, normalizeCedulaForUniqueness } from "@/lib/customer-cedula";
import { workspaceFormInputMdClass } from "@/lib/workspace-field-classes";

const LABEL_OPTIONS = [
  { value: "Casa", label: "Casa" },
  { value: "Oficina", label: "Oficina" },
  { value: "Otro", label: "Otro" },
] as const;

type AddressEntry = {
  id: string;
  label: string;
  labelCustom: string;
  address: string;
  referencePoint: string;
};

function newAddressEntry(): AddressEntry {
  return {
    id: crypto.randomUUID(),
    label: "Casa",
    labelCustom: "",
    address: "",
    referencePoint: "",
  };
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cedula, setCedula] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<AddressEntry[]>([newAddressEntry()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Mismo estilo que «Nueva factura» (`/ventas/nueva`): cards gris/azulado en oscuro + campos del workspace. */
  const cardClass =
    "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800";
  const inputClass = workspaceFormInputMdClass;
  const textareaClass = `${workspaceFormInputMdClass} !h-auto resize-y px-3 py-2 text-[13px]`;
  const compactFieldClass = `${workspaceFormInputMdClass} !h-9 text-[13px]`;

  function addAddress() {
    setAddresses((prev) => [...prev, newAddressEntry()]);
  }

  function removeAddress(id: string) {
    setAddresses((prev) => (prev.length <= 1 ? prev : prev.filter((a) => a.id !== id)));
  }

  function updateAddress(id: string, updates: Partial<AddressEntry>) {
    setAddresses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nameTrim = name.trim();
    if (!nameTrim) {
      setError("El nombre es obligatorio.");
      return;
    }

    const validAddresses = addresses.filter((a) => a.address.trim() !== "");
    if (validAddresses.length === 0 && addresses.some((a) => a.referencePoint.trim() !== "")) {
      setError("Si indicas punto de referencia, añade también la dirección completa.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Debes iniciar sesión.");
      setSaving(false);
      return;
    }
    const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    if (!userRow?.organization_id) {
      setError("No se encontró tu organización.");
      setSaving(false);
      return;
    }
    const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
    if (!ub?.branch_id) {
      setError("No encontramos una sucursal activa para tu usuario.");
      setSaving(false);
      return;
    }

    const cedulaStored = formatCedulaForStorage(cedula);
    const cedulaNorm = normalizeCedulaForUniqueness(cedula);
    if (cedulaNorm) {
      const { data: existingCedula } = await supabase
        .from("customers")
        .select("id")
        .eq("branch_id", ub.branch_id)
        .eq("cedula_norm", cedulaNorm)
        .maybeSingle();
      if (existingCedula) {
        setError("Ya existe un cliente con esta cédula en esta sucursal.");
        setSaving(false);
        return;
      }
    }

    const { data: customer, error: insertError } = await supabase
      .from("customers")
      .insert({
        organization_id: userRow.organization_id,
        branch_id: ub.branch_id,
        name: nameTrim,
        cedula: cedulaStored,
        email: email.trim() || null,
        phone: phone.trim() || null,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        setError("Ya existe un cliente con esta cédula en esta sucursal.");
      } else {
        setError(insertError.message || "No se pudo crear el cliente.");
      }
      setSaving(false);
      return;
    }

    if (validAddresses.length > 0 && customer?.id) {
      for (let i = 0; i < validAddresses.length; i++) {
        const a = validAddresses[i];
        const label = a.label === "Otro" ? (a.labelCustom.trim() || "Otro") : a.label;
        const { error: addrError } = await supabase.from("customer_addresses").insert({
          customer_id: customer.id,
          label,
          address: a.address.trim(),
          reference_point: a.referencePoint.trim() || null,
          is_default: i === 0,
          display_order: i,
        });
        if (addrError) {
          setError(addrError.message || "Error al guardar una dirección.");
          setSaving(false);
          return;
        }
      }
    }

    const addressLabels = validAddresses.map((a) => (a.label === "Otro" ? (a.labelCustom.trim() || "Otro") : a.label));
    const addressesSummary =
      addressLabels.length === 0
        ? null
        : addressLabels.length === 1
          ? `1 dirección: ${addressLabels[0]}`
          : `${addressLabels.length} direcciones: ${addressLabels.join(", ")}`;

    try {
      await logActivity(supabase, {
        organizationId: userRow.organization_id,
        branchId: ub?.branch_id ?? null,
        userId: user.id,
        action: "customer_created",
        entityType: "customer",
        entityId: customer?.id ?? null,
        summary: `Creó el cliente ${nameTrim}`,
        metadata: {
          name: nameTrim,
          email: email.trim() || null,
          phone: phone.trim() || null,
          cedula: cedula.trim() || null,
          addressesSummary: addressesSummary ?? null,
        },
      });
    } catch {
      // No bloquear el flujo si falla el registro de actividad
    }

    router.push("/clientes");
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb items={[{ label: "Clientes", href: "/clientes" }, { label: "Nuevo cliente" }]} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Nuevo cliente
            </h1>
            <p className="mt-1 text-[13px] font-medium leading-snug text-pretty text-slate-500 dark:text-slate-400">
              Registra un nuevo cliente. Puedes añadir varias direcciones (casa, oficina, etc.).
            </p>
          </div>
          <Link
            href="/clientes"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a clientes"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]" aria-label="Nuevo cliente">
        <div className="space-y-4">
          <div className={cardClass}>
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Datos personales
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="customer-name" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Nombre completo <span className="text-[color:var(--shell-sidebar)] dark:text-zinc-300">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. María López"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="customer-cedula" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Cédula
                </label>
                <input
                  id="customer-cedula"
                  type="text"
                  inputMode="numeric"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej. 1234567890"
                  maxLength={15}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="customer-phone" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Teléfono
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 312 000 0000"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="customer-email" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Correo electrónico
                </label>
                <input
                  id="customer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej. maria@ejemplo.com"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Direcciones
                </p>
                <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
                  Casa, oficina, casa de los abuelos… Añade las que necesites. Dirección completa y punto de referencia para que el repartidor ubique fácil.
                </p>
              </div>
              <button
                type="button"
                onClick={addAddress}
                className="shrink-0 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Añadir dirección
              </button>
            </div>
            <div className="mt-4 space-y-6">
              {addresses.map((addr, index) => (
                <div
                  key={addr.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/55"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Dirección {index + 1}
                    </span>
                    {addresses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAddress(addr.id)}
                        className="text-[12px] font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[12px] font-bold text-slate-700 dark:text-slate-300">
                          Tipo
                        </label>
                        <select
                          value={addr.label}
                          onChange={(e) => updateAddress(addr.id, { label: e.target.value })}
                          className={compactFieldClass}
                        >
                          {LABEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {addr.label === "Otro" && (
                        <div>
                          <label className="mb-1.5 block text-[12px] font-bold text-slate-700 dark:text-slate-300">
                            Especificar
                          </label>
                          <input
                            type="text"
                            value={addr.labelCustom}
                            onChange={(e) => updateAddress(addr.id, { labelCustom: e.target.value })}
                            placeholder="Ej. Trabajo, Finca"
                            className={compactFieldClass}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-700 dark:text-slate-300">
                        Dirección completa
                      </label>
                      <textarea
                        rows={2}
                        value={addr.address}
                        onChange={(e) => updateAddress(addr.id, { address: e.target.value })}
                        placeholder="Ej. Cra 10 # 20-30, Apto 502, barrio Centro. Portería azul."
                        className={`${textareaClass} min-h-[60px]`}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-700 dark:text-slate-300">
                        Punto de referencia
                      </label>
                      <textarea
                        rows={1}
                        value={addr.referencePoint}
                        onChange={(e) => updateAddress(addr.id, { referencePoint: e.target.value })}
                        placeholder="Ej. Frente al parque, casa blanca portón negro."
                        className={`${textareaClass} min-h-[44px]`}
                      />
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Para que el domiciliario encuentre el lugar (esquina, color de la casa, negocio cercano, etc.).
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={cardClass}>
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen
            </p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {name.trim() || "Cliente nuevo"}
                </p>
                <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
                  {cedula.trim() && <p><span className="font-medium">Cédula:</span> {cedula.trim()}</p>}
                  {phone.trim() && <p><span className="font-medium">Teléfono:</span> {phone.trim()}</p>}
                  {email.trim() && <p><span className="font-medium">Email:</span> {email.trim()}</p>}
                  {(() => {
                    const valid = addresses.filter((a) => a.address.trim() !== "");
                    if (valid.length === 0) return <p><span className="font-medium">Direcciones:</span> ninguna</p>;
                    return (
                      <p>
                        <span className="font-medium">Direcciones:</span> {valid.length} {valid.length === 1 ? "dirección" : "direcciones"}
                        {valid.length > 0 && (
                          <span className="ml-1 text-slate-500 dark:text-slate-500">
                            ({valid.map((a) => a.label === "Otro" ? (a.labelCustom.trim() || "Otro") : a.label).join(", ")})
                          </span>
                        )}
                      </p>
                    );
                  })()}
                </div>
                {!name.trim() && (
                  <p className="mt-2 text-slate-500 dark:text-slate-500">
                    Completa al menos el nombre. Las direcciones son opcionales.
                  </p>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                En cada pedido con envío podrás elegir a qué dirección enviar.
              </p>
            </div>

            {error && (
              <p className="mt-3 text-[13px] font-medium text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="w-full rounded-xl bg-[color:var(--shell-sidebar)] py-3 text-[15px] font-bold text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:pointer-events-none disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Crear cliente"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
