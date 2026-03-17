"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

function lifeStageFromAge(age: number): string {
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

type CustomerAddressRow = {
  id: string;
  label: string;
  address: string;
  reference_point: string | null;
  is_default: boolean;
  display_order: number;
};

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialDataRef = useRef<{ name: string; cedula: string; email: string; phone: string; addressesCount: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("customers")
        .select("id, name, cedula, email, phone, birth_date, life_stage, occupation_status, marital_status, faith_origin, is_baptized, notes, customer_addresses(id, label, address, reference_point, is_default, display_order)")
        .eq("id", id)
        .single();

      if (cancelled) return;
      if (fetchError || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setName(data.name ?? "");
      setCedula(data.cedula ?? "");
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setBirthDate(data.birth_date ? String(data.birth_date).slice(0, 10) : "");
      setLifeStage(data.life_stage ?? "");
      setOccupationStatus(data.occupation_status ?? "");
      setMaritalStatus(data.marital_status ?? "");
      setFaithOrigin(data.faith_origin ?? "");
      setIsBaptized(!!data.is_baptized);
      setNotes(data.notes ?? "");
      const addrs = (data.customer_addresses ?? []) as CustomerAddressRow[];
      const sorted = [...addrs].sort((a, b) => (a.is_default ? -1 : 0) - (b.is_default ? -1 : 0) || a.display_order - b.display_order);
      if (sorted.length === 0) {
        setAddresses([newAddressEntry()]);
      } else {
        setAddresses(
          sorted.map((a) => ({
            id: a.id,
            label: LABEL_OPTIONS.some((o) => o.value === a.label) ? a.label : "Otro",
            labelCustom: LABEL_OPTIONS.some((o) => o.value === a.label) ? "" : a.label,
            address: a.address ?? "",
            referencePoint: a.reference_point ?? "",
          }))
        );
      }
      initialDataRef.current = {
        name: data.name ?? "",
        cedula: data.cedula ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        addressesCount: sorted.length,
      };
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  function addAddress() {
    setAddresses((prev) => [...prev, newAddressEntry()]);
  }

  function removeAddress(addrId: string) {
    setAddresses((prev) => (prev.length <= 1 ? prev : prev.filter((a) => a.id !== addrId)));
  }

  function updateAddress(addrId: string, updates: Partial<AddressEntry>) {
    setAddresses((prev) => prev.map((a) => (a.id === addrId ? { ...a, ...updates } : a)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
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

    const { error: updateError } = await supabase
      .from("customers")
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message || "No se pudo actualizar el miembro.");
      setSaving(false);
      return;
    }

    await supabase.from("customer_addresses").delete().eq("customer_id", id);

    for (let i = 0; i < validAddresses.length; i++) {
      const a = validAddresses[i];
      const label = a.label === "Otro" ? (a.labelCustom.trim() || "Otro") : a.label;
      const { error: addrError } = await supabase.from("customer_addresses").insert({
        customer_id: id,
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

    const initial = initialDataRef.current;
    const changes: { field: string; label: string; from: string; to: string }[] = [];
    if (initial) {
      const prevName = (initial.name ?? "").trim();
      if (prevName !== nameTrim) {
        changes.push({ field: "name", label: "Nombre", from: prevName || "—", to: nameTrim });
      }
      const prevCedula = (initial.cedula ?? "").trim();
      const newCedula = cedula.trim();
      if (prevCedula !== newCedula) {
        changes.push({ field: "cedula", label: "Cédula", from: prevCedula || "—", to: newCedula || "—" });
      }
      const prevEmail = (initial.email ?? "").trim();
      const newEmail = email.trim();
      if (prevEmail !== newEmail) {
        changes.push({ field: "email", label: "Correo", from: prevEmail || "—", to: newEmail || "—" });
      }
      const prevPhone = (initial.phone ?? "").trim();
      const newPhone = phone.trim();
      if (prevPhone !== newPhone) {
        changes.push({ field: "phone", label: "Teléfono", from: prevPhone || "—", to: newPhone || "—" });
      }
      if (initial.addressesCount !== validAddresses.length) {
        changes.push({
          field: "addresses",
          label: "Direcciones",
          from: initial.addressesCount === 0 ? "ninguna" : `${initial.addressesCount} dirección${initial.addressesCount !== 1 ? "es" : ""}`,
          to: validAddresses.length === 0 ? "ninguna" : `${validAddresses.length} dirección${validAddresses.length !== 1 ? "es" : ""}`,
        });
      }
    }
    const changesSummary =
      changes.length === 0
        ? "datos"
        : changes.length === 1
          ? changes[0]!.label.toLowerCase()
          : changes.map((c) => c.label.toLowerCase()).slice(0, -1).join(", ") + " y " + changes[changes.length - 1]!.label.toLowerCase();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data: userRow } = authUser ? await supabase.from("users").select("organization_id").eq("id", authUser.id).single() : { data: null };
    const { data: ub } = authUser ? await supabase.from("user_branches").select("branch_id").eq("user_id", authUser.id).limit(1).single() : { data: null };
    try {
      if (userRow?.organization_id && authUser) {
        await logActivity(supabase, {
          organizationId: userRow.organization_id,
          branchId: ub?.branch_id ?? null,
          userId: authUser.id,
          action: "customer_updated",
          entityType: "customer",
          entityId: id,
          summary: `Editó el miembro ${nameTrim}`,
          metadata: {
            name: nameTrim,
            changesSummary,
            changes: changes.map((c) => ({ field: c.field, label: c.label, from: c.from, to: c.to })),
          },
        });
      }
    } catch {
      // No bloquear el flujo si falla el registro de actividad
    }

    router.push(`/clientes/${id}`);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[200px] items-center justify-center py-24">
          <p className="font-logo text-lg font-bold tracking-tight text-slate-800 dark:text-white">NOU<span className="animate-pulse">...</span></p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">Miembro no encontrado.</p>
        <Link href="/clientes" className="text-[14px] font-medium text-ov-pink hover:underline">Volver a miembros</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Miembros", href: "/clientes" },
            { label: name || "Miembro", href: id ? `/clientes/${id}` : undefined },
            { label: "Editar" },
          ]}
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">Editar miembro</h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">Modifica los datos y direcciones del miembro.</p>
          </div>
          <Link
            href={`/clientes/${id}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver al detalle"
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
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Datos personales</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="customer-name" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Nombre completo <span className="text-red-500">*</span></label>
                <input id="customer-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. María López" required className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label htmlFor="customer-cedula" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Cédula</label>
                <input id="customer-cedula" type="text" inputMode="numeric" value={cedula} onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))} placeholder="Ej. 1234567890" maxLength={15} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label htmlFor="customer-phone" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Teléfono</label>
                <input id="customer-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 312 000 0000" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label htmlFor="customer-email" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Correo electrónico</label>
                <input id="customer-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ej. maria@ejemplo.com" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Estado personal</p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Edad, estado civil y situación laboral o estudiantil.</p>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="customer-birthdate" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Fecha de nacimiento</label>
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
                  {birthDate && ageFromBirthDate(birthDate) != null && <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Edad: {ageFromBirthDate(birthDate)} años</p>}
                </div>
                <div>
                  <label htmlFor="customer-life-stage" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Etapa de vida</label>
                  <select id="customer-life-stage" value={lifeStage} onChange={(e) => setLifeStage(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                    {LIFE_STAGE_OPTIONS.map((opt) => (<option key={opt.value || "none"} value={opt.value}>{opt.label}</option>))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Para organizar ministerios (niños, jóvenes, etc.).</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="customer-occupation" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Situación laboral</label>
                  <select id="customer-occupation" value={occupationStatus} onChange={(e) => setOccupationStatus(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                    {OCCUPATION_OPTIONS.map((opt) => (<option key={opt.value || "none"} value={opt.value}>{opt.label}</option>))}
                  </select>
                </div>
                <div>
                  <label htmlFor="customer-marital" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Estado civil</label>
                  <select id="customer-marital" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                    {MARITAL_STATUS_OPTIONS.map((opt) => (<option key={opt.value || "none"} value={opt.value}>{opt.label}</option>))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-0 flex-1 max-w-xs">
                  <label htmlFor="customer-faith-origin" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Origen en la fe</label>
                  <select id="customer-faith-origin" value={faithOrigin} onChange={(e) => setFaithOrigin(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                    {FAITH_ORIGIN_OPTIONS.map((opt) => (<option key={opt.value || "none"} value={opt.value}>{opt.label}</option>))}
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 pb-1">
                  <input type="checkbox" checked={isBaptized} onChange={(e) => setIsBaptized(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-ov-pink focus:ring-ov-pink/30" />
                  <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Bautizado/a</span>
                </label>
              </div>
              <div>
                <label htmlFor="customer-notes" className="mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300">Notas</label>
                <textarea id="customer-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Ministerio de alabanza, contacto de emergencia…" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-y min-h-[72px]" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Direcciones</p>
                <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">Opcional. Casa, oficina, etc. Útil para visitas o envíos.</p>
              </div>
              <button type="button" onClick={addAddress} className="shrink-0 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Añadir dirección
              </button>
            </div>
            <div className="mt-4 space-y-6">
              {addresses.map((addr, index) => (
                <div key={addr.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dirección {index + 1}</span>
                    {addresses.length > 1 && (
                      <button type="button" onClick={() => removeAddress(addr.id)} className="text-[12px] font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">Quitar</button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[12px] font-bold text-slate-700 dark:text-slate-300">Tipo</label>
                        <select value={addr.label} onChange={(e) => updateAddress(addr.id, { label: e.target.value })} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                          {LABEL_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                        </select>
                      </div>
                      {addr.label === "Otro" && (
                        <div>
                          <label className="mb-1.5 block text-[12px] font-bold text-slate-700 dark:text-slate-300">Especificar</label>
                          <input type="text" value={addr.labelCustom} onChange={(e) => updateAddress(addr.id, { labelCustom: e.target.value })} placeholder="Ej. Trabajo, Finca" className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-700 dark:text-slate-300">Dirección completa</label>
                      <textarea rows={2} value={addr.address} onChange={(e) => updateAddress(addr.id, { address: e.target.value })} placeholder="Ej. Cra 10 # 20-30, Apto 502" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-y min-h-[60px]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-700 dark:text-slate-300">Punto de referencia</label>
                      <textarea rows={1} value={addr.referencePoint} onChange={(e) => updateAddress(addr.id, { referencePoint: e.target.value })} placeholder="Ej. Frente al parque" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-y min-h-[44px]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Guardar</p>
            {error && <p className="mt-3 text-[13px] font-medium text-red-600 dark:text-red-400" role="alert">{error}</p>}
            <div className="mt-4 flex flex-col gap-2">
              <button type="submit" disabled={saving || !name.trim()} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white hover:bg-ov-pink-hover disabled:opacity-50 disabled:pointer-events-none dark:bg-ov-pink dark:hover:bg-ov-pink-hover">
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
              <Link href={`/clientes/${id}`} className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                Cancelar
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
