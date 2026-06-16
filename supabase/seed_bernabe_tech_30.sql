-- Catálogo limpio: 30 productos únicos de tienda de tecnología para bernabe@tech.com
-- Reemplaza el seed genérico BRN-* (nombres repetidos).

DO $$
DECLARE
  v_user_email TEXT := 'bernabe@tech.com';
  v_org_id UUID;
  v_cat_id UUID;
  v_prod_id UUID;
  v_stock INT;
  v_branch RECORD;
  r RECORD;
  i INT := 0;
BEGIN
  SELECT u.organization_id INTO v_org_id
  FROM users u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(v_user_email))
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuario % no encontrado.', v_user_email;
  END IF;

  PERFORM migrate_legacy_phone_categories_for_org(v_org_id);
  PERFORM seed_default_tech_store_categories(v_org_id);

  DELETE FROM product_imei_units u
  USING products p
  WHERE u.product_id = p.id
    AND p.organization_id = v_org_id
    AND (p.sku LIKE 'BRN-%' OR p.sku LIKE 'TECH-%');

  DELETE FROM products
  WHERE organization_id = v_org_id
    AND (sku LIKE 'BRN-%' OR sku LIKE 'TECH-%' OR sku LIKE 'RET-%' OR sku LIKE 'LIVE-%');

  CREATE TEMP TABLE _tech_catalog (
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    cat TEXT NOT NULL,
    base_price NUMERIC NOT NULL,
    base_cost NUMERIC NOT NULL,
    brand TEXT NOT NULL,
    requires_imei BOOLEAN NOT NULL DEFAULT false
  ) ON COMMIT DROP;

  INSERT INTO _tech_catalog (name, sku, cat, base_price, base_cost, brand, requires_imei) VALUES
    ('Mouse inalámbrico Logitech M650', 'TECH-P001', 'Periféricos', 89900, 52000, 'Logitech', false),
    ('Teclado mecánico Redragon K552 RGB', 'TECH-P002', 'Periféricos', 189900, 112000, 'Redragon', false),
    ('Webcam Full HD Logitech C920', 'TECH-P003', 'Periféricos', 249900, 165000, 'Logitech', false),
    ('Redmi Note 13 128GB negro', 'TECH-T001', 'Telefonía', 649900, 520000, 'Xiaomi', true),
    ('Samsung Galaxy A25 128GB', 'TECH-T002', 'Telefonía', 799900, 640000, 'Samsung', true),
    ('Motorola Edge 40 Neo 256GB', 'TECH-T003', 'Telefonía', 999900, 820000, 'Motorola', true),
    ('Audífonos Sony WH-CH520', 'TECH-A001', 'Audio', 149900, 95000, 'Sony', false),
    ('Parlante portátil JBL Flip 6', 'TECH-A002', 'Audio', 399900, 285000, 'JBL', false),
    ('Micrófono USB Fifine K669B', 'TECH-A003', 'Audio', 129900, 78000, 'Fifine', false),
    ('Hub USB-C 7 en 1 UGREEN', 'TECH-C001', 'Cables y adaptadores', 119900, 72000, 'UGREEN', false),
    ('Cable HDMI 2.1 2 metros', 'TECH-C002', 'Cables y adaptadores', 45900, 24000, 'Baseus', false),
    ('Cargador GaN 65W dual USB-C', 'TECH-C003', 'Cables y adaptadores', 89900, 52000, 'Anker', false),
    ('SSD Kingston NV2 1TB M.2', 'TECH-S001', 'Almacenamiento', 279900, 210000, 'Kingston', false),
    ('Memoria USB SanDisk 128GB', 'TECH-S002', 'Almacenamiento', 42900, 26000, 'SanDisk', false),
    ('MicroSD Samsung Pro Plus 256GB', 'TECH-S003', 'Almacenamiento', 89900, 58000, 'Samsung', false),
    ('Router WiFi 6 TP-Link Archer AX55', 'TECH-R001', 'Redes y conectividad', 449900, 320000, 'TP-Link', false),
    ('Extensor WiFi Mercusys ME30', 'TECH-R002', 'Redes y conectividad', 129900, 82000, 'Mercusys', false),
    ('Switch Gigabit 8 puertos Tenda', 'TECH-R003', 'Redes y conectividad', 99900, 62000, 'Tenda', false),
    ('Memoria RAM Kingston Fury 16GB DDR4', 'TECH-K001', 'Componentes de PC', 169900, 125000, 'Kingston', false),
    ('Fuente de poder EVGA 650W 80+ Bronze', 'TECH-K002', 'Componentes de PC', 329900, 245000, 'EVGA', false),
    ('Placa madre ASUS PRIME B550M-A', 'TECH-K003', 'Componentes de PC', 449900, 360000, 'ASUS', false),
    ('Monitor LG 24" Full HD 75Hz', 'TECH-M001', 'Monitores', 549900, 410000, 'LG', false),
    ('Monitor Samsung 27" Curvo 144Hz', 'TECH-M002', 'Monitores', 899900, 680000, 'Samsung', false),
    ('Monitor portátil ARZOPA 15.6"', 'TECH-M003', 'Monitores', 499900, 370000, 'ARZOPA', false),
    ('Cartucho tinta HP 664 negro', 'TECH-I001', 'Impresión y consumibles', 69900, 42000, 'HP', false),
    ('Resma papel carta 500 hojas', 'TECH-I002', 'Impresión y consumibles', 18900, 11000, 'Rey', false),
    ('Impresora Epson EcoTank L1250', 'TECH-I003', 'Impresión y consumibles', 899900, 720000, 'Epson', false),
    ('Control inalámbrico Xbox Series X', 'TECH-G001', 'Gaming', 249900, 175000, 'Microsoft', false),
    ('Headset gamer HyperX Cloud Stinger', 'TECH-G002', 'Gaming', 199900, 130000, 'HyperX', false),
    ('Mouse pad XL Razer Goliathus', 'TECH-G003', 'Gaming', 79900, 45000, 'Razer', false);

  FOR r IN SELECT * FROM _tech_catalog ORDER BY sku LOOP
    i := i + 1;

    SELECT id INTO v_cat_id
    FROM categories
    WHERE organization_id = v_org_id AND name = r.cat
    LIMIT 1;

    IF v_cat_id IS NULL THEN
      RAISE EXCEPTION 'Categoría % no encontrada', r.cat;
    END IF;

    INSERT INTO products (
      organization_id, name, sku, category_id, brand, description,
      base_price, base_cost, apply_iva, requires_imei
    ) VALUES (
      v_org_id,
      r.name,
      r.sku,
      v_cat_id,
      r.brand,
      'Producto de catálogo tienda de tecnología.',
      r.base_price,
      r.base_cost,
      false,
      r.requires_imei
    )
    RETURNING id INTO v_prod_id;

    IF NOT r.requires_imei THEN
      v_stock := 8 + ((i * 7) % 35);
      FOR v_branch IN
        SELECT b.id FROM branches b WHERE b.organization_id = v_org_id ORDER BY b.created_at
      LOOP
        INSERT INTO inventory (product_id, branch_id, location, quantity)
        VALUES (v_prod_id, v_branch.id, 'local', v_stock)
        ON CONFLICT (product_id, branch_id, location)
        DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
      END LOOP;
    END IF;
  END LOOP;

  RAISE NOTICE 'Bernabé tech catalog: % productos TECH-* para %.', i, v_user_email;
END;
$$;
