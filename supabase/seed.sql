-- Seed: 50 productos de prueba para la primera organización y stock en la primera sucursal.
-- Requisitos: al menos una organización y una sucursal (p. ej. tras registrarte en la app).
--
-- Cómo ejecutar:
-- 1. Con Supabase local: supabase db reset  (aplica migraciones y este seed; borra la DB).
-- 2. Solo este seed (sin borrar datos): copia y pega este archivo en el SQL Editor del dashboard de Supabase.

DO $$
DECLARE
  v_org_id UUID;
  v_branch_id UUID;
  v_prod_id UUID;
  v_cat_id UUID;
  i INT;
  prod_name TEXT;
  prod_sku TEXT;
  prod_cat TEXT;
  prod_brand TEXT;
  prod_price DECIMAL;
  prod_cost DECIMAL;
  prod_iva BOOLEAN;
  stock_qty INT;
  names TEXT[] := ARRAY[
    'iPhone 17 PRO', 'Samsung Galaxy S25', 'Audífonos Bluetooth', 'Cargador USB-C', 'Funda iPhone',
    'Coca-Cola 1.5L', 'Agua Mineral 500ml', 'Jugo Naranja 1L', 'Café Molido 500g', 'Té Verde 20 bolsas',
    'Arroz Premium 1kg', 'Aceite Girasol 900ml', 'Pasta Spaghetti 400g', 'Leche Entera 1L', 'Huevos x12',
    'Detergente Líquido 2L', 'Jabón Barra x3', 'Cloro 1L', 'Escoba', 'Trapeador',
    'Camiseta Básica', 'Pantalón Jeans', 'Zapatos Deportivos', 'Gorra', 'Bufanda',
    'Laptop Stand', 'Mouse Inalámbrico', 'Teclado Mecánico', 'Webcam HD', 'Hub USB 4 puertos',
    'Minipeluche Rosa', 'Juego de Mesa', 'Puzzle 500 piezas', 'Pelota Fútbol', 'Raqueta Tenis',
    'Shampoo 400ml', 'Crema Dental', 'Desodorante', 'Papel Higiénico x4', 'Toallas de Papel',
    'Galletas Integrales', 'Barra de Cereal', 'Maní con Chocolate', 'Gomitas', 'Chocolate Tableta',
    'Cerveza Six Pack', 'Vino Tinto 750ml', 'Ron 750ml', 'Vodka 750ml', 'Agua Tónica 1L'
  ];
  categories TEXT[] := ARRAY['Telefonía', 'Accesorios', 'Bebidas', 'Abarrotes', 'Limpieza', 'Ropa', 'Electrónica', 'Juguetes', 'Higiene', 'Snacks', 'Licores'];
  brands TEXT[] := ARRAY['Apple', 'Samsung', 'Genérico', 'Coca-Cola', 'Alpina', 'P&G', 'Nike', 'Adidas', 'Logitech', NULL];
BEGIN
  -- Andrés Russ's Organization (id conocido)
  v_org_id := 'f3e44998-8d9a-4012-a8d2-f437095e405f'::UUID;

  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
    RAISE NOTICE 'No existe la organización con ese id.';
    RETURN;
  END IF;

  SELECT b.id INTO v_branch_id
  FROM branches b
  WHERE b.organization_id = v_org_id AND b.name ILIKE '%torocell%'
  LIMIT 1;
  IF v_branch_id IS NULL THEN
    RAISE NOTICE 'No se encontró sucursal Torocell. Los productos se crearán sin stock.';
  END IF;

  -- Asegurar que existan las categorías en la tabla categories (única fuente del filtro)
  INSERT INTO categories (organization_id, name, display_order)
  SELECT v_org_id, unnest(categories), generate_series(0, array_length(categories, 1) - 1)
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- Borrar productos de prueba anteriores (SKU-001 a SKU-050) para poder re-ejecutar el seed
  DELETE FROM products WHERE organization_id = v_org_id AND sku LIKE 'SKU-%';

  FOR i IN 1..50 LOOP
    prod_name := names[1 + ((i - 1) % array_length(names, 1))];
    prod_sku := 'SKU-' || LPAD(i::TEXT, 3, '0');
    prod_cat := categories[1 + ((i - 1) % array_length(categories, 1))];
    prod_brand := brands[1 + ((i - 1) % (array_length(brands, 1)))];
    prod_price := (5000 + (i * 800) + (i % 5 * 1000))::DECIMAL;
    prod_cost := (prod_price * (0.4 + (i % 6) * 0.05))::DECIMAL;
    prod_iva := (i % 3) = 0;
    stock_qty := (i * 7) % 25;  -- 0..24: variedad Sin stock, Stock bajo (1-10), Con stock (11+)

    SELECT id INTO v_cat_id FROM categories WHERE organization_id = v_org_id AND name = prod_cat LIMIT 1;

    INSERT INTO products (organization_id, name, sku, category_id, brand, base_price, base_cost, apply_iva)
    VALUES (v_org_id, prod_name, prod_sku, v_cat_id, prod_brand, prod_price, prod_cost, prod_iva)
    RETURNING id INTO v_prod_id;

    IF v_branch_id IS NOT NULL THEN
      INSERT INTO inventory (product_id, branch_id, location, quantity)
      VALUES (v_prod_id, v_branch_id, 'local', stock_qty)
      ON CONFLICT (product_id, branch_id, location) DO UPDATE SET quantity = EXCLUDED.quantity;
    END IF;
  END LOOP;

  RAISE NOTICE 'Seed completado: 50 productos de prueba creados.';
END $$;
