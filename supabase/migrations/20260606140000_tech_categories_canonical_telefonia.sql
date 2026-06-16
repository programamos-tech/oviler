-- Catálogo canónico tienda tech (todas las orgs): incluye Telefonía y limpia seeds viejos de accesorios.

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

CREATE OR REPLACE FUNCTION migrate_legacy_phone_categories_for_org(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_telefonia UUID;
  v_cables UUID;
  v_perifericos UUID;
BEGIN
  IF p_org_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM seed_default_tech_store_categories(p_org_id);

  SELECT id INTO v_telefonia FROM categories
  WHERE organization_id = p_org_id AND name = 'Telefonía' LIMIT 1;
  SELECT id INTO v_cables FROM categories
  WHERE organization_id = p_org_id AND name = 'Cables y adaptadores' LIMIT 1;
  SELECT id INTO v_perifericos FROM categories
  WHERE organization_id = p_org_id AND name = 'Periféricos' LIMIT 1;

  IF v_telefonia IS NOT NULL THEN
    UPDATE products p SET category_id = v_telefonia
    FROM categories old_c
    WHERE p.category_id = old_c.id
      AND old_c.organization_id = p_org_id
      AND old_c.name = ANY(ARRAY[
        'Fundas', 'Cargadores', 'Protección de pantalla', 'Smartwatch y wearables',
        'Power banks', 'Accesorios para carro', 'Gadgets y adaptadores'
      ]);
  END IF;

  IF v_cables IS NOT NULL THEN
    UPDATE products p SET category_id = v_cables
    FROM categories old_c
    WHERE p.category_id = old_c.id
      AND old_c.organization_id = p_org_id
      AND old_c.name = 'Cables';
  END IF;

  IF v_perifericos IS NOT NULL THEN
    UPDATE products p SET category_id = v_perifericos
    FROM categories old_c
    WHERE p.category_id = old_c.id
      AND old_c.organization_id = p_org_id
      AND old_c.name = ANY(ARRAY['Soportes', 'Accesorios de escritorio']);
  END IF;

  DELETE FROM categories old_c
  WHERE old_c.organization_id = p_org_id
    AND old_c.name = ANY(ARRAY[
      'Accesorios para carro',
      'Cables',
      'Cargadores',
      'Fundas',
      'Gadgets y adaptadores',
      'Power banks',
      'Protección de pantalla',
      'Smartwatch y wearables',
      'Soportes',
      'Accesorios de escritorio'
    ])
    AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = old_c.id);
END;
$$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM organizations
  LOOP
    PERFORM migrate_legacy_phone_categories_for_org(r.id);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION seed_default_tech_store_categories(UUID) IS
  'Catálogo canónico de tienda tech (Periféricos, Telefonía, Audio, …) para cualquier organización.';

COMMENT ON FUNCTION migrate_legacy_phone_categories_for_org(UUID) IS
  'Migra productos de categorías legacy de accesorios de telefonía al catálogo canónico y elimina las obsoletas.';
