/** Catálogo canónico de categorías para cualquier tienda de tecnología (todas las organizaciones). */
export const DEFAULT_TECH_STORE_CATEGORIES = [
  "Periféricos",
  "Telefonía",
  "Audio",
  "Cables y adaptadores",
  "Almacenamiento",
  "Redes y conectividad",
  "Componentes de PC",
  "Monitores",
  "Impresión y consumibles",
  "Gaming",
] as const;

/** Categorías del seed antiguo de accesorios de telefonía — se migran y eliminan. */
export const LEGACY_PHONE_ACCESSORY_CATEGORIES = [
  "Accesorios para carro",
  "Cables",
  "Cargadores",
  "Fundas",
  "Gadgets y adaptadores",
  "Power banks",
  "Protección de pantalla",
  "Smartwatch y wearables",
  "Soportes",
  "Accesorios de escritorio",
] as const;

export type DefaultTechCategoryName = (typeof DEFAULT_TECH_STORE_CATEGORIES)[number];

type CategoryInsertClient = {
  from: (table: "categories") => {
    upsert: (
      rows: Array<{ organization_id: string; name: string; display_order: number }>,
      options: { onConflict: string; ignoreDuplicates?: boolean }
    ) => PromiseLike<{ error: { message: string } | null }>;
  };
};

function defaultCategoryRows(organizationId: string) {
  return DEFAULT_TECH_STORE_CATEGORIES.map((name, display_order) => ({
    organization_id: organizationId,
    name,
    display_order,
  }));
}

/** Inserta categorías por defecto; no sobrescribe las que ya existan (mismo nombre en la org). */
export async function seedDefaultTechCategoriesForOrg(
  supabase: CategoryInsertClient,
  organizationId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("categories").upsert(defaultCategoryRows(organizationId), {
    onConflict: "organization_id,name",
    ignoreDuplicates: true,
  });

  return { error: error?.message ?? null };
}
