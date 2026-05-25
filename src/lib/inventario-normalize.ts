export function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

type LocationTree = {
  id: string;
  name: string;
  level?: number;
  stands?: {
    name: string;
    aisles?: {
      name: string;
      zones?: {
        name: string;
        floors?: { name: string; level?: number; warehouses?: { name: string } };
      };
    };
  };
};

export function buildLocationPath(loc: LocationTree | null | undefined): string {
  if (!loc) return "";
  const stand = pickOne(loc.stands as LocationTree["stands"] | LocationTree["stands"][] | null | undefined);
  if (!stand?.aisles) return loc.name ?? "";
  const a = pickOne(stand.aisles as NonNullable<typeof stand.aisles> | NonNullable<typeof stand.aisles>[]);
  if (!a) return loc.name ?? "";
  const z = pickOne(a.zones as NonNullable<typeof a.zones> | NonNullable<typeof a.zones>[]);
  const f = pickOne(z?.floors as NonNullable<typeof z>["floors"] | NonNullable<NonNullable<typeof z>["floors"]>[]);
  const w = pickOne(f?.warehouses as { name: string } | { name: string }[] | null | undefined);
  return [w?.name, z?.name, a?.name, stand?.name, loc.level != null ? `Nivel ${loc.level}` : loc.name]
    .filter(Boolean)
    .join(" → ");
}

export type InventarioLocationRow = {
  quantity: number;
  path: string;
  locationId: string;
};

export function normalizeProductCategoryName(
  categories: { name: string } | { name: string }[] | null | undefined
): string | null {
  const cat = pickOne(categories);
  return cat?.name ?? null;
}
