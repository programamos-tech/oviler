-- Seed: Restaurante simulado - Hamburguesas, salchipapas, pizzas, bebidas, etc.
-- Inserta productos en TU organización y stock en TODAS las sucursales que tengan usuarios asignados.
--
-- Cómo ejecutar: Supabase Studio → SQL Editor, pegar y ejecutar.

DO $$
DECLARE
  v_org_id UUID;
  v_cat_id UUID;
  v_prod_id UUID;
  v_stock INT;
  v_branch RECORD;
  v_user_email TEXT := 'andresruss.st@gmail.com';
BEGIN
  -- Organización del usuario con este correo (que tenga sucursal asignada)
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
    RAISE NOTICE 'No se encontró usuario con email %. Regístrate o crea sucursal.', v_user_email;
    RETURN;
  END IF;

  -- Categorías del restaurante (display_order: 0, 1, 2...)
  INSERT INTO categories (organization_id, name, display_order)
  VALUES
    (v_org_id, 'Hamburguesas', 0),
    (v_org_id, 'Salchipapas', 1),
    (v_org_id, 'Pizzas', 2),
    (v_org_id, 'Bebidas', 3),
    (v_org_id, 'Combos', 4),
    (v_org_id, 'Postres', 5),
    (v_org_id, 'Acompañamientos', 6)
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- Borrar productos del seed anterior (SKU REST-*)
  DELETE FROM products WHERE organization_id = v_org_id AND sku LIKE 'REST-%';

  -- Helper: insertar producto y stock
  -- Usamos un bloque por categoría para asignar v_cat_id y luego insertar productos.

  -- ========== HAMBURGUESAS ==========
  SELECT id INTO v_cat_id FROM categories WHERE organization_id = v_org_id AND name = 'Hamburguesas' LIMIT 1;
  INSERT INTO products (organization_id, name, sku, category_id, base_price, base_cost, apply_iva)
  VALUES
    (v_org_id, 'Hamburguesa Sencilla', 'REST-HB-01', v_cat_id, 13000, 5500, false),
    (v_org_id, 'Hamburguesa de Pollo', 'REST-HB-02', v_cat_id, 14500, 6000, false),
    (v_org_id, 'Hamburguesa Doble Carne', 'REST-HB-03', v_cat_id, 18000, 7500, false),
    (v_org_id, 'Hamburguesa Mixta', 'REST-HB-04', v_cat_id, 18000, 7800, false),
    (v_org_id, 'Mr. Burger', 'REST-HB-05', v_cat_id, 16500, 7000, false),
    (v_org_id, 'Mr. Especial', 'REST-HB-06', v_cat_id, 19000, 8200, false),
    (v_org_id, 'Hamburguesa Ranchera', 'REST-HB-07', v_cat_id, 19000, 8000, false),
    (v_org_id, 'Triple Carne Especial', 'REST-HB-08', v_cat_id, 28500, 12000, false),
    (v_org_id, 'Hamburguesa BBQ', 'REST-HB-09', v_cat_id, 16000, 6800, false),
    (v_org_id, 'Hamburguesa Criolla', 'REST-HB-10', v_cat_id, 15500, 6500, false),
    (v_org_id, 'Hamburguesa Clásica con Queso', 'REST-HB-11', v_cat_id, 14000, 5800, false),
    (v_org_id, 'Hamburguesa Vegetariana', 'REST-HB-12', v_cat_id, 15000, 6200, false);

  -- ========== SALCHIPAPAS ==========
  SELECT id INTO v_cat_id FROM categories WHERE organization_id = v_org_id AND name = 'Salchipapas' LIMIT 1;
  INSERT INTO products (organization_id, name, sku, category_id, base_price, base_cost, apply_iva)
  VALUES
    (v_org_id, 'Salchipapa Clásica', 'REST-SP-01', v_cat_id, 12000, 4500, false),
    (v_org_id, 'Salchipapa Especial', 'REST-SP-02', v_cat_id, 15000, 5800, false),
    (v_org_id, 'Salchipapa Super', 'REST-SP-03', v_cat_id, 18000, 7000, false),
    (v_org_id, 'Salchipapa Mixta', 'REST-SP-04', v_cat_id, 16000, 6200, false),
    (v_org_id, 'Salchipapa con Queso', 'REST-SP-05', v_cat_id, 14000, 5200, false),
    (v_org_id, 'Salchipapa Doble Salchicha', 'REST-SP-06', v_cat_id, 17000, 6500, false),
    (v_org_id, 'Salchipapa Ranchera', 'REST-SP-07', v_cat_id, 16500, 6400, false),
    (v_org_id, 'Salchipapa Criolla', 'REST-SP-08', v_cat_id, 15500, 6000, false);

  -- ========== PIZZAS ==========
  SELECT id INTO v_cat_id FROM categories WHERE organization_id = v_org_id AND name = 'Pizzas' LIMIT 1;
  INSERT INTO products (organization_id, name, sku, category_id, base_price, base_cost, apply_iva)
  VALUES
    (v_org_id, 'Pizza Margarita', 'REST-PZ-01', v_cat_id, 22000, 9000, false),
    (v_org_id, 'Pizza Hawaiana', 'REST-PZ-02', v_cat_id, 24000, 9800, false),
    (v_org_id, 'Pizza Pepperoni', 'REST-PZ-03', v_cat_id, 23000, 9500, false),
    (v_org_id, 'Pizza Napolitana', 'REST-PZ-04', v_cat_id, 25000, 10200, false),
    (v_org_id, 'Pizza Cuatro Quesos', 'REST-PZ-05', v_cat_id, 26000, 10800, false),
    (v_org_id, 'Pizza Mixta', 'REST-PZ-06', v_cat_id, 27000, 11200, false),
    (v_org_id, 'Pizza Jamón y Champiñones', 'REST-PZ-07', v_cat_id, 24500, 10000, false),
    (v_org_id, 'Pizza Ranchera', 'REST-PZ-08', v_cat_id, 25500, 10500, false),
    (v_org_id, 'Pizza Personal Margarita', 'REST-PZ-09', v_cat_id, 12000, 5000, false),
    (v_org_id, 'Pizza Personal Pepperoni', 'REST-PZ-10', v_cat_id, 13000, 5400, false);

  -- ========== BEBIDAS ==========
  SELECT id INTO v_cat_id FROM categories WHERE organization_id = v_org_id AND name = 'Bebidas' LIMIT 1;
  INSERT INTO products (organization_id, name, sku, category_id, base_price, base_cost, apply_iva)
  VALUES
    (v_org_id, 'Coca-Cola 400ml', 'REST-BB-01', v_cat_id, 3500, 1200, false),
    (v_org_id, 'Coca-Cola 1.5L', 'REST-BB-02', v_cat_id, 6000, 2200, false),
    (v_org_id, 'Pepsi 400ml', 'REST-BB-03', v_cat_id, 3200, 1100, false),
    (v_org_id, 'Agua Mineral 500ml', 'REST-BB-04', v_cat_id, 2500, 800, false),
    (v_org_id, 'Jugo de Naranja Natural', 'REST-BB-05', v_cat_id, 4500, 1800, false),
    (v_org_id, 'Limonada', 'REST-BB-06', v_cat_id, 4000, 1500, false),
    (v_org_id, 'Gaseosa Personal', 'REST-BB-07', v_cat_id, 3000, 1000, false),
    (v_org_id, 'Cerveza Nacional', 'REST-BB-08', v_cat_id, 5000, 2000, false),
    (v_org_id, 'Cerveza Importada', 'REST-BB-09', v_cat_id, 8000, 3500, false),
    (v_org_id, 'Té Helado', 'REST-BB-10', v_cat_id, 3500, 1200, false),
    (v_org_id, 'Café', 'REST-BB-11', v_cat_id, 2500, 900, false),
    (v_org_id, 'Chocolate Caliente', 'REST-BB-12', v_cat_id, 4000, 1500, false),
    (v_org_id, 'Batido de Fresa', 'REST-BB-13', v_cat_id, 5500, 2200, false),
    (v_org_id, 'Batido de Mango', 'REST-BB-14', v_cat_id, 5500, 2200, false);

  -- ========== COMBOS (precio combo; stock se maneja por productos base) ==========
  SELECT id INTO v_cat_id FROM categories WHERE organization_id = v_org_id AND name = 'Combos' LIMIT 1;
  INSERT INTO products (organization_id, name, sku, category_id, base_price, base_cost, apply_iva)
  VALUES
    (v_org_id, 'Combo Sencilla', 'REST-CB-01', v_cat_id, 19500, 7500, false),
    (v_org_id, 'Combo Pollo', 'REST-CB-02', v_cat_id, 21500, 8500, false),
    (v_org_id, 'Combo Doble Carne', 'REST-CB-03', v_cat_id, 24500, 10000, false),
    (v_org_id, 'Combo Mr. Burger', 'REST-CB-04', v_cat_id, 23000, 9200, false),
    (v_org_id, 'Combo Mr. Especial', 'REST-CB-05', v_cat_id, 25500, 10500, false),
    (v_org_id, 'Combo Triple Carne', 'REST-CB-06', v_cat_id, 35000, 14500, false),
    (v_org_id, 'Combo Salchipapa Especial', 'REST-CB-07', v_cat_id, 18500, 7200, false),
    (v_org_id, 'Combo Pizza Personal', 'REST-CB-08', v_cat_id, 16500, 6800, false);

  -- ========== POSTRES ==========
  SELECT id INTO v_cat_id FROM categories WHERE organization_id = v_org_id AND name = 'Postres' LIMIT 1;
  INSERT INTO products (organization_id, name, sku, category_id, base_price, base_cost, apply_iva)
  VALUES
    (v_org_id, 'Brownie', 'REST-PT-01', v_cat_id, 6000, 2500, false),
    (v_org_id, 'Helado 1 Bola', 'REST-PT-02', v_cat_id, 5000, 2000, false),
    (v_org_id, 'Helado 2 Bolas', 'REST-PT-03', v_cat_id, 8000, 3200, false),
    (v_org_id, 'Torta de Chocolate', 'REST-PT-04', v_cat_id, 7500, 3000, false),
    (v_org_id, 'Cheesecake', 'REST-PT-05', v_cat_id, 8500, 3500, false),
    (v_org_id, 'Tres Leches', 'REST-PT-06', v_cat_id, 7000, 2800, false),
    (v_org_id, 'Ensalada de Frutas', 'REST-PT-07', v_cat_id, 6500, 2600, false),
    (v_org_id, 'Waffle', 'REST-PT-08', v_cat_id, 9000, 3800, false);

  -- ========== ACOMPAÑAMIENTOS ==========
  SELECT id INTO v_cat_id FROM categories WHERE organization_id = v_org_id AND name = 'Acompañamientos' LIMIT 1;
  INSERT INTO products (organization_id, name, sku, category_id, base_price, base_cost, apply_iva)
  VALUES
    (v_org_id, 'Papas Fritas', 'REST-AC-01', v_cat_id, 5000, 1800, false),
    (v_org_id, 'Papas a la Francesa Grandes', 'REST-AC-02', v_cat_id, 6500, 2500, false),
    (v_org_id, 'Onion Rings', 'REST-AC-03', v_cat_id, 6000, 2200, false),
    (v_org_id, 'Ensalada Verde', 'REST-AC-04', v_cat_id, 5500, 2000, false),
    (v_org_id, 'Porción de Queso', 'REST-AC-05', v_cat_id, 4000, 1500, false),
    (v_org_id, 'Tocineta Extra', 'REST-AC-06', v_cat_id, 4500, 1800, false),
    (v_org_id, 'Huevo Extra', 'REST-AC-07', v_cat_id, 2000, 800, false),
    (v_org_id, 'Maíz', 'REST-AC-08', v_cat_id, 3000, 1000, false);

  -- Stock en TODAS las sucursales de esta org que tengan usuarios asignados (para que veas productos en tu sucursal)
  FOR v_branch IN
    SELECT DISTINCT b.id AS branch_id
    FROM branches b
    INNER JOIN user_branches ub ON ub.branch_id = b.id
    WHERE b.organization_id = v_org_id
  LOOP
    FOR v_prod_id IN
      SELECT id FROM products WHERE organization_id = v_org_id AND sku LIKE 'REST-%'
    LOOP
      v_stock := 30 + (random() * 70)::INT;
      INSERT INTO inventory (product_id, branch_id, location, quantity, min_stock)
      VALUES (v_prod_id, v_branch.branch_id, 'local', v_stock, 5)
      ON CONFLICT (product_id, branch_id, location) DO UPDATE SET quantity = EXCLUDED.quantity, min_stock = 5;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seed restaurante completado. Org: %. Productos REST-* con stock en todas las sucursales con usuarios.', v_org_id;
END $$;
