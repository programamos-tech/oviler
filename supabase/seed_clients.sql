-- Seed: Clientes de prueba con muchas direcciones, teléfonos (en referencia), puntos de referencia y pedidos (ventas).
-- Inserta clientes en TU organización, varias direcciones por cliente, y ventas asociadas.
-- Igual que seed_restaurant: usa el usuario con el email indicado para detectar la organización.
--
-- Cómo ejecutar: Supabase Studio → SQL Editor, pegar y ejecutar.
-- Requisitos: organización con al menos una sucursal, un usuario y productos (ej. seed_restaurant.sql).

DO $seed$
DECLARE
  v_org_id UUID;
  v_branch_id UUID;
  v_user_id UUID;
  v_customer_id UUID;
  v_addr_id UUID;
  v_sale_id UUID;
  v_product_id UUID;
  v_product_price DECIMAL(10,2);
  v_total DECIMAL(10,2);
  v_invoice_num TEXT;
  v_user_email TEXT := 'andresruss.st@gmail.com';
  i INT;
  j INT;
  k INT;
  num_addr INT;
  num_sales INT;
  num_items INT;
  v_quantity INT;
  v_unit_price DECIMAL(10,2);
  v_payment TEXT;
  v_label TEXT;
  v_address TEXT;
  v_ref TEXT;
  v_names TEXT[] := ARRAY[
    'María García López', 'Carlos Rodríguez Pérez', 'Ana Martínez Sánchez', 'Luis Hernández Díaz',
    'Laura Fernández Ruiz', 'José López Gómez', 'Carmen González Vega', 'Miguel Ángel Torres',
    'Elena Ramírez Castro', 'Francisco Jiménez Mora', 'Isabel Ruiz Navarro', 'Antonio Serrano Reyes',
    'Rosa Vargas Mendoza', 'Javier Moreno Ortega', 'Patricia Romero Soto', 'David Álvarez Campos',
    'Sandra Gil Delgado', 'Roberto Blanco Fuentes', 'Mónica Cabrera Ríos', 'Andrés Núñez Cortés',
    'Tienda El Ahorro', 'Droguería Central', 'Supermercado La 14', 'Ferretería Don José',
    'Panadería La Esquina', 'Restaurante El Rincón', 'Farmacia San Pablo', 'Papelería Estudiantil',
    'Carnicería El Buen Corte', 'Hogar María', 'Clínica Dental Sonrisa', 'Gimnasio Power',
    'Floristería Jardín', 'Lavandería Express', 'Pizzería Napoli', 'Sushi Bar Sakura',
    'Heladería Dolce', 'Café Literario', 'Bar La Esquina', 'Hotel Plaza',
    'Constructora Edificar', 'Transportes Rápido', 'Abogados & Asociados', 'Contadores Pro',
    'Diseño Web Studio', 'Repuestos Auto'
  ];
  v_labels TEXT[] := ARRAY['Casa', 'Oficina', 'Almacén', 'Entrega', 'Sucursal Norte', 'Bodega'];
  v_calles TEXT[] := ARRAY['Cra 50', 'Cl 80', 'Cra 43', 'Av 68', 'Cl 100', 'Cra 15', 'Transversal 23', 'Diagonal 45'];
  v_refs TEXT[] := ARRAY[
    'Frente al Éxito', 'Al lado de la panadería', 'Casa blanca portón negro', 'Edificio de 5 pisos',
    'Cel: 3101234567', 'Tel fijo: 6012345678', 'Segundo piso', 'Local 3',
    'Detrás del parque', 'Esquina con farmacia', 'Al lado del colegio', 'Entre carrera y calle',
    'Portería azul', 'Torre A apto 501', 'Zona industrial', 'Centro comercial'
  ];
  product_ids UUID[];
  product_prices DECIMAL(10,2)[];
  v_invoice_seq INT := 0;
