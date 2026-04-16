-- Seed: hasta 100 productos + 100 clientes para la cuenta Bernabé (email public.users: bernabe@tech.com).
-- Respeta check_product_limit(): si el plan tiene max_products (p. ej. free = 50), solo inserta los que quepan.
-- Idempotente: borra solo filas de seeds anteriores de este script (SKU BRN-* y cédulas 9200000xxx).
--
-- Cómo ejecutarlo:
--   • Producción o local: Supabase Dashboard → SQL Editor → pegar todo → Run.
--   • Con psql (exporta antes la cadena de conexión del proyecto):
--       export DATABASE_URL='postgresql://...'
--       npm run db:seed:bernabe
--
-- Requisitos: usuario bernabe@tech.com en public.users, organization_id válido, al menos una sucursal
-- (y fila en user_branches para inventario multi-sucursal).

DO $$
DECLARE
  v_user_email TEXT := 'bernabe@tech.com';
  v_org_id UUID;
  v_branch_id UUID;
  v_cat_id UUID;
  v_prod_id UUID;
  v_customer_id UUID;
  v_branch RECORD;

  i INT;
  cat_idx INT;
  model_idx INT;
  brand_idx INT;
  stock_qty INT;
  v_max_products INT;
  v_current_products INT;
  v_product_target INT;

  cat_name TEXT;
  model_name TEXT;
  brand_name TEXT;
  prod_name TEXT;
  prod_desc TEXT;
  prod_sku TEXT;
  image_url TEXT;
  base_price NUMERIC(10,2);
  base_cost NUMERIC(10,2);
  apply_iva BOOLEAN;

  categories TEXT[] := ARRAY[
    'Fundas',
    'Cargadores',
    'Cables',
    'Audio',
    'Soportes',
    'Protección de pantalla',
    'Power banks',
    'Accesorios para carro',
    'Smartwatch y wearables',
    'Gadgets y adaptadores'
  ];

  brands TEXT[] := ARRAY[
    'Anker',
    'UGREEN',
    'Baseus',
    'Belkin',
    'Spigen',
    'ESR',
    'Xiaomi',
    'Samsung',
    'Apple',
    'Genérico Pro'
  ];

  phone_models TEXT[] := ARRAY[
    'iPhone 15',
    'iPhone 15 Pro',
    'iPhone 14',
    'Galaxy S24',
    'Galaxy S23',
    'Galaxy A55',
    'Xiaomi 14',
    'Redmi Note 13',
    'Moto G84',
    'Poco X6'
  ];
