"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activities";
import Breadcrumb from "@/app/components/Breadcrumb";

type Category = { id: string; name: string };

const IVA_RATE = 0.19;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [responsableIva, setResponsableIva] = useState(false);
  const [aplicarIva, setAplicarIva] = useState(false);
  const [baseCosto, setBaseCosto] = useState("");
  const [basePrecio, setBasePrecio] = useState("");
  const [nombre, setNombre] = useState("");
  const [referencia, setReferencia] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [marca, setMarca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const initialProductRef = useRef<{ name: string; sku: string; description: string; brand: string; category_id: string; base_cost: number; base_price: number; apply_iva: boolean } | null>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) return;

      const [categoriesRes, branchRes, productRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("organization_id", userRow.organization_id).order("name", { ascending: true }),
        supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single(),
        supabase.from("products").select("id, name, sku, description, brand, category_id, base_cost, base_price, apply_iva, image_url").eq("id", id).single(),
      ]);

      if (cancelled) return;
      setCategories(categoriesRes.data ?? []);
      if (branchRes.data?.branch_id) {
        const { data: branch } = await supabase.from("branches").select("responsable_iva").eq("id", branchRes.data.branch_id).single();
        if (!cancelled) setResponsableIva(!!branch?.responsable_iva);
      }
      const p = productRes.data;
      if (productRes.error || !p) {
        if (!cancelled) setNotFound(true);
        setLoading(false);
        return;
      }
      if (!cancelled) {
        const cost = p.base_cost != null ? Number(p.base_cost) : 0;
        const price = p.base_price != null ? Number(p.base_price) : 0;
        setNombre(p.name ?? "");
        setReferencia(p.sku ?? "");
        setDescripcion(p.description ?? "");
        setMarca(p.brand ?? "");
        setCategoria(p.category_id ?? "");
        setAplicarIva(!!p.apply_iva);
        setImageUrl((p as { image_url?: string | null }).image_url ?? null);
        setBaseCosto(cost ? formatMoney(cost) : "");
        setBasePrecio(price ? formatMoney(price) : "");
        initialProductRef.current = {
          name: p.name ?? "",
          sku: p.sku ?? "",
          description: p.description ?? "",
          brand: p.brand ?? "",
          category_id: p.category_id ?? "",
          base_cost: cost,
          base_price: price,
          apply_iva: !!p.apply_iva,
        };
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    const name = nombre.trim();
    const sku = referencia.trim();
    if (!name || !sku) {
      setError("Nombre y referencia son obligatorios.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const [userRowRes, ubRes] = user
      ? await Promise.all([
          supabase.from("users").select("organization_id").eq("id", user.id).single(),
          supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single(),
        ])
      : [{ data: null }, { data: null }];
    const userRow = userRowRes.data;
    const branchId = ubRes.data?.branch_id ?? null;

    let nextImageUrl: string | null | undefined = imageUrl;
    if (productImageFile && userRow?.organization_id) {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(productImageFile.type)) {
        setError("Imagen no válida. Usa JPG, PNG o WebP.");
        setSaving(false);
        return;
      }
      if (productImageFile.size > 5 * 1024 * 1024) {
        setError("La imagen no debe superar 5 MB.");
        setSaving(false);
        return;
      }
      const ext = productImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userRow.organization_id}/${id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, productImageFile, { upsert: true });
      if (upErr) {
        setError(upErr.message || "Error al subir la imagen.");
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      nextImageUrl = urlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("products")
      .update({
        name,
        sku,
        description: descripcion.trim() || null,
        brand: marca.trim() || null,
        category_id: categoria || null,
        base_cost: numBaseCosto,
        base_price: numBasePrecio,
        apply_iva: responsableIva ? aplicarIva : false,
        ...(nextImageUrl !== undefined && productImageFile ? { image_url: nextImageUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    if (user && userRow?.organization_id) {
      try {
        const initial = initialProductRef.current;
        const labels: string[] = [];
        if (initial) {
          if ((initial.name || "").trim() !== name) labels.push("nombre");
          if ((initial.sku || "").trim() !== sku) labels.push("referencia");
          if ((initial.description || "").trim() !== (descripcion || "").trim()) labels.push("descripción");
          if ((initial.brand || "").trim() !== (marca || "").trim()) labels.push("marca");
          if ((initial.category_id || "") !== (categoria || "")) labels.push("categoría");
          if (initial.base_cost !== numBaseCosto) labels.push("costo");
          if (initial.base_price !== numBasePrecio) labels.push("precio");
          if (initial.apply_iva !== (responsableIva ? aplicarIva : false)) labels.push("IVA");
        }
        const summary =
          labels.length === 0
            ? `Editó el producto ${name}`
            : labels.length === 1
              ? `Editó la ${labels[0]} de ${name}`
              : `Editó ${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]} de ${name}`;

        await logActivity(supabase, {
          organizationId: userRow.organization_id,
          branchId,
          userId: user.id,
          action: "product_updated",
          entityType: "product",
          entityId: id,
          summary,
          metadata: { sku, name, changedFields: labels },
        });
      } catch {
        // No bloquear el flujo si falla el registro de actividad
      }
    }

    setSaving(false);
    router.push(`/inventario/${id}`);
  }

  const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-[color:var(--shell-sidebar)] focus:bg-white focus:ring-2 focus:ring-slate-400/35 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-zinc-500";
  const labelClass = "mb-2 block text-[12px] font-semibold text-slate-700 dark:text-slate-300";
  const requiredMarkClass = "text-[color:var(--shell-sidebar)] dark:text-zinc-300";

  if (loading) {
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
        <div className="min-h-[280px] animate-pulse rounded-2xl bg-white dark:bg-slate-900" aria-hidden />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-4 font-sans text-[13px] text-slate-800 antialiased dark:text-slate-100">
        <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Producto no encontrado.</p>
        <Link
          href="/inventario"
          className="inline-flex text-[14px] font-medium text-[color:var(--shell-sidebar)] transition-colors hover:underline dark:text-zinc-300"
        >
          Volver al inventario
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb
          items={[
            { label: "Inventario", href: "/inventario" },
            { label: nombre.trim() || "Producto", href: id ? `/inventario/${id}` : undefined },
            { label: "Editar" },
          ]}
        />
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Editar producto
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Modifica los datos del producto. El stock se ajusta desde Actualizar stock.
            </p>
          </div>
          <Link
            href={id ? `/inventario/${id}` : "/inventario"}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
            title="Volver al detalle"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[13px] font-medium text-red-700 dark:border-red-900/45 dark:bg-red-950/30 dark:text-red-200" role="alert">
          {error}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Información básica
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className={labelClass}>Nombre del producto <span className={requiredMarkClass}>*</span></label>
                <input placeholder="Nombre del producto" className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Referencia <span className={requiredMarkClass}>*</span></label>
                <input placeholder="REF-001" className={inputClass} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Descripción (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Descripción detallada del producto (opcional)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-[color:var(--shell-sidebar)] focus:bg-white focus:ring-2 focus:ring-slate-400/35 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-zinc-500"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Imagen (catálogo web)</label>
                {imageUrl && !productImageFile && (
                  <img src={imageUrl} alt="" className="mb-2 h-24 w-24 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 dark:text-slate-300 dark:file:bg-slate-800"
                  onChange={(e) => setProductImageFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-[12px] text-slate-500">JPG, PNG o WebP. Máx. 5 MB.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Marca (opcional)</label>
                  <input placeholder="Marca del producto" className={inputClass} value={marca} onChange={(e) => setMarca(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Categoría (opcional)</label>
                  <select className={inputClass} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                    <option value="">Seleccionar categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      <Link href="/inventario/categorias" className="font-medium text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300">Configura tus categorías</Link> en Inventario.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Información financiera
            </p>
            {responsableIva && (
              <>
                <label className="mt-3 flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={aplicarIva} onChange={(e) => setAplicarIva(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[color:var(--shell-sidebar)] focus:ring-slate-400/50" />
                  <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Aplicar IVA (19%)</span>
                </label>
                {aplicarIva && <p className="mt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">Ingresa los precios SIN IVA. El sistema calcula automáticamente el IVA (19%).</p>}
              </>
            )}
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>{responsableIva ? "Costo de compra (base sin IVA)" : "Costo de compra"} <span className={requiredMarkClass}>*</span></label>
                <div className="flex rounded-xl border border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center rounded-l-xl border-r border-slate-200 bg-slate-100 px-3 text-[13px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">$</span>
                  <input type="text" inputMode="numeric" value={baseCosto} onChange={handleBaseCostoChange} placeholder="0" className="h-10 flex-1 rounded-r-xl border-0 bg-transparent px-4 text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-400/35 dark:text-slate-200 dark:placeholder:text-slate-500" />
                </div>
                {aplicarIva && <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">IVA (19%): $ {formatMoney(ivaCosto)} — Total con IVA: $ {formatMoney(totalCosto)}</p>}
              </div>
              <div>
                <label className={labelClass}>{responsableIva ? "Precio de venta (base sin IVA)" : "Precio de venta"} <span className={requiredMarkClass}>*</span></label>
                <div className="flex rounded-xl border border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center rounded-l-xl border-r border-slate-200 bg-slate-100 px-3 text-[13px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">$</span>
                  <input type="text" inputMode="numeric" value={basePrecio} onChange={handleBasePrecioChange} placeholder="0" className="h-10 flex-1 rounded-r-xl border-0 bg-transparent px-4 text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-400/35 dark:text-slate-200 dark:placeholder:text-slate-500" />
                </div>
                {aplicarIva && <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">IVA (19%): $ {formatMoney(ivaPrecio)} — Total con IVA: $ {formatMoney(totalPrecio)}</p>}
                <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">Este producto no podrá ser vendido por menos del valor de precio de venta.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Resumen del producto</p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Producto</p>
                <div className="mt-1.5 space-y-1 text-slate-600 dark:text-slate-400">
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">Nombre:</span> {nombre.trim() || "—"}</p>
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">Referencia:</span> {referencia.trim() || "—"}</p>
                  {categoria && <p><span className="font-medium text-slate-700 dark:text-slate-300">Categoría:</span> {categories.find((c) => c.id === categoria)?.name ?? "—"}</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Precio de venta</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{aplicarIva ? `$ ${formatMoney(totalPrecio)} (con IVA)` : `$ ${formatMoney(numBasePrecio)}`}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <div className="flex items-center justify-between"><span className="font-medium">Costo</span><span className="font-bold">$ {formatMoney(aplicarIva ? totalCosto : numBaseCosto)}</span></div>
              <div className="flex items-center justify-between text-[15px] font-bold text-slate-900 dark:text-slate-50"><span>Precio venta</span><span>$ {aplicarIva ? formatMoney(totalPrecio) : formatMoney(numBasePrecio)}</span></div>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-5 py-5 dark:bg-slate-900 sm:px-6 sm:py-6">
            <div className="space-y-3">
              <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-100">Guardar cambios</span>
                <span className="mt-1 block">Se actualizarán los datos del producto en el catálogo.</span>
              </p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}
