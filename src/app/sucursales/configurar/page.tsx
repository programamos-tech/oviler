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

type ExpenseConcept = {
  id: string;
  name: string;
  display_order: number;
};

const DEFAULT_EXPENSE_CONCEPTS = [
  "Pago servicios",
  "Compra insumos",
  "Nómina",
  "Arriendo",
  "Servicios públicos",
  "Transporte y flete",
  "Mantenimiento",
  "Publicidad",
  "Suministros de oficina",
  "Pago a proveedores",
];

export default function ConfigurarSucursalPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [nit, setNit] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hasBodega, setHasBodega] = useState(false);
  const [responsableIva, setResponsableIva] = useState(false);
  const [invoicePrintType, setInvoicePrintType] = useState<"tirilla" | "block">("block");
  const [invoiceCancelRequiresApproval, setInvoiceCancelRequiresApproval] = useState(false);
  const [warrantyBySale, setWarrantyBySale] = useState(true);
  const [warrantyRequiresApproval, setWarrantyRequiresApproval] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados para domiciliarios
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [editingPerson, setEditingPerson] = useState<DeliveryPerson | null>(null);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonCode, setNewPersonCode] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Conceptos de egresos (por organización)
  const [expenseConcepts, setExpenseConcepts] = useState<ExpenseConcept[]>([]);
  const [newConceptName, setNewConceptName] = useState("");
  const [addingConcept, setAddingConcept] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) return;
      setBranchId(ub.branch_id);
      const { data: branch } = await supabase.from("branches").select("organization_id, name, nit, address, phone, logo_url, has_bodega, responsable_iva, invoice_print_type, invoice_cancel_requires_approval, warranty_by_sale, warranty_requires_approval, show_expenses").eq("id", ub.branch_id).single();
      if (branch && !cancelled) {
        setOrganizationId((branch as { organization_id?: string }).organization_id ?? null);
        setBranchName((branch as { name?: string }).name ?? "");
        setNit((branch as { nit?: string | null }).nit ?? "");
        setAddress((branch as { address?: string | null }).address ?? "");
        setPhone((branch as { phone?: string | null }).phone ?? "");
        setLogoUrl((branch as { logo_url?: string | null }).logo_url ?? null);
        setHasBodega(!!branch.has_bodega);
        setResponsableIva(!!branch.responsable_iva);
        setInvoicePrintType(branch.invoice_print_type === "tirilla" ? "tirilla" : "block");
        setInvoiceCancelRequiresApproval(!!branch.invoice_cancel_requires_approval);
        setWarrantyBySale(branch.warranty_by_sale !== false);
        setWarrantyRequiresApproval((branch as { warranty_requires_approval?: boolean }).warranty_requires_approval !== false);
        setShowExpenses((branch as { show_expenses?: boolean }).show_expenses !== false);
      }
      
      const orgId = (branch as { organization_id?: string } | null)?.organization_id;
      if (orgId && !cancelled) {
        const { data: concepts } = await supabase
          .from("expense_concepts")
          .select("id, name, display_order")
          .eq("organization_id", orgId)
          .order("display_order", { ascending: true });
        if (!cancelled && concepts) setExpenseConcepts(concepts as ExpenseConcept[]);
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
    const nameTrim = branchName.trim();
    if (!nameTrim) {
      alert("El nombre de la sucursal es obligatorio.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    await supabase.from("branches").update({
      name: nameTrim,
      nit: nit.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      has_bodega: hasBodega,
      responsable_iva: responsableIva,
      invoice_print_type: invoicePrintType,
      invoice_cancel_requires_approval: invoiceCancelRequiresApproval,
      warranty_by_sale: warrantyBySale,
      warranty_requires_approval: warrantyRequiresApproval,
      show_expenses: showExpenses,
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

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Logo
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo sucursal" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[12px] font-medium text-slate-400">Sin logo</span>
                )}
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
                <input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Ej. Sucursal Principal"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>NIT</label>
                <input
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  placeholder="Ej. 900.123.456-7"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej. Calle 50 # 10-20"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 601 123 4567"
                  className={inputClass}
                  disabled={loading}
                />
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
              Garantías
            </p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              Define si las garantías se registran por factura (venta) o directamente por producto.
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="warranty_by_sale"
                  checked={warrantyBySale === true}
                  onChange={() => setWarrantyBySale(true)}
                  disabled={loading}
                  className="h-4 w-4 border-slate-300 text-ov-pink focus:ring-ov-pink/30"
                />
                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Por venta (factura)
                </span>
              </label>
              <p className="ml-6 text-[12px] text-slate-500 dark:text-slate-400">
                Se elige la factura y luego el producto de esa venta. Ideal cuando siempre se pide ticket.
              </p>
              <label className="mt-2 flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="warranty_by_sale"
                  checked={warrantyBySale === false}
                  onChange={() => setWarrantyBySale(false)}
                  disabled={loading}
                  className="h-4 w-4 border-slate-300 text-ov-pink focus:ring-ov-pink/30"
                />
                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Por producto
                </span>
              </label>
              <p className="ml-6 text-[12px] text-slate-500 dark:text-slate-400">
                Se elige directamente el producto y el cliente, sin exigir número de factura.
              </p>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={warrantyRequiresApproval}
                onChange={(e) => setWarrantyRequiresApproval(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30"
              />
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                Las garantías requieren aprobación antes de procesarse
              </span>
            </label>
            <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
              Si está marcado, cada garantía pasará por estado &quot;Pendiente&quot; y un supervisor deberá aprobarla antes de poder procesarla (cambio/devolución/reparación). Si no está marcado, las garantías se podrán procesar directamente.
            </p>
          </div>
        </div>

        <div className="space-y-4">
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

          {/* Conceptos de egresos */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Conceptos de egresos
              </p>
              {expenseConcepts.length === 0 && organizationId && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!organizationId) return;
                    setAddingConcept(true);
                    const supabase = createClient();
                    for (let i = 0; i < DEFAULT_EXPENSE_CONCEPTS.length; i++) {
                      await supabase.from("expense_concepts").insert({
                        organization_id: organizationId,
                        name: DEFAULT_EXPENSE_CONCEPTS[i],
                        display_order: i,
                      });
                    }
                    const { data } = await supabase
                      .from("expense_concepts")
                      .select("id, name, display_order")
                      .eq("organization_id", organizationId)
                      .order("display_order", { ascending: true });
                    if (data) setExpenseConcepts(data as ExpenseConcept[]);
                    setAddingConcept(false);
                  }}
                  disabled={addingConcept}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-ov-pink px-3 text-[12px] font-medium text-white transition-colors hover:bg-ov-pink-hover disabled:opacity-60"
                >
                  {addingConcept ? "Cargando…" : "Cargar por defecto"}
                </button>
              )}
            </div>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              Lista de conceptos al registrar un egreso o gasto. Si no hay ninguno, en &quot;Nuevo egreso&quot; se mostrarán opciones por defecto. Agrega los que uses más.
            </p>

            <label className="mt-4 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showExpenses}
                onChange={(e) => setShowExpenses(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30"
              />
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                Mostrar módulo de egresos en el menú
              </span>
            </label>
            <p className="mt-1 ml-6 text-[12px] text-slate-500 dark:text-slate-400">
              Si lo desmarcas, se ocultará la opción Egresos en el menú y las secciones de egresos en dashboard y cierre de caja. Los conceptos y datos guardados se mantienen.
            </p>

            {/* Agregar concepto */}
            {organizationId && (
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">
                    Nuevo concepto
                  </label>
                  <input
                    type="text"
                    value={newConceptName}
                    onChange={(e) => setNewConceptName(e.target.value)}
                    placeholder="Ej. Arriendo, Publicidad"
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const name = newConceptName.trim();
                    if (!name || !organizationId) return;
                    const supabase = createClient();
                    const nextOrder = expenseConcepts.length > 0 ? Math.max(...expenseConcepts.map((c) => c.display_order)) + 1 : 0;
                    await supabase.from("expense_concepts").insert({
                      organization_id: organizationId,
                      name,
                      display_order: nextOrder,
                    });
                    setNewConceptName("");
                    const { data } = await supabase
                      .from("expense_concepts")
                      .select("id, name, display_order")
                      .eq("organization_id", organizationId)
                      .order("display_order", { ascending: true });
                    if (data) setExpenseConcepts(data as ExpenseConcept[]);
                  }}
                  disabled={!newConceptName.trim()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ov-pink px-3 text-[12px] font-medium text-white transition-colors hover:bg-ov-pink-hover disabled:opacity-50"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              </div>
            )}

            {/* Lista de conceptos */}
            <div className="mt-4 space-y-2">
              {expenseConcepts.length === 0 ? (
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  No hay conceptos configurados. Usa &quot;Cargar por defecto&quot; o agrega uno arriba.
                </p>
              ) : (
                expenseConcepts.map((concept) => (
                  <div
                    key={concept.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30"
                  >
                    <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100">{concept.name}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!organizationId) return;
                        const supabase = createClient();
                        await supabase.from("expense_concepts").delete().eq("id", concept.id);
                        setExpenseConcepts((prev) => prev.filter((c) => c.id !== concept.id));
                      }}
                      className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Eliminar"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resumen y Guardar en la misma columna */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen
            </p>
            <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400">
              Los cambios se aplican solo a esta sucursal. Ventas, inventario y numeración son independientes por sucursal.
            </p>
            <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
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
