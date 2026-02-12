-- Seed: ventas de prueba con ítems (sale_items) para la primera organización.
-- Requisitos: tener ejecutado seed.sql (productos) y seed_customers.sql (clientes).
-- Ejecutar: copia y pega en el SQL Editor del dashboard de Supabase.
-- Si usas otra organización, cambia v_org_id.

DO $$
DECLARE
  v_org_id UUID := 'f3e44998-8d9a-4012-a8d2-f437095e405f'::UUID;
  v_branch_id UUID;
  v_user_id UUID;
  v_sale_id UUID;
  v_product_id UUID;
  v_product_price DECIMAL(10,2);
  v_customer_id UUID;
  v_total DECIMAL(10,2);
  v_item_total DECIMAL(10,2);
  v_invoice_num TEXT;
  i INT;
  j INT;
  num_items INT;
  v_quantity INT;
  v_unit_price DECIMAL(10,2);
  v_payment TEXT;
  product_count INT;
  customer_count INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
    RAISE NOTICE 'No existe la organización. Cambia v_org_id.';
    RETURN;
  END IF;

  SELECT id INTO v_branch_id FROM branches WHERE organization_id = v_org_id ORDER BY name LIMIT 1;
  IF v_branch_id IS NULL THEN
    RAISE NOTICE 'No hay sucursales. Crea al menos una sucursal.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM users WHERE organization_id = v_org_id LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No hay usuarios en la organización.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO product_count FROM products WHERE organization_id = v_org_id;
  SELECT COUNT(*) INTO customer_count FROM customers WHERE organization_id = v_org_id AND (active IS NULL OR active = true);
  IF product_count = 0 THEN
    RAISE NOTICE 'No hay productos. Ejecuta antes seed.sql.';
    RETURN;
  END IF;

  FOR i IN 1..50 LOOP
    -- Número de factura único
    v_invoice_num := 'FV-' || TO_CHAR(NOW() - (i * INTERVAL '1 day'), 'YYYYMMDD') || '-' || LPAD(i::TEXT, 4, '0');

    -- Cliente aleatorio (algunas ventas sin cliente)
    IF i % 5 = 0 THEN
      v_customer_id := NULL;
    ELSE
      SELECT id INTO v_customer_id
      FROM customers
      WHERE organization_id = v_org_id AND (active IS NULL OR active = true)
      ORDER BY RANDOM()
      LIMIT 1;
    END IF;

    v_payment := CASE WHEN (i % 2) = 0 THEN 'cash' ELSE 'transfer' END;

    -- Crear la venta (total se actualiza después con la suma de ítems)
    INSERT INTO sales (branch_id, user_id, customer_id, invoice_number, total, payment_method, status)
    VALUES (v_branch_id, v_user_id, v_customer_id, v_invoice_num, 0, v_payment, 'completed')
    RETURNING id INTO v_sale_id;

    v_total := 0;

    -- Entre 1 y 5 ítems por venta
    num_items := 1 + (i % 5);
    FOR j IN 1..num_items LOOP
      SELECT p.id, p.base_price INTO v_product_id, v_product_price
      FROM products p
      WHERE p.organization_id = v_org_id
      ORDER BY RANDOM()
      LIMIT 1;

      v_quantity := 1 + (i + j) % 3;
      v_unit_price := v_product_price;
      v_item_total := v_quantity * v_unit_price;
      v_total := v_total + v_item_total;

      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
      VALUES (v_sale_id, v_product_id, v_quantity, v_unit_price);
    END LOOP;

    UPDATE sales SET total = v_total WHERE id = v_sale_id;
  END LOOP;

  RAISE NOTICE 'Seed completado: 50 ventas de prueba con ítems creadas.';
END $$;