BEGIN
  -- Organización del usuario con este correo
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
    RAISE NOTICE 'No se encontró usuario con email %. Cambia v_user_email o crea sucursal.', v_user_email;
    RETURN;
  END IF;

  SELECT id INTO v_branch_id FROM branches WHERE organization_id = v_org_id ORDER BY name LIMIT 1;
  IF v_branch_id IS NULL THEN
    RAISE NOTICE 'No hay sucursales en la organización.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM users WHERE organization_id = v_org_id LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No hay usuarios en la organización.';
    RETURN;
  END IF;

  -- Cargar productos de la org para ventas
  SELECT ARRAY_AGG(id), ARRAY_AGG(COALESCE(base_price, 0))
  INTO product_ids, product_prices
  FROM products WHERE organization_id = v_org_id;
  IF product_ids IS NULL OR array_length(product_ids, 1) < 1 THEN
    RAISE NOTICE 'No hay productos. Ejecuta antes seed_restaurant.sql o seed.sql.';
    RETURN;
  END IF;

  -- Borrar clientes del seed anterior (cedula SEED-*)
  DELETE FROM customers WHERE organization_id = v_org_id AND cedula LIKE 'SEED-%';

  -- ========== CLIENTES + DIRECCIONES ==========
  FOR i IN 1..array_length(v_names, 1) LOOP
    INSERT INTO customers (organization_id, name, cedula, email, phone, active)
    VALUES (
      v_org_id,
      v_names[i],
      'SEED-' || LPAD(i::TEXT, 4, '0'),
      'cliente' || LPAD(i::TEXT, 2, '0') || '@ejemplo.com',
      '3' || LPAD((100000000 + i * 111111)::TEXT, 9, '0'),
      true
    )
    RETURNING id INTO v_customer_id;

    -- Entre 2 y 4 direcciones por cliente
    num_addr := 2 + (i % 3);
    FOR j IN 1..num_addr LOOP
      v_label := v_labels[1 + (i + j) % array_length(v_labels, 1)];
      v_address := v_calles[1 + (i + j * 2) % array_length(v_calles, 1)] || ' #' || (10 + i + j) || '-' || (20 + j * 5) || ', Barrio ' || (CASE (i % 5) WHEN 0 THEN 'Centro' WHEN 1 THEN 'La Floresta' WHEN 2 THEN 'Alamos' WHEN 3 THEN 'Poblado' ELSE 'Enciso' END);
      v_ref := v_refs[1 + (i + j * 3) % array_length(v_refs, 1)];
      IF j = 1 THEN
        INSERT INTO customer_addresses (customer_id, label, address, reference_point, is_default, display_order)
        VALUES (v_customer_id, v_label, v_address, v_ref, true, j - 1)
        RETURNING id INTO v_addr_id;
      ELSE
        INSERT INTO customer_addresses (customer_id, label, address, reference_point, is_default, display_order)
        VALUES (v_customer_id, v_label, v_address, v_ref, false, j - 1)
        RETURNING id INTO v_addr_id;
      END IF;
    END LOOP;
  END LOOP;

  -- ========== VENTAS (PEDIDOS) POR CLIENTE ==========
  -- Por cada cliente con cedula SEED-*, crear entre 1 y 8 ventas
  FOR v_customer_id IN
    SELECT id FROM customers WHERE organization_id = v_org_id AND cedula LIKE 'SEED-%'
  LOOP
    num_sales := 1 + (abs(hashtext(v_customer_id::TEXT)) % 8);
    FOR k IN 1..num_sales LOOP
      v_invoice_seq := v_invoice_seq + 1;
      v_invoice_num := 'FV-SEED-' || TO_CHAR(NOW() - (k * INTERVAL '2 days'), 'YYYYMMDD') || '-' || LPAD(v_invoice_seq::TEXT, 4, '0');
      v_payment := CASE (k % 2) WHEN 0 THEN 'cash' ELSE 'transfer' END;

      INSERT INTO sales (branch_id, user_id, customer_id, invoice_number, total, payment_method, status)
      VALUES (
        v_branch_id, v_user_id, v_customer_id, v_invoice_num, 0, v_payment, 'completed'
      )
      RETURNING id INTO v_sale_id;

      v_total := 0;
      num_items := 1 + (k % 4);
      FOR j IN 1..num_items LOOP
        i := 1 + (abs(hashtext(v_sale_id::TEXT || j::TEXT)) % array_length(product_ids, 1));
        v_product_id := product_ids[i];
        v_product_price := product_prices[i];
        v_quantity := 1 + (j % 3);
        v_unit_price := v_product_price;
        v_total := v_total + v_quantity * v_unit_price;
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
        VALUES (v_sale_id, v_product_id, v_quantity, v_unit_price);
      END LOOP;
      UPDATE sales SET total = v_total WHERE id = v_sale_id;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seed clientes completado. Org: %. Clientes SEED-* con direcciones y pedidos creados.', v_org_id;
END $seed$;
