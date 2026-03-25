export type CatalogCategory = { id: string; name: string; display_order: number };

export type CatalogProductRow = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  brand: string | null;
  unit_price: number;
  image_url: string | null;
  category_id: string | null;
  category: { id: string; name: string; display_order: number } | null;
  stock: number;
};

export type CatalogPayload = {
  branch: { id: string; name: string; logo_url: string | null };
  categories: CatalogCategory[];
  products: CatalogProductRow[];
};