BEGIN
  SELECT u.organization_id INTO v_org_id
  FROM users u
  INNER JOIN user_branches ub ON ub.user_id = u.id
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(v_user_email))
  LIMIT 1;

  IF v_org_id IS NULL THEN
    SELECT u.organization_id INTO v_org_id
    FROM users u
    WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(v_user_email))
    LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró organización para %. El usuario debe existir en public.users (idealmente con user_branches).', v_user_email;
  END IF;

  SELECT ub.branch_id INTO v_branch_id
  FROM users u
  INNER JOIN user_branches ub ON ub.user_id = u.id
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(v_user_email))
  ORDER BY ub.branch_id
  LIMIT 1;

  IF v_branch_id IS NULL THEN
    SELECT b.id INTO v_branch_id
    FROM branches b
    WHERE b.organization_id = v_org_id
    ORDER BY b.created_at ASC NULLS LAST, b.id ASC
    LIMIT 1;
  END IF;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'No hay sucursal para la organización %. Crea una sucursal y asóciala al usuario.', v_org_id;
  END IF;

  -- Quitar demo previo de este script (misma org)
  DELETE FROM customer_addresses ca
  USING customers c
  WHERE ca.customer_id = c.id
    AND c.organization_id = v_org_id
    AND c.branch_id = v_branch_id
    AND c.cedula ~ '^9200000[0-9]{3}$';

  DELETE FROM customers c
  WHERE c.organization_id = v_org_id
    AND c.branch_id = v_branch_id
    AND c.cedula ~ '^9200000[0-9]{3}$';

  DELETE FROM products
  WHERE organization_id = v_org_id
    AND sku LIKE 'BRN-%';

  SELECT max_products INTO v_max_products FROM organizations WHERE id = v_org_id;
  SELECT COUNT(*)::int INTO v_current_products FROM products WHERE organization_id = v_org_id;

  IF v_max_products IS NULL OR v_max_products >= 999999 THEN
    v_product_target := 100;
  ELSE
    v_product_target := LEAST(100, GREATEST(0, v_max_products - v_current_products));
  END IF;

  IF v_product_target = 0 THEN
    RAISE NOTICE 'Bernabé seed: sin cupo de productos (límite %, % ya en catálogo). Se omiten productos BRN; se crean clientes.', v_max_products, v_current_products;
  ELSIF v_product_target < 100 THEN
    RAISE NOTICE 'Bernabé seed: plan permite % referencias, hay % productos → insertando % (máx. 100 del seed).', v_max_products, v_current_products, v_product_target;
  END IF;

  INSERT INTO categories (organization_id, name, display_order)
  SELECT v_org_id, categories[idx], idx - 1
  FROM generate_subscripts(categories, 1) AS idx
  ON CONFLICT (organization_id, name)
  DO UPDATE SET display_order = EXCLUDED.display_order;

  FOR i IN 1..v_product_target LOOP
    cat_idx := ((i - 1) % array_length(categories, 1)) + 1;
    brand_idx := ((i - 1) % array_length(brands, 1)) + 1;
    model_idx := ((i - 1) % array_length(phone_models, 1)) + 1;

    cat_name := categories[cat_idx];
    brand_name := brands[brand_idx];
    model_name := phone_models[model_idx];
    prod_sku := 'BRN-' || LPAD(i::TEXT, 4, '0');
    image_url := 'https://picsum.photos/seed/bernabe-demo-' || LPAD(i::TEXT, 4, '0') || '/900/900';
    apply_iva := (i % 4 = 0);

    IF cat_name = 'Fundas' THEN
      prod_name := 'Funda ' || brand_name || ' antigolpes para ' || model_name;
      prod_desc := 'Funda con esquinas reforzadas, acabado mate y agarre antideslizante.';
      base_price := 39000 + ((i % 7) * 4000);
    ELSIF cat_name = 'Cargadores' THEN
      prod_name := 'Cargador rápido ' || brand_name || ' ' || (20 + ((i % 4) * 10)) || 'W';
      prod_desc := 'Carga rápida segura con protección contra sobrecalentamiento y sobrecarga.';
      base_price := 59000 + ((i % 6) * 6000);
    ELSIF cat_name = 'Cables' THEN
      prod_name := 'Cable ' || brand_name || ' USB-C ' || (1 + (i % 3)) || 'm';
      prod_desc := 'Cable trenzado de alta resistencia, compatible con carga rápida y datos.';
      base_price := 22000 + ((i % 6) * 3000);
    ELSIF cat_name = 'Audio' THEN
      prod_name := 'Audífonos bluetooth ' || brand_name || ' TWS';
      prod_desc := 'Sonido envolvente, micrófono dual y estuche con carga compacta.';
      base_price := 89000 + ((i % 8) * 9000);
    ELSIF cat_name = 'Soportes' THEN
      prod_name := 'Soporte ajustable ' || brand_name || ' para escritorio';
      prod_desc := 'Soporte plegable de aluminio para videollamadas y consumo de contenido.';
      base_price := 45000 + ((i % 5) * 5000);
    ELSIF cat_name = 'Protección de pantalla' THEN
      prod_name := 'Vidrio templado premium para ' || model_name;
      prod_desc := 'Protección 9H con borde 2.5D y recubrimiento oleofóbico anti huellas.';
      base_price := 18000 + ((i % 4) * 2500);
    ELSIF cat_name = 'Power banks' THEN
      prod_name := 'Power bank ' || brand_name || ' ' || (10000 + ((i % 4) * 5000)) || 'mAh';
      prod_desc := 'Batería externa portátil con doble salida y carga segura inteligente.';
      base_price := 95000 + ((i % 7) * 8000);
    ELSIF cat_name = 'Accesorios para carro' THEN
      prod_name := 'Soporte magnético de carro ' || brand_name;
      prod_desc := 'Montaje firme para rejilla o tablero con ajuste de ángulo 360 grados.';
      base_price := 34000 + ((i % 6) * 4500);
    ELSIF cat_name = 'Smartwatch y wearables' THEN
      prod_name := 'Correa deportiva ' || brand_name || ' para smartwatch';
      prod_desc := 'Correa cómoda y transpirable, ideal para entrenamiento y uso diario.';
      base_price := 32000 + ((i % 6) * 4000);
    ELSE
      prod_name := 'Adaptador multitoma ' || brand_name || ' tipo C';
      prod_desc := 'Adaptador compacto para audio, carga y transferencia de datos simultánea.';
      base_price := 52000 + ((i % 7) * 5500);
    END IF;

    base_cost := ROUND(base_price * (0.52 + ((i % 5) * 0.04)), 2);

    SELECT id INTO v_cat_id
    FROM categories
    WHERE organization_id = v_org_id
      AND name = cat_name
    LIMIT 1;

    INSERT INTO products (
      organization_id,
      name,
      sku,
      description,
      brand,
      category_id,
      base_cost,
      base_price,
      apply_iva,
      image_url
    )
    VALUES (
      v_org_id,
      prod_name,
      prod_sku,
      prod_desc,
      brand_name,
      v_cat_id,
      base_cost,
      base_price,
      apply_iva,
      image_url
    )
    RETURNING id INTO v_prod_id;
  END LOOP;

  FOR v_branch IN
    SELECT b.id AS branch_id
    FROM branches b
    WHERE b.organization_id = v_org_id
  LOOP
    FOR v_prod_id IN
      SELECT id
      FROM products
      WHERE organization_id = v_org_id
        AND sku LIKE 'BRN-%'
    LOOP
      stock_qty := 8 + (random() * 65)::INT;
      INSERT INTO inventory (product_id, branch_id, location, quantity, min_stock)
      VALUES (v_prod_id, v_branch.branch_id, 'local', stock_qty, 5)
      ON CONFLICT (product_id, branch_id, location)
      DO UPDATE SET quantity = EXCLUDED.quantity, min_stock = 5, updated_at = NOW();
    END LOOP;
  END LOOP;

  FOR i IN 1..100 LOOP
    INSERT INTO customers (organization_id, branch_id, name, cedula, email, phone, active)
    VALUES (
      v_org_id,
      v_branch_id,
      'Cliente Bernabé demo ' || LPAD(i::text, 3, '0'),
      (9200000000 + i)::text,
      'bernabe.seed.' || i::text || '@nou.local',
      '320' || LPAD((3000000 + i)::text, 7, '0'),
      true
    )
    RETURNING id INTO v_customer_id;

    INSERT INTO customer_addresses (customer_id, label, address, reference_point, is_default, display_order)
    VALUES (
      v_customer_id,
      'Principal',
      'Calle Bernabé ' || i || ' # ' || (10 + (i % 90)) || '-' || (20 + (i % 80)),
      'Ref. seed Bernabé · fila ' || i,
      true,
      0
    );
  END LOOP;

  RAISE NOTICE 'Bernabé: % productos BRN-* + 100 clientes (cédulas 9200000…) en org % branch %.', v_product_target, v_org_id, v_branch_id;
END $$;
