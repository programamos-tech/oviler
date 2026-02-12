"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

type DeliveryPerson = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  active: boolean;
};

export default function ConfigurarSucursalPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [hasBodega, setHasBodega] = useState(false);
  const [responsableIva, setResponsableIva] = useState(false);
  const [invoicePrintType, setInvoicePrintType] = useState<"tirilla" | "block">("block");
  const [invoiceCancelRequiresApproval, setInvoiceCancelRequiresApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados para domiciliarios
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [editingPerson, setEditingPerson] = useState<DeliveryPerson | null>(null);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonCode, setNewPersonCode] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) return;
      setBranchId(ub.branch_id);
      const { data: branch } = await supabase.from("branches").select("has_bodega, responsable_iva, invoice_print_type, invoice_cancel_requires_approval").eq("id", ub.branch_id).single();
      if (branch && !cancelled) {
        setHasBodega(!!branch.has_bodega);
        setResponsableIva(!!branch.responsable_iva);
        setInvoicePrintType(branch.invoice_print_type === "tirilla" ? "tirilla" : "block");
        setInvoiceCancelRequiresApproval(!!branch.invoice_cancel_requires_approval);
      }
      
      // Cargar domiciliarios
      const { data: persons } = await supabase
        .from("delivery_persons")
        .select("id, name, code, phone, active")
        .eq("branch_id", ub.branch_id)
        .order("code", { ascending: true });
      if (!cancelled && persons) {
        setDeliveryPersons(persons as DeliveryPerson[]);
      }
      
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSave() {
    if (!branchId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("branches").update({
      has_bodega: hasBodega,
      responsable_iva: responsableIva,
      invoice_print_type: invoicePrintType,
      invoice_cancel_requires_approval: invoiceCancelRequiresApproval,
      updated_at: new Date().toISOString(),
    }).eq("id", branchId);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Configurar sucursal
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Logo, NIT, nombre, dirección, teléfono, tipo de factura e impuestos.
            </p>
          </div>
          <Link
            href="/sucursales"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a sucursales"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Logo
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <span className="text-[12px] font-medium text-slate-400">Sin logo</span>
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                />
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  Logo de la sucursal para facturas y reportes.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Datos de la sucursal
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>Nombre de la sucursal <span className="text-ov-pink">*</span></label>
                <input placeholder="Ej. Sucursal Principal" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>NIT <span className="text-ov-pink">*</span></label>
                <input placeholder="Ej. 900.123.456-7" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Dirección</label>
                <input placeholder="Ej. Calle 50 # 10-20" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input placeholder="Ej. 601 123 4567" className={inputClass} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Impresión de facturas
            </p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              Define cómo se imprimirá la factura al dar &quot;Imprimir&quot; en el detalle de la venta.
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="invoice_print_type"
                  value="tirilla"
                  checked={invoicePrintType === "tirilla"}
                  onChange={() => setInvoicePrintType("tirilla")}
                  disabled={loading}
                  className="h-4 w-4 border-slate-300 text-ov-pink focus:ring-ov-pink/30"
                />
                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Tirilla (papel térmico)
                </span>
              </label>
              <p className="ml-6 text-[12px] text-slate-500 dark:text-slate-400">
                Papel estrecho (80 mm), ideal para impresoras térmicas.
              </p>
              <label className="mt-2 flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="invoice_print_type"
                  value="block"
                  checked={invoicePrintType === "block"}
                  onChange={() => setInvoicePrintType("block")}
                  disabled={loading}
                  className="h-4 w-4 border-slate-300 text-ov-pink focus:ring-ov-pink/30"
                />
                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Hoja de block (carta / A4)
                </span>
              </label>
              <p className="ml-6 text-[12px] text-slate-500 dark:text-slate-400">
                Hoja tamaño carta o A4, con encabezado legal y detalle completo.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Anulaciones de factura
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={invoiceCancelRequiresApproval}
                onChange={(e) => setInvoiceCancelRequiresApproval(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30"
              />
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                Las anulaciones de factura requieren aprobación del administrador
              </span>
            </label>
            <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
              Si está marcado, al anular una factura la solicitud quedará pendiente hasta que un administrador u owner la apruebe. Si no, la anulación se aplica de inmediato.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Impuestos
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={responsableIva}
                onChange={(e) => setResponsableIva(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30"
              />
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                Es responsable de IVA
              </span>
            </label>
            <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
              Si está marcado, al crear productos podrás elegir &quot;Aplicar IVA (19%)&quot;. Por defecto los productos no llevan IVA.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Inventario
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="has_bodega"
                checked={hasBodega}
                onChange={(e) => setHasBodega(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30"
              />
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                Esta sucursal tiene bodega
              </span>
            </label>
            <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
              Si activas la bodega, podrás tener stock en local y en bodega por separado y usar &quot;Transferir stock&quot; para mover entre ellos. Si no, todo el stock será en un solo lugar (local).
            </p>
          </div>

          {/* Gestión de domiciliarios */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Domiciliarios
              </p>
              {!showAddForm && !editingPerson && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(true);
                    setNewPersonName("");
                    setNewPersonCode("");
                    setNewPersonPhone("");
                  }}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              )}
            </div>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              Gestiona los domiciliarios de esta sucursal. Si hay 1 o 2 domiciliarios, se seleccionará automáticamente el primero al crear una venta con envío.
            </p>

            {/* Formulario de agregar/editar */}
            {(showAddForm || editingPerson) && (
              <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Código <span className="text-ov-pink">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingPerson?.code ?? newPersonCode}
                    onChange={(e) => editingPerson ? setEditingPerson({...editingPerson, code: e.target.value}) : setNewPersonCode(e.target.value.toUpperCase())}
                    placeholder="Ej. D1, D2, D3"
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Nombre <span className="text-ov-pink">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingPerson?.name ?? newPersonName}
                    onChange={(e) => editingPerson ? setEditingPerson({...editingPerson, name: e.target.value}) : setNewPersonName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={editingPerson?.phone ?? newPersonPhone}
                    onChange={(e) => editingPerson ? setEditingPerson({...editingPerson, phone: e.target.value}) : setNewPersonPhone(e.target.value)}
                    placeholder="Ej. 300 123 4567"
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!branchId) return;
                      const supabase = createClient();
                      if (editingPerson) {
                        // Actualizar
                        await supabase
                          .from("delivery_persons")
                          .update({
                            name: editingPerson.name,
                            code: editingPerson.code,
                            phone: editingPerson.phone || null,
                            updated_at: new Date().toISOString(),
                          })
                          .eq("id", editingPerson.id);
                        setEditingPerson(null);
                      } else {
                        // Crear
                        if (!newPersonName.trim() || !newPersonCode.trim()) return;
                        await supabase
                          .from("delivery_persons")
                          .insert({
                            branch_id: branchId,
                            name: newPersonName.trim(),
                            code: newPersonCode.trim().toUpperCase(),
                            phone: newPersonPhone.trim() || null,
                            active: true,
                          });
                        setNewPersonName("");
                        setNewPersonCode("");
                        setNewPersonPhone("");
                        setShowAddForm(false);
                      }
                      // Recargar lista
                      const { data } = await supabase
                        .from("delivery_persons")
                        .select("id, name, code, phone, active")
                        .eq("branch_id", branchId)
                        .order("code", { ascending: true });
                      if (data) setDeliveryPersons(data as DeliveryPerson[]);
                    }}
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700"
                  >
                    {editingPerson ? "Guardar" : "Agregar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingPerson(null);
                      setNewPersonName("");
                      setNewPersonCode("");
                      setNewPersonPhone("");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de domiciliarios */}
            <div className="mt-4 space-y-2">
              {deliveryPersons.length === 0 ? (
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  No hay domiciliarios registrados. Agrega uno para poder asignar envíos.
                </p>
              ) : (
                deliveryPersons.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                          {person.code}
                        </span>
                        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                          {person.name}
                        </span>
                        {!person.active && (
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                            Inactivo
                          </span>
                        )}
                      </div>
                      {person.phone && (
                        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                          {person.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingPerson(person)}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                        title="Editar"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!branchId) return;
                          const supabase = createClient();
                          await supabase
                            .from("delivery_persons")
                            .update({ active: !person.active, updated_at: new Date().toISOString() })
                            .eq("id", person.id);
                          const { data } = await supabase
                            .from("delivery_persons")
                            .select("id, name, code, phone, active")
                            .eq("branch_id", branchId)
                            .order("code", { ascending: true });
                          if (data) setDeliveryPersons(data as DeliveryPerson[]);
                        }}
                        className={`rounded-lg p-1.5 transition-colors ${
                          person.active
                            ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                            : "text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                        title={person.active ? "Desactivar" : "Activar"}
                      >
                        {person.active ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen
            </p>
            <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400">
              Los cambios se aplican solo a esta sucursal. Ventas, inventario y numeración son independientes por sucursal.
            </p>
            <div className="mt-4 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || saving || !branchId}
                className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
