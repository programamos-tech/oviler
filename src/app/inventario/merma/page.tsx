"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

type DefectiveProductRow = {
  id: string;
  warranty_id: string;
  product_id: string;
  branch_id: string;
  quantity: number;
  received_at: string;
  defect_description: string;
  disposition: "pending" | "returned_to_supplier" | "destroyed" | "repaired";
  disposition_date: string | null;
  disposition_notes: string | null;
  created_at: string;
  products: { name: string; sku: string | null } | null;
  warranties: {
    id: string;
    sale_id: string;
    customers: { name: string } | null;
    sales: { invoice_number: string } | null;
  } | null;
};

const DISPOSITION_LABELS: Record<string, string> = {
  pending: "Pendiente",
  returned_to_supplier: "Devolvido a proveedor",
  destroyed: "Destruido",
  repaired: "Reparado",
};

const DISPOSITION_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300" },
  returned_to_supplier: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
  destroyed: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300" },
  repaired: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300" },
};

export default function MermaPage() {
  const router = useRouter();
  const [defectiveProducts, setDefectiveProducts] = useState<DefectiveProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispositionFilter, setDispositionFilter] = useState<string>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showDispositionModal, setShowDispositionModal] = useState<string | null>(null);
  const [selectedDisposition, setSelectedDisposition] = useState<"returned_to_supplier" | "destroyed" | "repaired" | null>(null);
  const [dispositionNotes, setDispositionNotes] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);
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

      let q = supabase
        .from("defective_products")
        .select(`
          *,
          products(name, sku),
          warranties!inner(
            id,
            sale_id,
            customers(name),
            sales(invoice_number)
          )
        `)
        .eq("branch_id", ub.branch_id)
        .order("received_at", { ascending: false });

      if (dispositionFilter !== "all") {
        q = q.eq("disposition", dispositionFilter);
      }

      const { data: defectiveData, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error("Error loading defective products:", error);
        setDefectiveProducts([]);
      } else {
        setDefectiveProducts((defectiveData ?? []) as DefectiveProductRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispositionFilter]);

  const handleUpdateDisposition = async () => {
    if (!showDispositionModal || !selectedDisposition) return;
    setUpdatingId(showDispositionModal);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("defective_products")
        .update({
          disposition: selectedDisposition,
          disposition_date: new Date().toISOString(),
          disposition_notes: dispositionNotes.trim() || null,
        })
        .eq("id", showDispositionModal);

      if (error) throw error;

      setDefectiveProducts((products) =>
        products.map((p) =>
          p.id === showDispositionModal
            ? {
                ...p,
                disposition: selectedDisposition,
                disposition_date: new Date().toISOString(),
                disposition_notes: dispositionNotes.trim() || null,
              }
            : p
        )
      );
      setShowDispositionModal(null);
      setSelectedDisposition(null);
      setDispositionNotes("");
    } catch (error: any) {
      alert("Error al actualizar la disposición: " + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Inventario", href: "/inventario" }, { label: "Merma/Defectuosos" }]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Merma / Productos Defectuosos
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Gestiona los productos defectuosos recibidos por garantías. Marca su disposición final.
            </p>
          </div>
        </div>
      </header>

      {!loading && defectiveProducts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">Disposición:</label>
          <select
            value={dispositionFilter}
            onChange={(e) => setDispositionFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="returned_to_supplier">Devolvidos a proveedor</option>
            <option value="destroyed">Destruidos</option>
            <option value="repaired">Reparados</option>
          </select>
        </div>
      )}

      <section className="space-y-3">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400">Cargando productos defectuosos...</p>
          </div>
        ) : defectiveProducts.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
              {dispositionFilter === "all" ? "No hay productos defectuosos registrados" : `No hay productos con disposición "${DISPOSITION_LABELS[dispositionFilter]}"`}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              Los productos defectuosos aparecerán aquí cuando se procesen las garantías.
            </p>
          </div>
        ) : (
          defectiveProducts.map((product) => {
            const dispositionColor = DISPOSITION_COLORS[product.disposition];
            return (
              <div
                key={product.id}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">Información del producto</p>
                    <div className="space-y-2 text-[13px]">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="font-bold">Producto:</span>
                        <span className="text-slate-600 dark:text-slate-400">{product.products?.name ?? "—"}</span>
                      </div>
                      {product.products?.sku && (
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          <span className="font-bold">Código:</span>
                          <span className="text-slate-600 dark:text-slate-400">{product.products.sku}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7h-4m0 0V5a2 2 0 00-2-2h-4M16 7v2m0 4v2a2 2 0 01-2 2h-4m4-6V9m0 0H8m8 0V7a2 2 0 00-2-2H10a2 2 0 00-2 2v2" />
                        </svg>
                        <span className="font-bold">Cantidad:</span>
                        <span className="text-slate-600 dark:text-slate-400">{product.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-bold">Recibido:</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {formatDate(product.received_at)} · {formatTime(product.received_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">Descripción del defecto</p>
                      <div className="rounded-lg bg-slate-50 p-3 text-[13px] dark:bg-slate-800">
                        <p className="text-slate-700 dark:text-slate-300">{product.defect_description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-bold">Estado:</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-bold ${dispositionColor.bg} ${dispositionColor.text}`}>
                        {DISPOSITION_LABELS[product.disposition]}
                      </span>
                    </div>
                    {product.warranties && (
                      <div className="flex items-center gap-2 text-[13px]">
                        <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-bold">Garantía:</span>
                        <Link href={`/garantias`} className="text-ov-pink hover:underline">
                          #{product.warranties.sales?.invoice_number ?? "—"}
                        </Link>
                        {product.warranties.customers && (
                          <span className="text-slate-600 dark:text-slate-400">
                            · {product.warranties.customers.name}
                          </span>
                        )}
                      </div>
                    )}
                    {product.disposition_date && (
                      <div className="flex items-center gap-2 text-[13px]">
                        <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-bold">Fecha de disposición:</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {formatDate(product.disposition_date)}
                        </span>
                      </div>
                    )}
                    {product.disposition_notes && (
                      <div>
                        <p className="mb-1 font-bold text-slate-800 dark:text-slate-100">Notas</p>
                        <div className="rounded-lg bg-slate-50 p-2 text-[12px] dark:bg-slate-800">
                          <p className="text-slate-700 dark:text-slate-300">{product.disposition_notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {product.disposition === "pending" && (
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                    <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      Recibido {formatDate(product.received_at)}
                    </p>
                    <button
                      onClick={() => setShowDispositionModal(product.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ov-pink bg-ov-pink/10 px-4 py-2 text-[13px] font-bold text-ov-pink hover:bg-ov-pink/20 dark:bg-ov-pink/20 dark:hover:bg-ov-pink/30"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Cambiar disposición
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Modal de cambio de disposición */}
      {showDispositionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Cambiar disposición</h3>
            <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
              Selecciona la disposición final de este producto defectuoso.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setSelectedDisposition("returned_to_supplier")}
                className={`w-full rounded-lg border-2 p-3 text-left text-[14px] font-medium transition-colors ${
                  selectedDisposition === "returned_to_supplier"
                    ? "border-ov-pink bg-ov-pink/10 dark:bg-ov-pink/20"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-700"
                }`}
              >
                <div className="font-semibold text-slate-900 dark:text-slate-50">Devolvido a proveedor</div>
                <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">
                  El producto fue devuelto al proveedor
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisposition("destroyed")}
                className={`w-full rounded-lg border-2 p-3 text-left text-[14px] font-medium transition-colors ${
                  selectedDisposition === "destroyed"
                    ? "border-ov-pink bg-ov-pink/10 dark:bg-ov-pink/20"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-700"
                }`}
              >
                <div className="font-semibold text-slate-900 dark:text-slate-50">Destruido</div>
                <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">
                  El producto fue destruido o descartado
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisposition("repaired")}
                className={`w-full rounded-lg border-2 p-3 text-left text-[14px] font-medium transition-colors ${
                  selectedDisposition === "repaired"
                    ? "border-ov-pink bg-ov-pink/10 dark:bg-ov-pink/20"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-700"
                }`}
              >
                <div className="font-semibold text-slate-900 dark:text-slate-50">Reparado</div>
                <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">
                  El producto fue reparado y vuelve al stock normal
                </div>
              </button>
            </div>
            {selectedDisposition && (
              <>
                <label className="mt-4 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Notas (opcional)
                </label>
                <textarea
                  value={dispositionNotes}
                  onChange={(e) => setDispositionNotes(e.target.value)}
                  placeholder="Ej. Fecha de devolución, motivo de destrucción..."
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  rows={3}
                />
              </>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setShowDispositionModal(null);
                  setSelectedDisposition(null);
                  setDispositionNotes("");
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateDisposition}
                disabled={!selectedDisposition || updatingId === showDispositionModal}
                className="flex-1 rounded-lg bg-ov-pink px-4 py-2 text-[13px] font-medium text-white hover:bg-ov-pink-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingId === showDispositionModal ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
