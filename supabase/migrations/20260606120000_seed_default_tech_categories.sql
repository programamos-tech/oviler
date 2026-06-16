-- Categorías por defecto para tiendas de tecnología al crear una organización.

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

CREATE OR REPLACE FUNCTION trg_seed_tech_categories_on_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_default_tech_store_categories(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_seed_tech_categories ON organizations;
CREATE TRIGGER organizations_seed_tech_categories
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trg_seed_tech_categories_on_org();

-- Organizaciones existentes sin categorías: precargar el catálogo tech.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT o.id
    FROM organizations o
    WHERE NOT EXISTS (
      SELECT 1 FROM categories c WHERE c.organization_id = o.id
    )
  LOOP
    PERFORM seed_default_tech_store_categories(r.id);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION seed_default_tech_store_categories(UUID) IS
  'Inserta categorías estándar de tienda de tecnología (sin duplicar nombres existentes).';
