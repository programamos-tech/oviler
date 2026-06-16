-- Actualiza categorías por defecto: tienda tech general (no telefonía / accesorios de carro).

CREATE OR REPLACE FUNCTION seed_default_tech_store_categories(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat_names TEXT[] := ARRAY[
    'Periféricos',
    'Telefonía',
    'Audio',
    'Cables y adaptadores',
    'Almacenamiento',
    'Redes y conectividad',
    'Componentes de PC',
    'Monitores',
    'Impresión y consumibles',
    'Gaming'
  ];
  i INT;
BEGIN
  IF p_org_id IS NULL THEN
    RETURN;
  END IF;

  FOR i IN 1..array_length(cat_names, 1) LOOP
    INSERT INTO categories (organization_id, name, display_order)
    VALUES (p_org_id, cat_names[i], i - 1)
    ON CONFLICT (organization_id, name) DO NOTHING;
  END LOOP;
END;
$$;

-- Orgs que solo tenían el set viejo de telefonía: agregar las nuevas que falten.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM organizations
  LOOP
    PERFORM seed_default_tech_store_categories(r.id);
  END LOOP;
END;
$$;

-- Quitar categorías por defecto del seed de telefonía (solo si no tienen productos).
DELETE FROM categories c
WHERE c.name = ANY(ARRAY[
  'Accesorios para carro',
  'Cables',
  'Cargadores',
  'Fundas',
  'Gadgets y adaptadores',
  'Power banks',
  'Protección de pantalla',
  'Smartwatch y wearables',
  'Soportes'
])
AND NOT EXISTS (
  SELECT 1 FROM products p WHERE p.category_id = c.id
);
