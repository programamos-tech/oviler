-- Seed: bodega con gran volumen de estantes y 2 referencias de prueba.
-- Crea una bodega con 300 stands (2–5 niveles por stand), 1000 ubicaciones en total.
-- Solo 2 productos: ubicados en zonas distintas, estantes distintos, niveles distintos y cantidades distintas,
-- para ver el sistema con muchos estantes y pocas referencias.
--
-- Estructura: 10 zonas × 10 pasillos × 3 stands por pasillo = 300 stands.
-- Referencia 001 → Zona A, primer estante, nivel 1, 15 und.
-- Referencia 002 → Zona E, estante hacia mitad de bodega, nivel 3, 7 und.
--
-- Requisitos: al menos una organización y una sucursal (ej. tras seed.sql o registro en la app).
-- Cómo ejecutar: copia y pega en el SQL Editor de Supabase o inclúyelo en el flujo de seed después de seed.sql.

DO $$
DECLARE
  v_org_id UUID;
  v_branch_id UUID;
  v_warehouse_id UUID;
  v_floor_id UUID;
  v_zone_id UUID;
  v_aisle_id UUID;
  v_stand_id UUID;
  v_loc_ids UUID[] := '{}';
  v_prod_id UUID;
  v_cat_id UUID;
  z INT;
  a INT;
  s INT;
  lev INT;
  v_levels INT;
  v_total_locs INT := 0;
  v_levels_arr INT[] := ARRAY[2, 3, 4, 5, 3, 4, 2, 5, 4, 3];  -- ciclo de niveles por stand (suma 35 cada 10; 300 stands = 1050, cap a 1000)
  v_stand_idx INT := 0;
BEGIN
  -- Usar la misma organización que seed.sql (o la primera disponible)
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at ASC LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No hay ninguna organización. Crea una o ejecuta antes el onboarding.';
  END IF;

  SELECT id INTO v_branch_id FROM branches WHERE organization_id = v_org_id ORDER BY created_at ASC LIMIT 1;
  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'No hay ninguna sucursal. Crea una sucursal primero.';
  END IF;

  -- Categoría para referencias
  INSERT INTO categories (organization_id, name, display_order)
  VALUES (v_org_id, 'Referencias', 999)
  ON CONFLICT (organization_id, name) DO NOTHING;
  SELECT id INTO v_cat_id FROM categories WHERE organization_id = v_org_id AND name = 'Referencias' LIMIT 1;

  -- Borrar referencias y bodega de seed anterior para poder re-ejecutar
  -- Primero inventory_locations de productos REF-%, luego productos (evita que el trigger sync_inventory use product_id ya borrado)
  DELETE FROM inventory_locations
  WHERE product_id IN (SELECT id FROM products WHERE organization_id = v_org_id AND sku LIKE 'REF-%');
  DELETE FROM products WHERE organization_id = v_org_id AND sku LIKE 'REF-%';
  SELECT id INTO v_warehouse_id FROM warehouses WHERE branch_id = v_branch_id AND name = 'Bodega Centro' LIMIT 1;
  IF v_warehouse_id IS NOT NULL THEN
    DELETE FROM inventory_locations
    WHERE location_id IN (
      SELECT l.id FROM locations l
      JOIN stands s ON s.id = l.stand_id
      JOIN aisles a ON a.id = s.aisle_id
      JOIN zones z ON z.id = a.zone_id
      JOIN floors f ON f.id = z.floor_id
      WHERE f.warehouse_id = v_warehouse_id
    );
    DELETE FROM stands
    WHERE aisle_id IN (SELECT a.id FROM aisles a JOIN zones z ON z.id = a.zone_id JOIN floors f ON f.id = z.floor_id WHERE f.warehouse_id = v_warehouse_id);
    DELETE FROM warehouses WHERE id = v_warehouse_id;
  END IF;

  -- Crear bodega + piso
  INSERT INTO warehouses (branch_id, name, code) VALUES (v_branch_id, 'Bodega Centro', 'BC') RETURNING id INTO v_warehouse_id;
  INSERT INTO floors (warehouse_id, name, level) VALUES (v_warehouse_id, 'Planta baja', 1) RETURNING id INTO v_floor_id;

  -- 10 zonas × 10 pasillos × hasta 3 stands por pasillo; cada stand con 2–5 niveles (ciclo) → total 1000 ubicaciones
  <<create_stands>>
  FOR z IN 1..10 LOOP
    INSERT INTO zones (floor_id, name, code)
    VALUES (v_floor_id, 'Zona ' || chr(64 + z), 'Z' || chr(64 + z))
    RETURNING id INTO v_zone_id;

    FOR a IN 1..10 LOOP
      INSERT INTO aisles (zone_id, name, code)
      VALUES (v_zone_id, 'Pasillo ' || a, 'P' || a)
      RETURNING id INTO v_aisle_id;

      FOR s IN 1..3 LOOP
        IF v_total_locs >= 1000 THEN
          EXIT create_stands;
        END IF;
        v_stand_idx := v_stand_idx + 1;
        v_levels := v_levels_arr[1 + ((v_stand_idx - 1) % 10)];
        IF v_total_locs + v_levels > 1000 THEN
          v_levels := 1000 - v_total_locs;
        END IF;
        v_total_locs := v_total_locs + v_levels;

        INSERT INTO stands (aisle_id, name, code, level_count)
        VALUES (v_aisle_id, 'Estante ' || chr(64 + z) || ((a - 1) * 3 + s), 'E' || z || '-' || ((a - 1) * 3 + s), v_levels)
        RETURNING id INTO v_stand_id;

        FOR lev IN 1..v_levels LOOP
          INSERT INTO locations (stand_id, level, name, code)
          VALUES (v_stand_id, lev, chr(64 + z) || ((a - 1) * 3 + s) || '-' || lev, 'E' || z || '-' || ((a - 1) * 3 + s) || '-N' || lev)
          RETURNING id INTO v_prod_id;
          v_loc_ids := array_append(v_loc_ids, v_prod_id);
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP create_stands;

  IF array_length(v_loc_ids, 1) <> 1000 THEN
    RAISE EXCEPTION 'Se esperaban 1000 ubicaciones, se crearon %', array_length(v_loc_ids, 1);
  END IF;

  -- Crear 2 referencias de prueba en ubicaciones distintas (zona, estante, nivel y cantidad diferentes)
  -- Referencia 001 → Zona A, primer estante, nivel 1 (v_loc_ids[1])
  INSERT INTO products (organization_id, name, sku, category_id, base_price, base_cost, apply_iva)
  VALUES (v_org_id, 'Referencia 001', 'REF-001', v_cat_id, 19.99, 8.50, true)
  RETURNING id INTO v_prod_id;
  INSERT INTO inventory_locations (product_id, location_id, quantity)
  VALUES (v_prod_id, v_loc_ids[1], 15)
  ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();

  -- Referencia 002 → Zona E (mitad del mapa), estante distinto, nivel 3 (v_loc_ids[500] ≈ Zona E/F)
  INSERT INTO products (organization_id, name, sku, category_id, base_price, base_cost, apply_iva)
  VALUES (v_org_id, 'Referencia 002', 'REF-002', v_cat_id, 45.00, 22.00, false)
  RETURNING id INTO v_prod_id;
  INSERT INTO inventory_locations (product_id, location_id, quantity)
  VALUES (v_prod_id, v_loc_ids[500], 7)
  ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();

  RAISE NOTICE 'Seed completado: Bodega Centro con 300 stands y 1000 ubicaciones. 2 referencias: Ref 001 en Zona A (15 und), Ref 002 en Zona E/F (7 und).';
END $$;
