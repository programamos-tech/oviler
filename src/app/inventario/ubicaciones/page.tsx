"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/app/components/Breadcrumb";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

/** Límite por petición de PostgREST/Supabase (default 1000). Paginamos con este tamaño para no ser bloqueados. */
const SUPABASE_PAGE_SIZE = 1000;

type Warehouse = { id: string; name: string; code: string | null };
type Zone = { id: string; name: string; code: string | null };
type Aisle = { id: string; name: string; code: string | null; zone_id?: string };
type Stand = { id: string; name: string; code: string | null; aisle_id: string; level_count: number };
type Location = { id: string; name: string; code: string | null; stand_id?: string; standId?: string; level: number };
type MapStand = { id: string; name: string; code: string | null; level_count: number; locations: Location[] };
type MapAisle = { id: string; name: string; code: string | null; stands: MapStand[] };
type MapZone = { id: string; name: string; code: string | null; aisles: MapAisle[] };

export default function UbicacionesPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string>("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedAisle, setSelectedAisle] = useState<Aisle | null>(null);
  const [selectedStand, setSelectedStand] = useState<Stand | null>(null);

  const [formOpen, setFormOpen] = useState<"warehouse" | "zone" | "aisle" | "stand" | "location" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formLevelCount, setFormLevelCount] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mapStructure, setMapStructure] = useState<MapZone[] | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapViewMode, setMapViewMode] = useState<"grid" | "list">("grid");
  const [warehouseStats, setWarehouseStats] = useState<Record<string, { zones: number; aisles: number; locations: number }>>({});
  const [locationStock, setLocationStock] = useState<Record<string, { product_name: string; quantity: number }[]>>({});
  const [locationDetailOpen, setLocationDetailOpen] = useState<{ locationId: string; locationName: string; aisleName: string; zoneName: string } | null>(null);
  const [standDetailOpen, setStandDetailOpen] = useState<{ stand: MapStand; aisleName: string; zoneName: string } | null>(null);
  const [zoneConfigOpen, setZoneConfigOpen] = useState<string | null>(null);
  const [creatingLevelsForStandId, setCreatingLevelsForStandId] = useState<string | null>(null);

  const supabase = createClient();

  const createDefaultStructure = useCallback(async (warehouseId: string) => {
    const { data: floorRow } = await supabase.from("floors").insert({ warehouse_id: warehouseId, name: "Planta baja", level: 1 }).select("id").single();
    const floorId = floorRow?.id;
    if (!floorId) return;

    const zonesToCreate = [
      { name: "Zona A", code: "ZA" },
      { name: "Zona B", code: "ZB" },
      { name: "Zona C", code: "ZC" },
    ];

    for (const z of zonesToCreate) {
      const { data: zoneRow } = await supabase.from("zones").insert({ floor_id: floorId, name: z.name, code: z.code }).select("id").single();
      const zoneId = zoneRow?.id;
      if (!zoneId) continue;

      const aislesToCreate = [
        { name: "Pasillo 1", code: "P1" },
        { name: "Pasillo 2", code: "P2" },
        { name: "Pasillo 3", code: "P3" },
      ];
      const aisleIds: string[] = [];
      for (const a of aislesToCreate) {
        const { data: ar } = await supabase.from("aisles").insert({ zone_id: zoneId, name: a.name, code: a.code }).select("id").single();
        if (ar?.id) aisleIds.push(ar.id);
      }

      const aisleLetters = ["A", "B", "C"];
      const levelsPerStand = 4;
      for (let i = 0; i < aisleIds.length; i++) {
        const letter = aisleLetters[i] ?? String(i + 1);
        for (let n = 1; n <= levelsPerStand; n++) {
          const { data: standRow } = await supabase
            .from("stands")
            .insert({ aisle_id: aisleIds[i], name: `Estante ${letter}${n}`, code: `${letter}${n}`, level_count: levelsPerStand })
            .select("id")
            .single();
          const standId = standRow?.id;
          if (!standId) continue;
          for (let level = 1; level <= levelsPerStand; level++) {
            await supabase.from("locations").insert({
              stand_id: standId,
              level,
              name: `${letter}${n}-${level}`,
              code: `${letter}${n}-N${level}`,
            });
          }
        }
      }
    }
  }, [supabase]);

  const loadMapStructure = useCallback(async () => {
    if (!selectedWarehouse) return;
    setMapLoading(true);
    const { data: floorIds } = await supabase.from("floors").select("id").eq("warehouse_id", selectedWarehouse.id);
    const fids = (floorIds ?? []).map((f: { id: string }) => f.id);
    if (fids.length === 0) {
      setMapStructure([]);
      setMapLoading(false);
      return;
    }
    const { data: zonesData } = await supabase.from("zones").select("id, name, code").in("floor_id", fids).order("name");
    const zonesList = (zonesData ?? []) as Zone[];
    if (zonesList.length === 0) {
      setMapStructure([]);
      setMapLoading(false);
      return;
    }
    const zoneIds = zonesList.map((z) => z.id);
    const { data: aislesData } = await supabase.from("aisles").select("id, name, code, zone_id").in("zone_id", zoneIds).order("name");
    const aislesList = (aislesData ?? []) as Aisle[];
    const aisleIds = aislesList.map((a) => a.id);
    const { data: standsData } = aisleIds.length > 0
      ? await supabase.from("stands").select("id, name, code, aisle_id, level_count").in("aisle_id", aisleIds).order("name")
      : { data: [] };
    const standsList = (standsData ?? []) as Stand[];
    const standIds = standsList.map((s) => s.id);
    let rawLocs: Record<string, unknown>[] = [];
    if (standIds.length > 0) {
      let offset = 0;
      while (true) {
        const { data: page } = await supabase
          .from("locations")
          .select("id, name, code, stand_id, level")
          .in("stand_id", standIds)
          .order("level")
          .range(offset, offset + SUPABASE_PAGE_SIZE - 1);
        const rows = (page ?? []) as Record<string, unknown>[];
        rawLocs = rawLocs.concat(rows);
        if (rows.length < SUPABASE_PAGE_SIZE) break;
        offset += SUPABASE_PAGE_SIZE;
      }
    }
    const normId = (id: string | undefined) => (id == null ? "" : String(id).toLowerCase());
    const locationsByStandId: Record<string, Location[]> = {};
    const locsList: Location[] = rawLocs.map((row) => {
      const standIdRaw = row.stand_id ?? row.standId ?? (row as Record<string, unknown>).stand_id;
      const standIdStr = typeof standIdRaw === "string" ? standIdRaw : standIdRaw != null ? String(standIdRaw) : undefined;
      const loc: Location = {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        code: row.code != null ? String(row.code) : null,
        stand_id: standIdStr,
        level: Number(row.level ?? 1),
      };
      const sid = normId(standIdStr ?? "");
      if (sid) {
        if (!locationsByStandId[sid]) locationsByStandId[sid] = [];
        locationsByStandId[sid].push(loc);
      }
      return loc;
    });
    for (const sid of Object.keys(locationsByStandId)) {
      locationsByStandId[sid].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    }
    const map: MapZone[] = zonesList.map((z) => ({
      ...z,
      aisles: aislesList
        .filter((a) => normId((a as { zone_id?: string }).zone_id ?? (a as { zoneId?: string }).zoneId) === normId(z.id))
        .map((a) => ({
          id: a.id,
          name: a.name,
          code: a.code,
          stands: standsList
            .filter((s) => normId((s as { aisle_id?: string }).aisle_id ?? (s as { aisleId?: string }).aisleId) === normId(a.id))
            .map((s) => ({
              id: s.id,
              name: s.name,
              code: s.code,
              level_count: s.level_count,
              locations: (locationsByStandId[normId(s.id)] ?? []).slice(),
            })),
        })),
    }));
    setMapStructure(map);

    if (locsList.length > 0) {
      const locIds = locsList.map((l) => l.id);
      const norm = (id: string) => String(id).toLowerCase();
      const byLoc: Record<string, { product_name: string; quantity: number }[]> = {};
      for (const locId of locIds) byLoc[norm(locId)] = [];

      const CHUNK = 150;
      for (let i = 0; i < locIds.length; i += CHUNK) {
        const chunk = locIds.slice(i, i + CHUNK);
        const { data: ilData, error: ilError } = await supabase
          .from("inventory_locations")
          .select("location_id, quantity, products(name)")
          .in("location_id", chunk);
        if (ilError) {
          console.warn("inventory_locations load:", ilError.message);
          break;
        }
        for (const row of ilData ?? []) {
          const r = row as Record<string, unknown>;
          const lid = (r.location_id ?? r.locationId) as string | undefined;
          if (!lid) continue;
          const key = norm(lid);
          const qty = Number(r.quantity ?? 0);
          const productObj = (r.products ?? r.product_id ?? r.productId) as { name?: string } | null | undefined;
          const name = (productObj && typeof productObj === "object" && "name" in productObj)
            ? String(productObj.name)
            : "Producto";
          if (byLoc[key]) byLoc[key].push({ product_name: name, quantity: qty });
        }
      }
      setLocationStock(byLoc);
    } else {
      setLocationStock({});
    }

    setMapLoading(false);
  }, [selectedWarehouse, supabase]);

  const loadBranch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
    if (!ub?.branch_id) return;
    setBranchId(ub.branch_id);
    const { data: b } = await supabase.from("branches").select("name").eq("id", ub.branch_id).single();
    if (b) setBranchName(b.name);
  }, [supabase]);

  const loadWarehouses = useCallback(async () => {
    if (!branchId) return;
    const { data } = await supabase.from("warehouses").select("id, name, code").eq("branch_id", branchId).order("name");
    setWarehouses((data ?? []) as Warehouse[]);
  }, [branchId, supabase]);

  const loadWarehouseStats = useCallback(async () => {
    if (!warehouses.length) {
      setWarehouseStats({});
      return;
    }
    const whIds = warehouses.map((w) => w.id);
    const { data: fl } = await supabase.from("floors").select("id, warehouse_id").in("warehouse_id", whIds);
    const floorsList = (fl ?? []) as { id: string; warehouse_id: string }[];
    const floorIds = floorsList.map((f) => f.id);
    if (floorIds.length === 0) {
      setWarehouseStats(Object.fromEntries(whIds.map((id) => [id, { zones: 0, aisles: 0, locations: 0 }])));
      return;
    }
    const { data: zData } = await supabase.from("zones").select("id, floor_id").in("floor_id", floorIds);
    const zonesList = (zData ?? []) as { id: string; floor_id: string }[];
    const zoneIds = zonesList.map((z) => z.id);
    const { data: aData } = zoneIds.length > 0
      ? await supabase.from("aisles").select("id, zone_id").in("zone_id", zoneIds)
      : { data: [] };
    const aislesList = (aData ?? []) as { id: string; zone_id: string }[];
    const aisleIds = aislesList.map((a) => a.id);
    const { data: standsRows } = aisleIds.length > 0
      ? await supabase.from("stands").select("id, aisle_id").in("aisle_id", aisleIds)
      : { data: [] };
    const standsList = (standsRows ?? []) as { id: string; aisle_id: string }[];
    const standIds = standsList.map((s) => s.id);
    let locsList: { id: string; stand_id: string }[] = [];
    if (standIds.length > 0) {
      let offset = 0;
      while (true) {
        const { data: page } = await supabase
          .from("locations")
          .select("id, stand_id")
          .in("stand_id", standIds)
          .order("id")
          .range(offset, offset + SUPABASE_PAGE_SIZE - 1);
        const rows = (page ?? []) as { id: string; stand_id: string }[];
        locsList = locsList.concat(rows);
        if (rows.length < SUPABASE_PAGE_SIZE) break;
        offset += SUPABASE_PAGE_SIZE;
      }
    }
    const stats: Record<string, { zones: number; aisles: number; locations: number }> = {};
    for (const wid of whIds) {
      const fIds = floorsList.filter((f) => f.warehouse_id === wid).map((f) => f.id);
      const zIds = zonesList.filter((z) => fIds.includes(z.floor_id)).map((z) => z.id);
      const aIds = aislesList.filter((a) => zIds.includes(a.zone_id)).map((a) => a.id);
      const sIds = standsList.filter((s) => aIds.includes(s.aisle_id)).map((s) => s.id);
      stats[wid] = {
        zones: zIds.length,
        aisles: aIds.length,
        locations: locsList.filter((l) => sIds.includes(l.stand_id)).length,
      };
    }
    setWarehouseStats(stats);
  }, [warehouses, supabase]);

  const loadZones = useCallback(async () => {
    if (!selectedWarehouse) return;
    const { data: floorIds } = await supabase.from("floors").select("id").eq("warehouse_id", selectedWarehouse.id);
    const ids = (floorIds ?? []).map((f: { id: string }) => f.id);
    if (ids.length === 0) {
      setZones([]);
      return;
    }
    const { data } = await supabase.from("zones").select("id, name, code").in("floor_id", ids).order("name");
    setZones((data ?? []) as Zone[]);
  }, [selectedWarehouse, supabase]);

  const loadAisles = useCallback(async () => {
    if (!selectedZone) return;
    const { data } = await supabase.from("aisles").select("id, name, code").eq("zone_id", selectedZone.id).order("name");
    setAisles((data ?? []) as Aisle[]);
  }, [selectedZone, supabase]);

  const loadLocations = useCallback(async () => {
    if (!selectedAisle) return;
    const { data: standsRows } = await supabase.from("stands").select("id").eq("aisle_id", selectedAisle.id);
    const sIds = (standsRows ?? []).map((r: { id: string }) => r.id);
    if (sIds.length === 0) {
      setLocations([]);
      return;
    }
    const { data } = await supabase.from("locations").select("id, name, code, stand_id, level").in("stand_id", sIds).order("stand_id").order("level");
    setLocations((data ?? []) as Location[]);
  }, [selectedAisle, supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadBranch();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadBranch]);

  useEffect(() => {
    if (!branchId) return;
    loadWarehouses();
  }, [branchId, loadWarehouses]);

  useEffect(() => {
    loadWarehouseStats();
  }, [loadWarehouseStats]);

  useEffect(() => {
    if (!selectedWarehouse) return;
    loadZones();
  }, [selectedWarehouse, loadZones]);

  useEffect(() => {
    if (!selectedZone) return;
    loadAisles();
  }, [selectedZone, loadAisles]);

  useEffect(() => {
    if (!selectedAisle) return;
    loadLocations();
  }, [selectedAisle, loadLocations]);

  useEffect(() => {
    if (!selectedWarehouse) {
      setMapStructure(null);
      return;
    }
    loadMapStructure();
  }, [selectedWarehouse, loadMapStructure]);

  const openForm = (type: "warehouse" | "zone" | "aisle" | "stand" | "location", edit?: { id: string; name: string; code?: string | null; level_count?: number }) => {
    setFormOpen(type);
    setEditingId(edit?.id ?? null);
    setFormName(edit?.name ?? "");
    setFormCode(edit?.code ?? "");
    setFormLevelCount(typeof edit?.level_count === "number" ? edit.level_count : 1);
  };

  const closeForm = () => {
    setFormOpen(null);
    setEditingId(null);
    setFormName("");
    setFormCode("");
    setFormLevelCount(1);
  };

  const saveWarehouse = async () => {
    if (!branchId || !formName.trim()) return;
    setSaving(true);
    if (editingId) {
      await supabase.from("warehouses").update({ name: formName.trim(), code: formCode.trim() || null }).eq("id", editingId);
    } else {
      const { data: inserted } = await supabase
        .from("warehouses")
        .insert({ branch_id: branchId, name: formName.trim(), code: formCode.trim() || null })
        .select("id")
        .single();
      if (inserted?.id) await createDefaultStructure(inserted.id);
    }
    setSaving(false);
    closeForm();
    loadWarehouses();
  };

  const saveZone = async () => {
    if (!selectedWarehouse || !formName.trim()) return;
    setSaving(true);
    const { data: floors } = await supabase.from("floors").select("id").eq("warehouse_id", selectedWarehouse.id).order("level").limit(1);
    let floorId = floors?.[0]?.id;
    if (!floorId) {
      const { data: inserted } = await supabase.from("floors").insert({ warehouse_id: selectedWarehouse.id, name: "Planta baja", level: 1 }).select("id").single();
      floorId = inserted?.id;
    }
    if (editingId) {
      await supabase.from("zones").update({ name: formName.trim(), code: formCode.trim() || null }).eq("id", editingId);
    } else if (floorId) {
      await supabase.from("zones").insert({ floor_id: floorId, name: formName.trim(), code: formCode.trim() || null });
    }
    setSaving(false);
    closeForm();
    setSelectedZone(null);
    loadZones();
    if (selectedWarehouse) loadMapStructure();
  };

  const saveAisle = async () => {
    if (!selectedZone || !formName.trim()) return;
    setSaving(true);
    if (editingId) {
      await supabase.from("aisles").update({ name: formName.trim(), code: formCode.trim() || null }).eq("id", editingId);
    } else {
      await supabase.from("aisles").insert({ zone_id: selectedZone.id, name: formName.trim(), code: formCode.trim() || null });
    }
    setSaving(false);
    closeForm();
    setSelectedZone(null);
    loadAisles();
    if (selectedWarehouse) loadMapStructure();
  };

  const saveStand = async () => {
    if (!selectedAisle || !formName.trim()) return;
    const levels = Math.max(1, Math.min(20, Math.round(formLevelCount)));
    setSaving(true);
    if (editingId) {
      await supabase.from("stands").update({ name: formName.trim(), code: formCode.trim() || null }).eq("id", editingId);
    } else {
      const { data: standRow } = await supabase
        .from("stands")
        .insert({ aisle_id: selectedAisle.id, name: formName.trim(), code: formCode.trim() || null, level_count: levels })
        .select("id")
        .single();
      const standId = standRow?.id;
      if (standId) {
        for (let level = 1; level <= levels; level++) {
          await supabase.from("locations").insert({
            stand_id: standId,
            level,
            name: `${formName.trim()}-${level}`,
            code: formCode.trim() ? `${formCode.trim()}-N${level}` : null,
          });
        }
      }
    }
    setSaving(false);
    closeForm();
    setSelectedAisle(null);
    loadLocations();
    if (selectedWarehouse) loadMapStructure();
  };

  const saveLocation = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    if (editingId) {
      await supabase.from("locations").update({ name: formName.trim(), code: formCode.trim() || null }).eq("id", editingId);
    }
    setSaving(false);
    closeForm();
    loadLocations();
    if (selectedWarehouse) loadMapStructure();
  };

  const createStandLevels = async (stand: MapStand) => {
    if (stand.locations.length > 0) return;
    setCreatingLevelsForStandId(stand.id);
    try {
      for (let level = 1; level <= stand.level_count; level++) {
        await supabase.from("locations").insert({
          stand_id: stand.id,
          level,
          name: `${stand.name}-${level}`,
          code: stand.code ? `${stand.code}-N${level}` : null,
        });
      }
      if (selectedWarehouse) await loadMapStructure();
    } finally {
      setCreatingLevelsForStandId(null);
    }
  };

  const openDelete = (type: string, id: string, name: string) => {
    setDeletingItem({ type, id, name });
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    const table = deletingItem.type === "warehouse" ? "warehouses" : deletingItem.type === "zone" ? "zones" : deletingItem.type === "aisle" ? "aisles" : deletingItem.type === "stand" ? "stands" : "locations";
    await supabase.from(table).delete().eq("id", deletingItem.id);
    setDeleting(false);
    setDeleteOpen(false);
    setDeletingItem(null);
    loadWarehouses();
    if (selectedWarehouse?.id === deletingItem.id) setSelectedWarehouse(null);
    loadZones();
    if (selectedZone?.id === deletingItem.id) setSelectedZone(null);
    loadAisles();
    if (selectedAisle?.id === deletingItem.id) setSelectedAisle(null);
    if (selectedStand?.id === deletingItem.id) setSelectedStand(null);
    loadLocations();
    if (selectedWarehouse && deletingItem.type !== "warehouse") loadMapStructure();
  };

  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: "Inventario", href: "/inventario" },
    { label: "Ubicaciones", href: "/inventario/ubicaciones" },
  ];
  if (selectedWarehouse) breadcrumbItems.push({ label: selectedWarehouse.name });

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-500 dark:text-slate-400">Cargando…</p>
      </div>
    );
  }

  if (!branchId) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">No tienes una sucursal asignada. Asigna una desde Roles o Sucursales.</p>
      </div>
    );
  }

  const renderCards = (
    title: string,
    titleIcon: string,
    items: { id: string; name: string; code?: string | null }[],
    type: "warehouse" | "zone" | "aisle" | "location",
    addLabel: string,
    itemIcon: string,
    onSelect?: (item: { id: string; name: string }) => void,
    getItemSubtitle?: (item: { id: string; name: string; code?: string | null }) => string | undefined
  ) => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-slate-50">
          <span className="material-symbols-outlined text-[22px] text-ov-pink dark:text-ov-pink-muted">{titleIcon}</span>
          {title}
        </h2>
        <button
          type="button"
          onClick={() => openForm(type)}
          className="inline-flex items-center gap-2 rounded-xl bg-ov-pink px-4 py-2.5 text-[13px] font-medium text-white shadow-sm hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {addLabel}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <button
            type="button"
            onClick={() => openForm(type)}
            className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 transition-colors hover:border-ov-pink/50 hover:bg-ov-pink/5 dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-ov-pink/50 dark:hover:bg-ov-pink/10"
          >
            <span className="material-symbols-outlined text-[32px] text-slate-400 dark:text-slate-500">{itemIcon}</span>
            <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Aún no hay registros</span>
            <span className="text-[12px] text-ov-pink dark:text-ov-pink-muted">Crear uno</span>
          </button>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900 ${
                onSelect ? "cursor-pointer hover:border-ov-pink/40 hover:shadow-md dark:hover:border-ov-pink/40" : ""
              }`}
            >
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex min-w-0 flex-1 flex-col items-start text-left"
                >
                  <div className="flex w-full items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ov-pink/10 text-ov-pink dark:bg-ov-pink/20 dark:text-ov-pink-muted">
                      <span className="material-symbols-outlined text-[24px]">{itemIcon}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-slate-50">{item.name}</p>
                      {"code" in item && item.code && (
                        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{item.code}</p>
                      )}
                      {getItemSubtitle?.(item) && (
                        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{getItemSubtitle(item)}</p>
                      )}
                    </div>
                    <span className="material-symbols-outlined shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-ov-pink dark:text-slate-500 dark:group-hover:text-ov-pink-muted">
                      arrow_forward
                    </span>
                  </div>
                </button>
              ) : (
                <div className="flex w-full items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ov-pink/10 text-ov-pink dark:bg-ov-pink/20 dark:text-ov-pink-muted">
                    <span className="material-symbols-outlined text-[24px]">{itemIcon}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-50">{item.name}</p>
                    {"code" in item && item.code && (
                      <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{item.code}</p>
                    )}
                    {getItemSubtitle?.(item) && (
                      <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{getItemSubtitle(item)}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openForm(type, item); }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  title="Editar"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Editar
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openDelete(type, item.id, item.name); }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ov-pink hover:bg-ov-pink/10 dark:hover:bg-ov-pink/20"
                  title="Eliminar"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const backButton = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-label="Volver a bodegas"
      className="inline-flex items-center justify-center rounded-lg p-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ov-pink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-ov-pink-muted"
    >
      <span className="material-symbols-outlined text-[22px]">arrow_back</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="mt-2 flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-50">
            <span className="material-symbols-outlined text-ov-pink dark:text-ov-pink-muted">warehouse</span>
            Ubicaciones bodega
          </h1>
          {selectedWarehouse && (
            <p className="mt-0.5 text-[14px] font-medium text-slate-600 dark:text-slate-400">
              Mapa de {selectedWarehouse.name}
            </p>
          )}
          <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">
            {branchName && <span>Sucursal: {branchName}. </span>}
            Entra a una bodega para ver el mapa de zonas, pasillos y estantes. Asigna productos a cada ubicación.
          </p>
        </div>
        {selectedWarehouse && (
          <div className="flex flex-wrap items-center gap-2">
            {backButton(() => {
              setSelectedWarehouse(null);
              loadWarehouseStats();
            })}
            <button
              type="button"
              onClick={() => selectedWarehouse && loadMapStructure()}
              disabled={mapLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Actualizar mapa"
            >
              <span className={`material-symbols-outlined text-[18px] ${mapLoading ? "animate-spin" : ""}`}>refresh</span>
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => openForm("zone")}
              className="inline-flex items-center gap-2 rounded-xl bg-ov-pink px-4 py-2.5 text-[13px] font-medium text-white shadow-sm hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Añadir zona
            </button>
          </div>
        )}
      </div>

      {!selectedWarehouse && renderCards(
        "Bodegas y almacenes",
        "warehouse",
        warehouses,
        "warehouse",
        "Bodega / Almacén",
        "warehouse",
        (w) => setSelectedWarehouse(w as Warehouse),
        (item) => {
          const s = warehouseStats[item.id];
          if (!s || (s.zones === 0 && s.aisles === 0 && s.locations === 0)) return undefined;
          return `${s.zones} zona${s.zones !== 1 ? "s" : ""} · ${s.aisles} pasillo${s.aisles !== 1 ? "s" : ""} · ${s.locations} estante${s.locations !== 1 ? "s" : ""}`;
        }
      )}

      {selectedWarehouse && (
        <>
          {mapLoading ? (
            <p className="text-[14px] text-slate-500 dark:text-slate-400">Cargando mapa…</p>
          ) : !mapStructure || mapStructure.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/30">
              <span className="material-symbols-outlined text-[40px] text-slate-400 dark:text-slate-500">map</span>
              <p className="mt-2 text-[14px] font-medium text-slate-600 dark:text-slate-400">No hay zonas en esta bodega</p>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Añade la primera zona para ver el mapa.</p>
              <button
                type="button"
                onClick={() => openForm("zone")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ov-pink px-4 py-2.5 text-[13px] font-medium text-white hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Añadir zona
              </button>
            </div>
          ) : mapViewMode === "grid" ? (
            <>
              <p className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500 ring-1 ring-white dark:ring-slate-800" aria-hidden />
                  Lleno
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white dark:ring-slate-800" aria-hidden />
                  Hay espacio
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-800" aria-hidden />
                  Libre
                </span>
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {mapStructure.map((zone) => (
                <section
                  key={zone.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-slate-50">
                      <span className="material-symbols-outlined text-[20px] text-ov-pink dark:text-ov-pink-muted">grid_on</span>
                      {zone.name}
                      {zone.code && <span className="text-[12px] font-normal text-slate-500 dark:text-slate-400">({zone.code})</span>}
                    </h3>
                    <button
                      type="button"
                      onClick={() => { setSelectedZone(zone); setZoneConfigOpen(zone.id); }}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-ov-pink dark:hover:bg-slate-700 dark:hover:text-slate-300 dark:hover:text-ov-pink-muted"
                      title="Configurar zona"
                    >
                      <span className="material-symbols-outlined text-[22px]">settings</span>
                    </button>
                  </div>
                  <div className="p-4">
                    {zone.aisles.length === 0 ? (
                      <p className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
                        Sin pasillos. Abre configuración para añadir.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {zone.aisles.map((aisle) => (
                          <div key={aisle.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex w-28 shrink-0 items-center gap-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-400">
                              <span className="material-symbols-outlined text-[16px]">view_agenda</span>
                              {aisle.name}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                              {aisle.stands.map((stand) => {
                                const standLocKeys = stand.locations.map((l) => String(l.id).toLowerCase());
                                const allItems = standLocKeys.flatMap((key) => locationStock[key] ?? []);
                                const totalUnits = allItems.reduce((s, x) => s + x.quantity, 0);
                                const refCount = new Set(allItems.map((x) => x.product_name)).size;
                                const levelsWithStock = standLocKeys.filter((key) => (locationStock[key] ?? []).reduce((s, x) => s + x.quantity, 0) > 0).length;
                                const totalLevels = stand.locations.length || stand.level_count;
                                const occupancyStatus = totalUnits === 0 ? "free" : (levelsWithStock >= totalLevels ? "full" : "space");
                                const occupancyLabel = occupancyStatus === "full" ? "Lleno" : occupancyStatus === "space" ? "Hay espacio" : "Libre";
                                const occupancyColor = occupancyStatus === "full" ? "bg-red-500" : occupancyStatus === "space" ? "bg-amber-500" : "bg-emerald-500";
                                return (
                                <div key={stand.id} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 p-1 dark:border-slate-700 dark:bg-slate-800/30">
                                  <button
                                    type="button"
                                    onClick={() => setStandDetailOpen({ stand, aisleName: aisle.name, zoneName: zone.name })}
                                    className="flex shrink-0 items-start gap-1 rounded px-1.5 py-1 text-left transition-colors hover:bg-ov-pink/10 dark:hover:bg-ov-pink/20"
                                    title={`${occupancyLabel} · Ver ${stand.name} · ${stand.level_count} niveles${totalUnits > 0 ? ` · ${refCount} ref · ${totalUnits} und` : ""}`}
                                  >
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${occupancyColor} ring-1 ring-white dark:ring-slate-800`} title={occupancyLabel} aria-hidden />
                                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[14px] text-slate-500 dark:text-slate-400 sm:text-[16px]">shelves</span>
                                    <span className="flex flex-col">
                                      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 sm:text-[11px]">{stand.name}</span>
                                      <span className="text-[9px] leading-tight text-slate-500 dark:text-slate-500 sm:text-[10px]">
                                        {stand.level_count} nivel{stand.level_count !== 1 ? "es" : ""}
                                        {totalUnits > 0 && (
                                          <> · {refCount} ref · <span className="font-semibold text-ov-pink dark:text-ov-pink-muted">{totalUnits} und</span></>
                                        )}
                                      </span>
                                    </span>
                                  </button>
                                  {stand.locations.map((loc) => {
                                    const locKey = String(loc.id).toLowerCase();
                                    const stockHere = locationStock[locKey] ?? [];
                                    const totalUnits = stockHere.reduce((s, x) => s + x.quantity, 0);
                                    const productLabel = stockHere.length === 0
                                      ? null
                                      : stockHere.length === 1
                                        ? stockHere[0].product_name
                                        : `${stockHere.length} productos`;
                                    return (
                                      <div
                                        key={loc.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setLocationDetailOpen({ locationId: locKey, locationName: loc.name, aisleName: aisle.name, zoneName: zone.name })}
                                        onKeyDown={(e) => e.key === "Enter" && setLocationDetailOpen({ locationId: locKey, locationName: loc.name, aisleName: aisle.name, zoneName: zone.name })}
                                        className="group relative flex min-h-[72px] w-24 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-slate-200 bg-slate-50/80 px-1 py-1.5 text-center shadow-sm transition-all hover:border-ov-pink/50 hover:bg-ov-pink/10 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-ov-pink/50 dark:hover:bg-ov-pink/10"
                                        title={stockHere.length ? `${loc.name}: ${stockHere.map((p) => `${p.product_name} (${p.quantity})`).join(", ")}` : loc.name}
                                      >
                                        <span className="truncate w-full text-[11px] font-medium text-slate-800 dark:text-slate-200">N{loc.level}</span>
                                        {productLabel !== null && (
                                          <span className="mt-0.5 min-h-0 max-w-full truncate text-[10px] leading-tight text-slate-600 dark:text-slate-400" title={productLabel}>
                                            {productLabel}
                                          </span>
                                        )}
                                        {totalUnits > 0 && (
                                          <span className="mt-0.5 text-[10px] font-semibold text-ov-pink dark:text-ov-pink-muted">{totalUnits} und</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
            </>
          ) : (
            <div className="space-y-6">
              {mapStructure.map((zone) => (
                <section
                  key={zone.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-slate-50">
                      <span className="material-symbols-outlined text-[20px] text-ov-pink dark:text-ov-pink-muted">grid_on</span>
                      {zone.name}
                      {zone.code && <span className="text-[12px] font-normal text-slate-500 dark:text-slate-400">({zone.code})</span>}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { setSelectedZone(zone); openForm("aisle"); }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-ov-pink/10 px-2.5 py-1.5 text-[12px] font-medium text-ov-pink hover:bg-ov-pink/20 dark:text-ov-pink-muted dark:hover:bg-ov-pink/30"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Pasillo
                      </button>
                      <button type="button" onClick={() => openForm("zone", zone)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300" title="Editar zona">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button type="button" onClick={() => openDelete("zone", zone.id, zone.name)} className="rounded-lg p-1.5 text-ov-pink hover:bg-ov-pink/10 dark:hover:bg-ov-pink/20" title="Eliminar zona">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {zone.aisles.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => { setSelectedZone(zone); openForm("aisle"); }}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-4 text-[13px] text-slate-500 transition-colors hover:border-ov-pink/40 hover:text-ov-pink dark:border-slate-700 dark:text-slate-400 dark:hover:border-ov-pink/40 dark:hover:text-ov-pink-muted"
                      >
                        <span className="material-symbols-outlined text-[20px]">view_agenda</span>
                        Añadir primer pasillo
                      </button>
                    ) : (
                      zone.aisles.map((aisle) => (
                        <div key={aisle.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700 dark:text-slate-300">
                              <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">view_agenda</span>
                              {aisle.name}
                              {aisle.code && <span className="font-normal text-slate-500 dark:text-slate-400">({aisle.code})</span>}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => { setSelectedAisle(aisle); openForm("stand"); }}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-ov-pink hover:bg-ov-pink/10 dark:hover:bg-ov-pink/20"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                Estante
                              </button>
                              <button type="button" onClick={() => openForm("aisle", aisle)} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300" title="Editar pasillo">
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button type="button" onClick={() => openDelete("aisle", aisle.id, aisle.name)} className="rounded p-1 text-ov-pink hover:bg-ov-pink/10 dark:hover:bg-ov-pink/20" title="Eliminar pasillo">
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {aisle.stands.length === 0 ? (
                              <button
                                type="button"
                                onClick={() => { setSelectedAisle(aisle); openForm("stand"); }}
                                className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[12px] text-slate-500 hover:border-ov-pink/50 hover:text-ov-pink dark:border-slate-600 dark:hover:border-ov-pink/50"
                              >
                                + Estante
                              </button>
                            ) : (
                              aisle.stands.map((stand) => (
                                <div
                                  key={stand.id}
                                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                                >
                                  <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">inventory_2</span>
                                  <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{stand.name}</span>
                                  {stand.code && <span className="text-[11px] text-slate-500 dark:text-slate-400">{stand.code}</span>}
                                  <button type="button" onClick={() => openForm("stand", { id: stand.id, name: stand.name, code: stand.code, level_count: stand.level_count })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300" title="Editar">
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                  </button>
                                  <button type="button" onClick={() => openDelete("stand", stand.id, stand.name)} className="rounded p-1 text-ov-pink hover:bg-ov-pink/10 dark:hover:text-ov-pink dark:hover:bg-ov-pink/20" title="Eliminar">
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal formulario */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70" onClick={closeForm} aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {editingId ? "Editar" : "Nueva"}
              {formOpen === "warehouse" && " bodega/almacén"}
              {formOpen === "zone" && " zona"}
              {formOpen === "aisle" && " pasillo"}
              {formOpen === "stand" && " estante (stand)"}
              {formOpen === "location" && " nivel/ubicación"}
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className={labelClass}>Nombre</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={inputClass}
                  placeholder={
                    formOpen === "warehouse" ? "Ej. Bodega Norte, Almacén Central" :
                    formOpen === "zone" ? "Ej. Zona A, Sector B, Área C" :
                    formOpen === "aisle" ? "Ej. Pasillo A, Pasillo 1" :
                    formOpen === "stand" ? "Ej. Estante A1, Stand B2" :
                    "Ej. A1-1, Nivel 1"
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Código (opcional)</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className={inputClass}
                  placeholder={
                    formOpen === "warehouse" ? "Ej. BOD-NORTE, ALM-01" :
                    formOpen === "zone" ? "Ej. ZA, ZB, ZC" :
                    formOpen === "aisle" ? "Ej. P1, P-A" :
                    formOpen === "stand" ? "Ej. A1, E-B2" :
                    "Ej. E-B2, A-1"
                  }
                />
              </div>
              {formOpen === "stand" && !editingId && (
                <div>
                  <label className={labelClass}>Niveles en altura</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formLevelCount}
                    onChange={(e) => setFormLevelCount(Number(e.target.value) || 1)}
                    className={inputClass}
                    placeholder="Ej. 5"
                  />
                  <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Número de niveles (1–20) del stand. Se crearán tantas ubicaciones.</p>
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={closeForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (formOpen === "warehouse") saveWarehouse();
                  else if (formOpen === "zone") saveZone();
                  else if (formOpen === "aisle") saveAisle();
                  else if (formOpen === "stand") saveStand();
                  else if (formOpen === "location") saveLocation();
                }}
                disabled={saving || !formName.trim()}
                className="rounded-lg bg-ov-pink px-4 py-2 text-[13px] font-medium text-white hover:bg-ov-pink-hover disabled:opacity-50 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {zoneConfigOpen && (() => {
        const configZone = mapStructure?.find((z) => z.id === zoneConfigOpen);
        if (!configZone) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70" onClick={() => setZoneConfigOpen(null)} aria-hidden="true" />
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h3 className="flex items-center gap-2 text-[17px] font-bold text-slate-900 dark:text-slate-50">
                  <span className="material-symbols-outlined text-ov-pink dark:text-ov-pink-muted">settings</span>
                  Configurar {configZone.name}
                </h3>
                <button type="button" onClick={() => setZoneConfigOpen(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300" aria-label="Cerrar">
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <button type="button" onClick={() => openForm("zone", configZone)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar zona
                </button>
                <button type="button" onClick={() => { openDelete("zone", configZone.id, configZone.name); setZoneConfigOpen(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-ov-pink/10 px-3 py-1.5 text-[13px] font-medium text-ov-pink hover:bg-ov-pink/20 dark:hover:bg-ov-pink/20">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Eliminar zona
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Pasillos</span>
                  <button type="button" onClick={() => openForm("aisle")} className="inline-flex items-center gap-1 rounded-lg bg-ov-pink/10 px-2.5 py-1.5 text-[12px] font-medium text-ov-pink hover:bg-ov-pink/20 dark:hover:bg-ov-pink/20">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Añadir pasillo
                  </button>
                </div>
                {configZone.aisles.length === 0 ? (
                  <p className="py-4 text-center text-[13px] text-slate-500 dark:text-slate-400">Aún no hay pasillos. Añade uno arriba.</p>
                ) : (
                  <ul className="space-y-4">
                    {configZone.aisles.map((aisle) => (
                      <li key={aisle.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                            <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-slate-400">view_agenda</span>
                            {aisle.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => { setSelectedAisle(aisle); openForm("stand"); }} className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-ov-pink dark:hover:bg-slate-700 dark:hover:text-slate-300" title="Añadir estante">
                              <span className="material-symbols-outlined text-[16px]">add</span>
                            </button>
                            <button type="button" onClick={() => openForm("aisle", aisle)} className="rounded p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-300" title="Editar pasillo">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button type="button" onClick={() => openDelete("aisle", aisle.id, aisle.name)} className="rounded p-1.5 text-ov-pink hover:bg-ov-pink/10 dark:hover:bg-ov-pink/20" title="Eliminar pasillo">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                        {aisle.stands.length > 0 && (
                          <ul className="ml-5 space-y-1.5 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                            {aisle.stands.map((stand) => {
                              const standLocKeys = stand.locations.map((l) => String(l.id).toLowerCase());
                              const totalUnits = standLocKeys.flatMap((key) => locationStock[key] ?? []).reduce((s, x) => s + x.quantity, 0);
                              const totalLevels = stand.locations.length || stand.level_count;
                              const levelsWithStock = standLocKeys.filter((key) => (locationStock[key] ?? []).reduce((s, x) => s + x.quantity, 0) > 0).length;
                              const occupancyStatus = totalUnits === 0 ? "free" : (levelsWithStock >= totalLevels ? "full" : "space");
                              const occupancyColor = occupancyStatus === "full" ? "bg-red-500" : occupancyStatus === "space" ? "bg-amber-500" : "bg-emerald-500";
                              const occupancyLabel = occupancyStatus === "full" ? "Lleno" : occupancyStatus === "space" ? "Hay espacio" : "Libre";
                              return (
                              <li key={stand.id} className="flex items-center justify-between gap-2 py-1">
                                <span className="flex items-center gap-1.5 text-[12px] text-slate-700 dark:text-slate-300">
                                  <span className={`h-2 w-2 shrink-0 rounded-full ${occupancyColor} ring-1 ring-white dark:ring-slate-800`} title={occupancyLabel} aria-hidden />
                                  <span className="material-symbols-outlined text-[14px] text-slate-500 dark:text-slate-400">shelves</span>
                                  {stand.name}
                                  <span className="text-slate-400 dark:text-slate-500">({stand.level_count} niveles)</span>
                                </span>
                                <div className="flex items-center gap-0.5">
                                  <button type="button" onClick={() => openForm("stand", { id: stand.id, name: stand.name, code: stand.code, level_count: stand.level_count })} className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-300" title="Editar estante">
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                  </button>
                                  <button type="button" onClick={() => openDelete("stand", stand.id, stand.name)} className="rounded p-1 text-ov-pink hover:bg-ov-pink/10 dark:hover:bg-ov-pink/20" title="Eliminar estante">
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                </div>
                              </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {locationDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70" onClick={() => setLocationDetailOpen(null)} aria-hidden="true" />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50">
                <span className="material-symbols-outlined text-ov-pink dark:text-ov-pink-muted">inventory_2</span>
                {locationDetailOpen.locationName}
              </h3>
              <button type="button" onClick={() => setLocationDetailOpen(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300" aria-label="Cerrar">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {locationDetailOpen.zoneName} → {locationDetailOpen.aisleName}
            </p>
            <div className="mt-4">
              {(() => {
                const items = locationStock[locationDetailOpen.locationId] ?? [];
                if (items.length === 0) {
                  return (
                    <p className="rounded-lg bg-slate-50 py-4 text-center text-[13px] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      Sin productos en este estante
                    </p>
                  );
                }
                return (
                  <ul className="space-y-2">
                    {items.map((p, i) => (
                      <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 py-2 px-3 text-[13px] dark:bg-slate-800/50">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{p.product_name}</span>
                        <span className="shrink-0 font-semibold text-slate-700 dark:text-slate-300">{p.quantity} und</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {standDetailOpen && (() => {
        const stand = standDetailOpen.stand;
        const byRef: Record<string, { level: number; quantity: number }[]> = {};
        let totalUnits = 0;
        stand.locations.forEach((loc) => {
          const locKey = String(loc.id).toLowerCase();
          const items = locationStock[locKey] ?? [];
          items.forEach((p) => {
            if (!byRef[p.product_name]) byRef[p.product_name] = [];
            byRef[p.product_name].push({ level: loc.level, quantity: p.quantity });
            totalUnits += p.quantity;
          });
        });
        const refCount = Object.keys(byRef).length;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70" onClick={() => setStandDetailOpen(null)} aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50">
                <span className="material-symbols-outlined text-ov-pink dark:text-ov-pink-muted">shelves</span>
                {stand.name}
              </h3>
              <button type="button" onClick={() => setStandDetailOpen(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300" aria-label="Cerrar">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 shrink-0">
              {standDetailOpen.zoneName} → {standDetailOpen.aisleName}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500 shrink-0">
              {stand.level_count} nivel{stand.level_count !== 1 ? "es" : ""}
              {refCount > 0 && (
                <span className="ml-2 font-semibold text-ov-pink dark:text-ov-pink-muted">
                  · {refCount} referencia{refCount !== 1 ? "s" : ""} · {totalUnits} und
                </span>
              )}
            </p>
            <div className="mt-4 overflow-y-auto flex-1 min-h-0 space-y-4">
              {refCount > 0 && (
                <div className="rounded-lg border border-ov-pink/20 bg-ov-pink/5 p-3 dark:bg-ov-pink/10">
                  <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">Referencias en este estante</h4>
                  <ul className="space-y-2">
                    {Object.entries(byRef).map(([productName, levels]) => {
                      const total = levels.reduce((s, x) => s + x.quantity, 0);
                      return (
                        <li key={productName} className="rounded-lg bg-white/80 py-2 px-3 text-[12px] dark:bg-slate-800/50">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{productName}</span>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                            {levels.map(({ level, quantity }) => (
                              <span key={level}>Nivel {level}: <span className="font-semibold">{quantity} und</span></span>
                            ))}
                            <span className="font-semibold text-ov-pink dark:text-ov-pink-muted">Total: {total} und</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <div>
                <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">Por nivel</h4>
                {stand.locations.length === 0 && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                    <p className="text-[12px] text-amber-700 dark:text-amber-300 mb-2">Este estante no tiene niveles creados en el sistema. Por eso no se muestran los productos aquí ni en el mapa.</p>
                    <button
                      type="button"
                      onClick={() => createStandLevels(stand)}
                      disabled={creatingLevelsForStandId === stand.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-ov-pink px-3 py-2 text-[13px] font-medium text-white hover:bg-ov-pink/90 disabled:opacity-60"
                    >
                      {creatingLevelsForStandId === stand.id ? "Creando…" : "Crear niveles"}
                    </button>
                  </div>
                )}
                <div className="space-y-3">
                  {(stand.locations.length === 0 ? Array.from({ length: stand.level_count }, (_, i) => ({ id: `placeholder-${stand.id}-${i}`, level: i + 1 })) : stand.locations).map((loc: Location | { id: string; level: number }) => {
                    const locId = "id" in loc && typeof loc.id === "string" ? loc.id : "";
                    const isPlaceholder = locId.startsWith("placeholder-");
                    const locKey = locId ? String(locId).toLowerCase() : "";
                    const items = !isPlaceholder && locKey ? (locationStock[locKey] ?? []) : [];
                    const levelTotal = items.reduce((s, x) => s + x.quantity, 0);
                    const level = "level" in loc ? loc.level : 1;
                    return (
                      <div key={"id" in loc ? loc.id : `level-${level}`} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Nivel {level}</span>
                          {levelTotal > 0 && !isPlaceholder && (
                            <span className="text-[12px] font-semibold text-ov-pink dark:text-ov-pink-muted">{levelTotal} und</span>
                          )}
                        </div>
                        {isPlaceholder ? (
                          <p className="text-[12px] text-amber-600 dark:text-amber-400">Sin datos de ubicación.{stand.locations.length === 0 ? " Usa el botón «Crear niveles» de arriba." : " Recarga el mapa."}</p>
                        ) : items.length === 0 ? (
                          <p className="text-[12px] text-slate-500 dark:text-slate-400">Sin productos en este nivel</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {items.map((p, i) => (
                              <li key={i} className="flex items-center justify-between text-[12px]">
                                <span className="text-slate-700 dark:text-slate-300">{p.product_name}</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{p.quantity} und</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 shrink-0 border-t border-slate-200 pt-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  openForm("stand", { id: stand.id, name: stand.name, code: stand.code, level_count: stand.level_count });
                  setStandDetailOpen(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Editar estante
              </button>
              <button
                type="button"
                onClick={() => {
                  openDelete("stand", stand.id, stand.name);
                  setStandDetailOpen(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ov-pink/10 px-3 py-2 text-[13px] font-medium text-ov-pink hover:bg-ov-pink/20 dark:hover:bg-ov-pink/20 dark:hover:bg-ov-pink/30"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Eliminar estante
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeletingItem(null); }}
        title={deletingItem ? `Eliminar ${deletingItem.name}` : ""}
        message={deletingItem ? (deletingItem.type === "stand" ? `¿Eliminar "${deletingItem.name}"? Se eliminarán también todos los niveles del estante y el stock en ellos.` : `¿Eliminar "${deletingItem.name}"? Se eliminarán también todos los niveles inferiores (zonas, pasillos, estantes) si los hay.`) : ""}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
