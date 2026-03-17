"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activities";
import Breadcrumb from "@/app/components/Breadcrumb";
import DatePickerCard from "@/app/components/DatePickerCard";

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

/** Etapa de vida sugerida por edad (para organizar ministerios). */
export function lifeStageFromAge(age: number): string {
  if (age <= 12) return "niño";
  if (age <= 17) return "adolescente";
  if (age <= 25) return "joven";
  if (age <= 39) return "joven_adulto";
  if (age <= 59) return "adulto";
  return "adulto_mayor";
}

const LIFE_STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "No especificado" },
  { value: "niño", label: "Niño/a (0-12)" },
  { value: "adolescente", label: "Adolescente (13-17)" },
  { value: "joven", label: "Joven (18-25)" },
  { value: "joven_adulto", label: "Joven adulto (26-39)" },
  { value: "adulto", label: "Adulto (40-59)" },
  { value: "adulto_mayor", label: "Adulto mayor (60+)" },
];

const OCCUPATION_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "No especificado" },
  { value: "empleado", label: "Empleado" },
  { value: "emprendedor", label: "Emprendedor" },
  { value: "estudiante", label: "Estudiante" },
  { value: "sin_trabajo", label: "Sin trabajo" },
  { value: "jubilado", label: "Jubilado / pensionado" },
  { value: "otro", label: "Otro" },
];

const MARITAL_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "No especificado" },
  { value: "soltero", label: "Soltero/a" },
  { value: "casado", label: "Casado/a" },
  { value: "divorciado", label: "Divorciado/a" },
  { value: "viudo", label: "Viudo/a" },
  { value: "union_libre", label: "Unión libre" },
  { value: "otro", label: "Otro" },
];

const FAITH_ORIGIN_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "No especificado" },
  { value: "nuevo_en_la_fe", label: "Nuevo en la fe" },
  { value: "viene_de_otra_iglesia", label: "Viene de otra iglesia" },
  { value: "otro", label: "Otro" },
];

