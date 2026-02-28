"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activities";
import Breadcrumb from "@/app/components/Breadcrumb";
import LocationPathWithIcons from "@/app/components/LocationPathWithIcons";

type Category = { id: string; name: string };
type Warehouse = { id: string; name: string };
type Floor = { id: string; warehouse_id: string };
type Zone = { id: string; name: string; floor_id: string };
type Aisle = { id: string; name: string; zone_id: string };
type Stand = { id: string; name: string; code: string | null; aisle_id?: string; aisleId?: string };
type LocationItem = { id: string; name: string; code: string | null; stand_id: string; level: number };

const IVA_RATE = 0.19;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

export default function NewProductPage() {
  const router = useRouter();
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
  const [stockInicial, setStockInicial] = useState(0);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [stands, setStands] = useState<Stand[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [sinUbicacion, setSinUbicacion] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [selectedAisleId, setSelectedAisleId] = useState("");
  const [selectedStandId, setSelectedStandId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) return;
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("organization_id", userRow.organization_id)
        .order("name", { ascending: true });
      if (!cancelled) setCategories(data ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) return;
      const { data: wh } = await supabase.from("warehouses").select("id, name").eq("branch_id", ub.branch_id).order("name");
      if (cancelled || !wh?.length) {
        setWarehouses(wh ?? []);
        setFloors([]);
        setZones([]);
        setAisles([]);
        setStands([]);
        setLocations([]);
        return;
      }
      const warehouseIds = (wh as Warehouse[]).map((w) => w.id);
      setWarehouses(wh as Warehouse[]);
      const { data: fl } = await supabase.from("floors").select("id, warehouse_id").in("warehouse_id", warehouseIds);
      if (cancelled || !fl?.length) {
        setFloors(fl ?? []);
        setZones([]);
        setAisles([]);
        setStands([]);
        setLocations([]);
        return;
      }
      setFloors((fl ?? []) as Floor[]);
      const floorIds = (fl ?? []).map((f: { id: string }) => f.id);
      const { data: zData } = await supabase.from("zones").select("id, name, floor_id").in("floor_id", floorIds).order("name");
      if (cancelled) return;
      setZones((zData ?? []) as Zone[]);
      if (!zData?.length) {
        setAisles([]);
        setStands([]);
        setLocations([]);
        return;
      }
      const zoneIds = (zData as Zone[]).map((z) => z.id);
      const { data: aData } = await supabase.from("aisles").select("id, name, zone_id").in("zone_id", zoneIds).order("name");
      if (cancelled) return;
      setAisles((aData ?? []) as Aisle[]);
      if (!aData?.length) {
        setStands([]);
        setLocations([]);
        return;
      }
      const aisleIds = (aData as Aisle[]).map((a) => a.id);
      let standsRaw: (Stand & { aisleId?: string })[] = [];
      const AISLE_CHUNK = 50;
      for (let i = 0; i < aisleIds.length; i += AISLE_CHUNK) {
        if (cancelled) break;
        const chunk = aisleIds.slice(i, i + AISLE_CHUNK);
        const { data: sd } = await supabase.from("stands").select("id, name, code, aisle_id").in("aisle_id", chunk).order("name");
        standsRaw = standsRaw.concat((sd ?? []) as (Stand & { aisleId?: string })[]);
      }
      if (cancelled) return;
      const standsList: Stand[] = standsRaw.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        aisle_id: s.aisle_id ?? s.aisleId ?? "",
      }));
      setStands(standsList);
      if (!standsList.length) {
        setLocations([]);
        return;
      }
      const standIds = standsList.map((s) => s.id);
      const STAND_CHUNK = 100;
      let allLocs: LocationItem[] = [];
      for (let i = 0; i < standIds.length; i += STAND_CHUNK) {
        if (cancelled) break;
        const chunk = standIds.slice(i, i + STAND_CHUNK);
        const PAGE = 1000;
        let offset = 0;
        while (true) {
          const { data: locPage } = await supabase
            .from("locations")
            .select("id, name, code, stand_id, level")
            .in("stand_id", chunk)
            .order("stand_id")
            .order("level")
            .range(offset, offset + PAGE - 1);
          const rows = (locPage ?? []) as (LocationItem & { standId?: string })[];
          const normalized = rows.map((row) => ({
            id: row.id,
            name: row.name,
            code: row.code,
            stand_id: row.stand_id ?? row.standId ?? "",
            level: Number(row.level ?? 1),
          }));
          allLocs = allLocs.concat(normalized);
          if (rows.length < PAGE) break;
          offset += PAGE;
        }
      }
      if (!cancelled) setLocations(allLocs);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) return;
      const { data: branch } = await supabase.from("branches").select("responsable_iva").eq("id", ub.branch_id).single();
      if (!cancelled) setResponsableIva(!!branch?.responsable_iva);
    })();
    return () => { cancelled = true; };
  }, []);

  const floorIdsForWarehouse = selectedWarehouseId ? floors.filter((f) => f.warehouse_id === selectedWarehouseId).map((f) => f.id) : [];
  const zonesForWarehouse = zones.filter((z) => floorIdsForWarehouse.includes(z.floor_id));
  const aislesForZone = selectedZoneId ? aisles.filter((a) => a.zone_id === selectedZoneId) : [];
  const standsForAisle = selectedAisleId ? stands.filter((s) => (s.aisle_id ?? (s as { aisleId?: string }).aisleId) === selectedAisleId) : [];
  const standIdsForAisle = standsForAisle.map((s) => s.id);
  const locationsForStand = selectedStandId ? locations.filter((l) => l.stand_id === selectedStandId) : [];
  const locationsForAisle = selectedAisleId ? locations.filter((l) => standIdsForAisle.includes(l.stand_id)) : [];

  const selectedLocation = selectedLocationId ? locations.find((l) => l.id === selectedLocationId) : null;
  const selectedStand = selectedStandId ? stands.find((s) => s.id === selectedStandId) : null;
  const selectedAisle = selectedAisleId ? aisles.find((a) => a.id === selectedAisleId) : null;
  const selectedZone = selectedZoneId ? zones.find((z) => z.id === selectedZoneId) : null;
  const selectedWarehouse = selectedWarehouseId ? warehouses.find((w) => w.id === selectedWarehouseId) : null;
  const locationPath = [selectedWarehouse?.name, selectedZone?.name, selectedAisle?.name, selectedStand?.name, selectedLocation ? `Nivel ${selectedLocation.level}` : null].filter(Boolean).join(" → ");

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
    setError(null);
    const name = nombre.trim();
    const sku = referencia.trim();
    if (!name || !sku) {
      setError("Nombre y referencia son obligatorios.");
      return;
    }
    const cost = numBaseCosto;
    const price = numBasePrecio;

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
      setError(
        "No se encontró tu organización. Si te registraste por correo, asegúrate de haber completado el registro en esta app. " +
        "Si un administrador te dio acceso, pide que verifique en Supabase que tu usuario tenga organization_id en la tabla users."
      );
      setSaving(false);
      return;
    }
    const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
    if (!ub?.branch_id) {
      setError("No tienes una sucursal asignada.");
      setSaving(false);
      return;
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        organization_id: userRow.organization_id,
        name,
        sku,
        description: descripcion.trim() || null,
        brand: marca.trim() || null,
        category_id: categoria || null,
        base_cost: cost,
        base_price: price,
        apply_iva: responsableIva ? aplicarIva : false,
      })
      .select("id")
      .single();

    if (productError || !product) {
      setError(productError?.message ?? "Error al crear el producto.");
      setSaving(false);
      return;
    }

    const qty = Math.max(0, Number(stockInicial) || 0);
    const locationIdToUse = sinUbicacion ? "" : selectedLocationId;
    if (locationIdToUse) {
      const { error: locErr } = await supabase.from("inventory_locations").insert({
        product_id: product.id,
        location_id: locationIdToUse,
        quantity: qty,
      });
      if (locErr) {
        setError(locErr.message || "Producto creado pero falló asignar ubicación.");
        setSaving(false);
        return;
      }
    } else if (qty > 0) {
      const { error: invError } = await supabase.from("inventory").insert({
        product_id: product.id,
        branch_id: ub.branch_id,
        quantity: qty,
      });
      if (invError) {
        setError(invError.message || "Producto creado pero falló el stock inicial.");
        setSaving(false);
        return;
      }
    }

    try {
      await logActivity(supabase, {
        organizationId: userRow.organization_id,
        branchId: ub.branch_id,
        userId: user.id,
        action: "product_created",
        entityType: "product",
        entityId: product.id,
        summary: `Creó el producto ${name}`,
        metadata: { sku, name },
      });
    } catch {
      // No bloquear el flujo si falla el registro de actividad
    }

    setSaving(false);
    router.push("/inventario");
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Inventario", href: "/inventario" }, { label: "Nuevo producto" }]} />
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

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-[14px] font-medium text-red-800 dark:bg-red-900/30 dark:text-red-200" role="alert">
          {error}
        </div>
      )}

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
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Referencia <span className="text-ov-pink">*</span>
                </label>
                <input
                  placeholder="REF-001"
                  className={inputClass}
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Descripción (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Descripción detallada del producto (opcional)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Marca (opcional)</label>
                  <input
                    placeholder="Marca del producto"
                    className={inputClass}
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Categoría (opcional)</label>
                  <select
                    className={inputClass}
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      <Link href="/inventario/categorias" className="font-medium text-ov-pink hover:underline">
                        Configura tus categorías
                      </Link>{" "}
                      en Inventario para usarlas aquí.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Control de stock
            </p>
            <label className="mt-3 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Ubicación en bodega (opcional)
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={sinUbicacion}
                onChange={(e) => {
                  setSinUbicacion(e.target.checked);
                  if (e.target.checked) {
                    setSelectedWarehouseId("");
                    setSelectedZoneId("");
                    setSelectedAisleId("");
                    setSelectedStandId("");
                    setSelectedLocationId("");
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30"
              />
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Sin ubicación específica</span>
            </label>
            {!sinUbicacion && warehouses.length > 0 ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Bodega</label>
                  <select
                    className={inputClass}
                    value={selectedWarehouseId}
                    onChange={(e) => {
                      setSelectedWarehouseId(e.target.value);
                      setSelectedZoneId("");
                      setSelectedAisleId("");
                      setSelectedStandId("");
                      setSelectedLocationId("");
                    }}
                  >
                    <option value="">Elegir bodega…</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                {selectedWarehouseId && (
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Zona</label>
                    <select
                      className={inputClass}
                      value={selectedZoneId}
                      onChange={(e) => {
                        setSelectedZoneId(e.target.value);
                        setSelectedAisleId("");
                        setSelectedStandId("");
                        setSelectedLocationId("");
                      }}
                    >
                      <option value="">Elegir zona…</option>
                      {zonesForWarehouse.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedZoneId && (
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Pasillo</label>
                    <select
                      className={inputClass}
                      value={selectedAisleId}
                      onChange={(e) => {
                        setSelectedAisleId(e.target.value);
                        setSelectedStandId("");
                        setSelectedLocationId("");
                      }}
                    >
                      <option value="">Elegir pasillo…</option>
                      {aislesForZone.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedAisleId && (
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Estante</label>
                    <select
                      className={inputClass}
                      value={selectedStandId}
                      onChange={(e) => {
                        setSelectedStandId(e.target.value);
                        setSelectedLocationId("");
                      }}
                    >
                      <option value="">Elegir estante…</option>
                      {standsForAisle.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}{st.code ? ` (${st.code})` : ""}
                        </option>
                      ))}
                    </select>
                    {standsForAisle.length === 0 && (
                      <p className="mt-1.5 text-[12px] text-amber-600 dark:text-amber-400">
                        No hay estantes en este pasillo.{" "}
                        <Link href="/inventario/ubicaciones" className="font-medium underline hover:no-underline">
                          Crea estantes y niveles en Ubicaciones
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                )}
                {selectedStandId && (
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Nivel</label>
                    <select
                      className={inputClass}
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      aria-invalid={!sinUbicacion && !selectedLocationId ? true : undefined}
                    >
                      <option value="">Elegir nivel…</option>
                      {locationsForStand.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          Nivel {loc.level}{loc.name ? ` — ${loc.name}` : ""}{loc.code ? ` (${loc.code})` : ""}
                        </option>
                      ))}
                    </select>
                    {locationsForStand.length === 0 && (
                      <p className="mt-1.5 text-[12px] text-amber-600 dark:text-amber-400">
                        No hay niveles en este estante.{" "}
                        <Link href="/inventario/ubicaciones" className="font-medium underline hover:no-underline">
                          Configura los niveles en Ubicaciones
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
            {selectedLocationId && locationPath && (
              <p className="mt-3 flex flex-wrap items-center gap-1 rounded-lg bg-slate-50 py-2 px-3 text-[13px] dark:bg-slate-800/50">
                <LocationPathWithIcons path={locationPath} iconClass="text-[13px]" />
              </p>
            )}
            {warehouses.length === 0 && (
              <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400">
                <Link href="/inventario/ubicaciones" className="font-medium text-ov-pink hover:underline">
                  Crea bodegas y ubicaciones
                </Link>{" "}
                para asignar el producto a un estante o celda al crearlo.
              </p>
            )}
            <label className="mt-4 mb-1 block text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Cantidad en inventario
            </label>
            <div className="mt-2">
              <input
                type="number"
                min={0}
                value={stockInicial === 0 ? "" : stockInicial}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setStockInicial(0);
                    return;
                  }
                  const num = parseInt(v.replace(/^0+/, ""), 10);
                  if (!Number.isNaN(num) && num >= 0) setStockInicial(num);
                }}
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
            {responsableIva && (
              <>
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
              </>
            )}
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>
                  {responsableIva ? "Costo de compra (base sin IVA)" : "Costo de compra"} <span className="text-ov-pink">*</span>
                </label>
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
                    IVA (19%): $ {formatMoney(ivaCosto)} — Total con IVA: $ {formatMoney(totalCosto)}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  {responsableIva ? "Precio de venta (base sin IVA)" : "Precio de venta"} <span className="text-ov-pink">*</span>
                </label>
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
                    IVA (19%): $ {formatMoney(ivaPrecio)} — Total con IVA: $ {formatMoney(totalPrecio)}
                  </p>
                )}
                <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                  Este producto no podrá ser vendido por menos del valor de precio de venta.
                </p>
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
                <div className="mt-1.5 space-y-1 text-slate-600 dark:text-slate-400">
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">Nombre:</span> {nombre.trim() || "—"}</p>
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">Referencia:</span> {referencia.trim() || "—"}</p>
                  {categoria && <p><span className="font-medium text-slate-700 dark:text-slate-300">Categoría:</span> {categories.find((c) => c.id === categoria)?.name ?? "—"}</p>}
                  {selectedLocationId && locationPath && (
                    <p className="flex flex-col gap-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Ubicación:</span>
                      <LocationPathWithIcons path={locationPath} iconClass="text-[13px]" />
                    </p>
                  )}
                </div>
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
                type="submit"
                disabled={saving}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:opacity-50 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              >
                {saving ? "Creando…" : "Crear producto"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}
