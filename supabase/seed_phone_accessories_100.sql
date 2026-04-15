-- Seed: 100 productos para tienda de accesorios de telefonía (Oviler).
-- Inserta categorías, productos (con imagen), y stock por sucursal.
--
-- Cómo usar:
-- 1) Supabase Studio -> SQL Editor -> pegar y ejecutar este archivo.
-- 2) Si quieres apuntar a otro usuario, cambia v_user_email.

DO $$
DECLARE
  v_org_id UUID;
  v_cat_id UUID;
  v_prod_id UUID;
  v_branch RECORD;
  v_user_email TEXT := 'programamos.st@gmail.com';

  i INT;
  cat_idx INT;
  model_idx INT;
  brand_idx INT;
  stock_qty INT;

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
  -- 1) Resolver organización por email (misma lógica de seeds previos).
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
    SELECT b.organization_id INTO v_org_id
    FROM branches b
    INNER JOIN user_branches ub ON ub.branch_id = b.id
    ORDER BY b.created_at DESC
    LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No se encontró organización para email % ni por fallback de sucursales.', v_user_email;
    RETURN;
  END IF;

  -- 2) Categorías base de la tienda.
  INSERT INTO categories (organization_id, name, display_order)
  SELECT v_org_id, categories[idx], idx - 1
  FROM generate_subscripts(categories, 1) AS idx
  ON CONFLICT (organization_id, name)
  DO UPDATE SET display_order = EXCLUDED.display_order;

  -- 3) Limpiar seed anterior ACC-* para poder re-ejecutar sin duplicar.
  DELETE FROM products
  WHERE organization_id = v_org_id
    AND sku LIKE 'ACC-%';

  -- 4) Crear 100 productos con nombres por categoría.
  FOR i IN 1..100 LOOP
    cat_idx := ((i - 1) % array_length(categories, 1)) + 1;
    brand_idx := ((i - 1) % array_length(brands, 1)) + 1;
    model_idx := ((i - 1) % array_length(phone_models, 1)) + 1;

    cat_name := categories[cat_idx];
    brand_name := brands[brand_idx];
    model_name := phone_models[model_idx];
    prod_sku := 'ACC-' || LPAD(i::TEXT, 4, '0');
    image_url := 'https://picsum.photos/seed/oviler-phone-' || LPAD(i::TEXT, 4, '0') || '/900/900';
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

  -- 5) Crear stock para TODAS las sucursales vinculadas a usuarios.
  FOR v_branch IN
    SELECT DISTINCT b.id AS branch_id
    FROM branches b
    INNER JOIN user_branches ub ON ub.branch_id = b.id
    WHERE b.organization_id = v_org_id
  LOOP
    FOR v_prod_id IN
      SELECT id
      FROM products
      WHERE organization_id = v_org_id
        AND sku LIKE 'ACC-%'
    LOOP
      stock_qty := 8 + (random() * 65)::INT;
      INSERT INTO inventory (product_id, branch_id, location, quantity, min_stock)
      VALUES (v_prod_id, v_branch.branch_id, 'local', stock_qty, 5)
      ON CONFLICT (product_id, branch_id, location)
      DO UPDATE SET quantity = EXCLUDED.quantity, min_stock = 5, updated_at = NOW();
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seed completado: 100 productos ACC-* de accesorios de telefonía creados para la org %.', v_org_id;
END $$;
