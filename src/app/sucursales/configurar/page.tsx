"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

export default function ConfigurarSucursalPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [hasBodega, setHasBodega] = useState(false);
  const [responsableIva, setResponsableIva] = useState(false);
  const [invoicePrintType, setInvoicePrintType] = useState<"tirilla" | "block">("block");
  const [invoiceCancelRequiresApproval, setInvoiceCancelRequiresApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