export default function NewCustomerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cedula, setCedula] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [lifeStage, setLifeStage] = useState("");
  const [occupationStatus, setOccupationStatus] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [faithOrigin, setFaithOrigin] = useState("");
  const [isBaptized, setIsBaptized] = useState(false);
  const [notes, setNotes] = useState("");
  const [addresses, setAddresses] = useState<AddressEntry[]>([newAddressEntry()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const { data: customer, error: insertError } = await supabase
      .from("customers")
      .insert({
        organization_id: userRow.organization_id,
        name: nameTrim,
        cedula: cedula.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        birth_date: birthDate.trim() ? birthDate.trim() : null,
        life_stage: lifeStage.trim() || null,
        occupation_status: occupationStatus.trim() || null,
        marital_status: maritalStatus.trim() || null,
        faith_origin: faithOrigin.trim() || null,
        is_baptized: isBaptized,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message || "No se pudo crear el miembro.");
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

    const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
    try {
      await logActivity(supabase, {
        organizationId: userRow.organization_id,
        branchId: ub?.branch_id ?? null,
        userId: user.id,
        action: "customer_created",
        entityType: "customer",
        entityId: customer?.id ?? null,
        summary: `Creó el miembro ${nameTrim}`,
        metadata: {
          name: nameTrim,
          email: email.trim() || null,
          phone: phone.trim() || null,
          cedula: cedula.trim() || null,
          addressesSummary: addressesSummary ?? null,
          birth_date: birthDate.trim() || null,
          occupation_status: occupationStatus.trim() || null,
          marital_status: maritalStatus.trim() || null,
          faith_origin: faithOrigin.trim() || null,
          is_baptized: isBaptized,
        },
      });
    } catch {
      // No bloquear el flujo si falla el registro de actividad
    }

    router.push("/clientes");
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Miembros", href: "/clientes" }, { label: "Nuevo miembro" }]} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Nuevo miembro
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registra un nuevo miembro. Puedes añadir varias direcciones (casa, oficina, etc.).
            </p>
          </div>
          <Link
            href="/clientes"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a miembros"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Datos personales
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="customer-name" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. María López"
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Estado personal
            </p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              Estos datos ayudan a conocer a la congregación (promedio de edad, perfiles, etc.).
            </p>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="customer-birthdate" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Fecha de nacimiento
                  </label>
                  <DatePickerCard
                    id="customer-birthdate"
                    value={birthDate ? new Date(birthDate + "T12:00:00") : null}
                    onChange={(d) => {
                      const v = d ? d.toISOString().slice(0, 10) : "";
                      setBirthDate(v);
                      const age = v ? ageFromBirthDate(v) : null;
                      if (age != null) setLifeStage(lifeStageFromAge(age));
                    }}
                    max={new Date()}
                    placeholder="dd/mm/aaaa"
                    allowClear={true}
                    aria-label="Fecha de nacimiento"
                    triggerClassName="h-10 w-full min-w-0"
                    className="w-full"
                  />
                  {birthDate && ageFromBirthDate(birthDate) != null && (
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      Edad: {ageFromBirthDate(birthDate)} años
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="customer-life-stage" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Etapa de vida
                  </label>
                  <select
                    id="customer-life-stage"
                    value={lifeStage}
                    onChange={(e) => setLifeStage(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {LIFE_STAGE_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Para organizar ministerios (niños, jóvenes, etc.). Se sugiere por fecha de nacimiento si la indicas.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="customer-occupation" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Situación laboral
                  </label>
                  <select
                    id="customer-occupation"
                    value={occupationStatus}
                    onChange={(e) => setOccupationStatus(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {OCCUPATION_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="customer-marital" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Estado civil
                  </label>
                  <select
                    id="customer-marital"
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {MARITAL_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-0 flex-1 max-w-xs">
                  <label htmlFor="customer-faith-origin" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Origen en la fe
                  </label>
                  <select
                    id="customer-faith-origin"
                    value={faithOrigin}
                    onChange={(e) => setFaithOrigin(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {FAITH_ORIGIN_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 pb-1">
                  <input
                    type="checkbox"
                    checked={isBaptized}
                    onChange={(e) => setIsBaptized(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-ov-pink focus:ring-ov-pink/30"
                  />
                  <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Bautizado/a</span>
                </label>
              </div>
              <div>
                <label htmlFor="customer-notes" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Notas
                </label>
                <textarea
                  id="customer-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Ministerio de alabanza, viene los domingos, contacto de emergencia…"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-y min-h-[72px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Direcciones
                </p>
                <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
                  Opcional. Casa, oficina, etc. Útil para visitas o envíos.
                </p>
              </div>
              <button
                type="button"
                onClick={addAddress}
                className="shrink-0 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30"
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
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-y min-h-[60px]"
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
                        placeholder="Ej. Frente al parque, casa blanca."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-y min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen
            </p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {name.trim() || "Miembro nuevo"}
                </p>
                <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
                  {cedula.trim() && <p><span className="font-medium">Cédula:</span> {cedula.trim()}</p>}
                  {phone.trim() && <p><span className="font-medium">Teléfono:</span> {phone.trim()}</p>}
                  {email.trim() && <p><span className="font-medium">Email:</span> {email.trim()}</p>}
                  {birthDate && ageFromBirthDate(birthDate) != null && (
                    <p><span className="font-medium">Edad:</span> {ageFromBirthDate(birthDate)} años</p>
                  )}
                  {lifeStage && (
                    <p>
                      <span className="font-medium">Etapa:</span>{" "}
                      {LIFE_STAGE_OPTIONS.find((o) => o.value === lifeStage)?.label ?? lifeStage}
                    </p>
                  )}
                  {(occupationStatus || maritalStatus || faithOrigin || isBaptized) && (
                    <p>
                      <span className="font-medium">Áreas de vida:</span>{" "}
                      {[
                        occupationStatus && (OCCUPATION_OPTIONS.find((o) => o.value === occupationStatus)?.label ?? occupationStatus),
                        maritalStatus && (MARITAL_STATUS_OPTIONS.find((o) => o.value === maritalStatus)?.label ?? maritalStatus),
                        faithOrigin && (FAITH_ORIGIN_OPTIONS.find((o) => o.value === faithOrigin)?.label ?? faithOrigin),
                        isBaptized && "Bautizado/a",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {notes.trim() && (
                    <p className="line-clamp-2"><span className="font-medium">Notas:</span> {notes.trim()}</p>
                  )}
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
                    Completa al menos el nombre. El resto es opcional.
                  </p>
                )}
              </div>
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
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:opacity-50 disabled:pointer-events-none dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              >
                {saving ? "Guardando…" : "Crear miembro"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
