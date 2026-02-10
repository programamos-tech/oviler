"use client";

import Link from "next/link";
import { useState } from "react";

const IVA_RATE = 0.19;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

export default function NewProductPage() {
  const [aplicarIva, setAplicarIva] = useState(true);
  const [baseCosto, setBaseCosto] = useState("");
  const [basePrecio, setBasePrecio] = useState("");

  const numBaseCosto = Number(String(baseCosto).replace(/\D/g, "")) || 0;
  const numBasePrecio = Number(String(basePrecio).replace(/\D/g, "")) || 0;
  const ivaCosto = aplicarIva ? Math.round(numBaseCosto * IVA_RATE) : 0;
  const ivaPrecio = aplicarIva ? Math.round(numBasePrecio * IVA_RATE) : 0;
  const totalCosto = numBaseCosto + ivaCosto;
  const totalPrecio = numBasePrecio + ivaPrecio;

  const handleBaseCostoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "");
    setBaseCosto(v ? formatMoney(Number(v)) : "");
  };
  const handleBasePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "");
    setBasePrecio(v ? formatMoney(Number(v)) : "");
  };

  const inputClass =
    "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Nuevo producto
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registra un nuevo producto en el catálogo: datos, precio y stock en un solo lugar.
            </p>
          </div>
          <Link
            href="/inventario"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a inventario"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        {/* Columna izquierda: Información básica + Control de stock */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Información básica
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>
                  Nombre del producto <span className="text-ov-pink">*</span>
                </label>
                <input
                  placeholder="Nombre del producto"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Referencia <span className="text-ov-pink">*</span>
                </label>
                <input placeholder="REF-001" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Descripción (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Descripción detallada del producto (opcional)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Marca (opcional)</label>
                  <input placeholder="Marca del producto" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Categoría (opcional)</label>
                  <select className={inputClass}>
                    <option value="">Seleccionar categoría</option>
                    <option value="alimentos">Alimentos básicos</option>
                    <option value="aseo">Aseo</option>
                    <option value="bebidas">Bebidas</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Control de stock
            </p>
            <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Cantidad en inventario
            </label>
            <div className="mt-2">
              <input
                type="number"
                min={0}
                defaultValue={0}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
              Stock inicial del producto al darlo de alta.
            </p>
          </div>
        </div>

        {/* Columna derecha: Información financiera + Resumen + Paso final */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Información financiera
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={aplicarIva}
                onChange={(e) => setAplicarIva(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30"
              />
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Aplicar IVA (19%)</span>
            </label>
            {aplicarIva && (
              <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
                Ingresa los precios SIN IVA. El sistema calcula automáticamente el IVA (19%).
              </p>
            )}
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>Costo de compra (base sin IVA) <span className="text-ov-pink">*</span></label>
                <div className="flex rounded-lg border border-slate-300 dark:border-slate-700">
                  <span className="flex items-center rounded-l-lg border-r border-slate-300 bg-slate-50 px-3 text-[14px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={baseCosto}
                    onChange={handleBaseCostoChange}
                    placeholder="0"
                    className="h-10 flex-1 rounded-r-lg border-0 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                {aplicarIva && (
                  <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
                    IVA (19%): $ {formatMoney(ivaCosto)} — Total: $ {formatMoney(totalCosto)}
                  </p>
                )}
                {!aplicarIva && (
                  <p className="mt-1 text-[13px] font-medium text-slate-700 dark:text-slate-200">Total: $ {formatMoney(numBaseCosto)}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Precio de venta (base sin IVA) <span className="text-ov-pink">*</span></label>
                <div className="flex rounded-lg border border-slate-300 dark:border-slate-700">
                  <span className="flex items-center rounded-l-lg border-r border-slate-300 bg-slate-50 px-3 text-[14px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={basePrecio}
                    onChange={handleBasePrecioChange}
                    placeholder="0"
                    className="h-10 flex-1 rounded-r-lg border-0 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                {aplicarIva && (
                  <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
                    IVA (19%): $ {formatMoney(ivaPrecio)} — Total: $ {formatMoney(totalPrecio)}
                  </p>
                )}
                {!aplicarIva && (
                  <p className="mt-1 text-[13px] font-medium text-slate-700 dark:text-slate-200">Total: $ {formatMoney(numBasePrecio)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen del producto
            </p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">Producto</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">Se completará al guardar</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">Precio de venta</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {aplicarIva ? `$ ${formatMoney(totalPrecio)} (con IVA)` : `$ ${formatMoney(numBasePrecio)}`}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-medium">Costo</span>
                <span className="font-bold">$ {formatMoney(aplicarIva ? totalCosto : numBaseCosto)}</span>
              </div>
              <div className="flex items-center justify-between text-[15px] font-bold text-slate-900 dark:text-slate-50">
                <span>Precio venta</span>
                <span>$ {aplicarIva ? formatMoney(totalPrecio) : formatMoney(numBasePrecio)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="space-y-3">
              <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p className="font-bold text-slate-700 dark:text-slate-100">Paso final</p>
                <p className="mt-1">
                  Cuando confirmes, el producto quedará en el catálogo y podrás ajustar el stock después.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                Crear producto
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
