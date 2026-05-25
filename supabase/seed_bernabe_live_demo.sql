-- =============================================================================
-- Demo “sistema en marcha” — bernabe@tech.com (producción o local)
-- =============================================================================
-- Crea catálogo, 100 clientes con nombres reales (sin repetir), ventas de los
-- últimos ~60 días, egresos y actividades en el muro.
--
-- Cómo ejecutar: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Idempotente: al volver a ejecutar borra solo datos con prefijos LIVE / FV-LIVE.
--
-- Requisitos: usuario bernabe@tech.com en public.users + al menos una sucursal.
-- =============================================================================

DO $$
DECLARE
  v_user_email TEXT := 'bernabe@tech.com';
  /** Sucursal donde ves la lista en la app (sidebar). Ajusta si tu sucursal tiene otro nombre. */
  v_target_branch_name TEXT := 'Berea Shopping';
  v_org_id UUID;
  v_branch_id UUID;
  v_branch_label TEXT;
  v_user_id UUID;
  v_cat_id UUID;
  v_prod_id UUID;
  v_customer_id UUID;
  v_sale_id UUID;
  v_addr_id UUID;

  i INT;
  j INT;
  k INT;
  n INT;
  stock_qty INT;
  num_items INT;
  v_qty INT;
  v_unit NUMERIC(12,2);
  v_line NUMERIC(12,2);
  v_total NUMERIC(12,2);
  v_payment TEXT;
  v_status TEXT;
  v_inv TEXT;
  v_created TIMESTAMPTZ;
  v_name TEXT;
  v_first TEXT;
  v_last TEXT;
  v_cedula TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_max_products INT;
  v_product_target INT;
  v_current_products INT;

  first_names TEXT[] := ARRAY[
    'Andrea', 'Francisco', 'Juana', 'Carlos', 'María', 'Luis', 'Patricia', 'Jorge',
    'Claudia', 'Ricardo', 'Sandra', 'Felipe', 'Diana', 'Mauricio', 'Gloria', 'Hernán',
    'Luz', 'Óscar', 'Natalia', 'Javier', 'Carmen', 'Roberto', 'Angélica', 'Esteban',
    'Liliana', 'Daniel', 'Mónica', 'Alfonso', 'Beatriz', 'Germán', 'Adriana', 'Nicolás',
    'Esperanza', 'Camilo', 'Rocío', 'Iván', 'Marcela', 'Eduardo', 'Soraya', 'Fabián',
    'Ingrid', 'Leonel', 'Yolanda', 'Gustavo', 'Paola', 'Milton', 'Teresa', 'Héctor',
    'Verónica', 'Ramiro', 'Eliana', 'Santiago', 'Maribel', 'Darío', 'Consuelo', 'Abelardo',
    'Nadia', 'Julio', 'Amparo', 'Gilberto', 'Lucía', 'René', 'Judith', 'Orlando',
    'Stefanía', 'Vicente', 'Margarita', 'Alonso', 'Jimena', 'Emilio', 'Violeta', 'Rodolfo',
    'Catalina', 'Saúl', 'Ximena', 'Benjamín', 'Lorena', 'Arturo', 'Isabella', 'Gregorio',
    'Manuela', 'Tomás', 'Elena', 'Ulises', 'Fernanda', 'Agustín', 'Pilar', 'Bernardo',
    'Rebeca', 'Cristian', 'Adrián', 'Valentina', 'Sebastián', 'Camila', 'Mateo', 'Sofía',
    'Leonardo', 'Paula', 'Hugo', 'Rosa', 'Miguel', 'Laura'
  ];

  last_names TEXT[] := ARRAY[
    'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Herrera', 'Jiménez', 'Vargas',
    'Torres', 'Ramírez', 'Morales', 'Castro', 'Ortiz', 'Rueda', 'Pineda', 'Salazar',
    'Mendoza', 'Cárdenas', 'Ospina', 'Becerra', 'Arias', 'Murillo', 'Valencia', 'Suárez',
    'Guerrero', 'Mejía', 'Correa', 'Galindo', 'Palacios', 'Acosta', 'Delgado', 'Ríos',
    'Montoya', 'Velásquez', 'Sepúlveda', 'Cifuentes', 'Barrera', 'Quiñones', 'Mosquera',
    'Henríquez', 'Parra', 'Botero', 'Zuluaga', 'Giraldo', 'Cano', 'Arboleda', 'Echeverri',
    'Franco', 'Villalobos', 'Quintero', 'Sarmiento', 'Toro', 'Agudelo', 'Cardona', 'Londoño',
    'Restrepo', 'Muñoz', 'Castaño', 'Narváez', 'Patiño', 'Rangel', 'Soto', 'Vega',
    'Molina', 'Peña', 'Rojas', 'Silva', 'Camacho', 'Duarte', 'Fajardo', 'Gaitán',
    'Hoyos', 'Ibarra', 'Jaramillo', 'Klinger', 'Lozano', 'Mesa', 'Nieto', 'Orozco',
    'Pardo', 'Quintana', 'Rivas', 'Salinas', 'Trujillo', 'Uribe', 'Vélez', 'Zapata',
    'Bustos', 'Córdoba', 'Dávila', 'Escobar', 'Forero', 'Gómez', 'Hurtado', 'Ibáñez',
    'León', 'Márquez', 'Núñez', 'Ochoa', 'Pérez', 'Quintero', 'Ramos', 'Sánchez'
  ];

  business_names TEXT[] := ARRAY[
    'Distribuidora El Faro', 'Ferretería La 43', 'Minimarket San José', 'Tecnología Norte',
    'Accesorios Móvil Plus', 'Celulares Sincelejo', 'Repuestos Rápido', 'Punto Digital',
    'Comercial Los Andes', 'Mayorista Sucre', 'Tienda La Esquina', 'Electrohogar Centro',
    'Multitienda El Progreso', 'Importaciones Caribe', 'Servicios GSM', 'Outlet Smartphone',
    'Bodega El Ahorro', 'Centro de Carga Express', 'Accesorios y Más', 'Red Celular'
  ];

  cat_names TEXT[] := ARRAY[
    'Fundas', 'Cargadores', 'Cables', 'Audio', 'Soportes', 'Protectores', 'Power banks', 'Carro'
  ];

  calles TEXT[] := ARRAY[
    'Cra 18', 'Cra 22', 'Cl 24', 'Cl 28', 'Cra 27', 'Av Bolívar', 'Cl 16', 'Cra 14',
    'Transversal 12', 'Diagonal 8', 'Cra 31', 'Cl 35', 'Cra 40', 'Cl 20'
  ];

  barrios TEXT[] := ARRAY[
    'Centro', 'San Pedro', 'Majagual', 'Chapinero', 'Villa Rosita', 'La Floresta',
    'El Carmen', 'Las Palmas', 'Ciudadela', 'Zaragocilla', 'El Bosque', 'Los Olivos'
  ];

  expense_concepts TEXT[] := ARRAY[
    'Arriendo local comercial', 'Servicios públicos', 'Nómina vendedores', 'Transporte mercancía',
    'Publicidad redes', 'Mantenimiento equipos', 'Insumos de empaque', 'Comisión datáfono',
    'Aseo y limpieza', 'Internet y telefonía', 'Compra stock urgente', 'Reparación mostrador'
  ];
BEGIN
  SELECT u.id, u.organization_id INTO v_user_id, v_org_id
  FROM users u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(v_user_email))
  LIMIT 1;

  IF v_org_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'No existe public.users para %. Créalo antes de correr este seed.', v_user_email;
  END IF;

  SELECT b.id, b.name INTO v_branch_id, v_branch_label
  FROM branches b
  INNER JOIN user_branches ub ON ub.branch_id = b.id AND ub.user_id = v_user_id
  WHERE b.organization_id = v_org_id
    AND (
      v_target_branch_name IS NULL
      OR TRIM(v_target_branch_name) = ''
      OR b.name ILIKE '%' || TRIM(v_target_branch_name) || '%'
    )
  ORDER BY
    CASE
      WHEN v_target_branch_name IS NOT NULL
        AND TRIM(v_target_branch_name) <> ''
        AND lower(b.name) = lower(trim(v_target_branch_name))
      THEN 0
      WHEN v_target_branch_name IS NOT NULL
        AND TRIM(v_target_branch_name) <> ''
        AND b.name ILIKE '%' || TRIM(v_target_branch_name) || '%'
      THEN 1
      ELSE 2
    END,
    b.created_at ASC NULLS LAST,
    b.id ASC
  LIMIT 1;

  IF v_branch_id IS NULL THEN
    SELECT b.id, b.name INTO v_branch_id, v_branch_label
    FROM branches b
    INNER JOIN user_branches ub ON ub.branch_id = b.id AND ub.user_id = v_user_id
    WHERE b.organization_id = v_org_id
    ORDER BY b.created_at ASC NULLS LAST, b.id ASC
    LIMIT 1;
  END IF;

  IF v_branch_id IS NULL THEN
    SELECT b.id, b.name INTO v_branch_id, v_branch_label
    FROM branches b
    WHERE b.organization_id = v_org_id
    ORDER BY b.created_at ASC NULLS LAST, b.id ASC
    LIMIT 1;
  END IF;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'Sin sucursal para la organización de %. Crea una sucursal primero.', v_user_email;
  END IF;

  RAISE NOTICE 'Sucursal objetivo del seed: % (%)', COALESCE(v_branch_label, '?'), v_branch_id;

  -- Quitar clientes demo viejos (seed_bernabe_100: "Cliente Bernabé demo", cédula 9200000…, @nou.local)
  DELETE FROM customer_addresses ca
  USING customers c
  WHERE ca.customer_id = c.id
    AND c.organization_id = v_org_id
    AND (
      c.cedula ~ '^9200000[0-9]{3}$'
      OR LOWER(TRIM(c.email)) LIKE 'bernabe.seed.%@nou.local'
      OR c.name ILIKE 'Cliente Bernabé demo%'
      OR c.name ILIKE 'Cliente Bernabe demo%'
    );

  DELETE FROM customers c
  WHERE c.organization_id = v_org_id
    AND (
      c.cedula ~ '^9200000[0-9]{3}$'
      OR LOWER(TRIM(c.email)) LIKE 'bernabe.seed.%@nou.local'
      OR c.name ILIKE 'Cliente Bernabé demo%'
      OR c.name ILIKE 'Cliente Bernabe demo%'
    );

  -- Limpieza idempotente (solo demo LIVE)
  DELETE FROM sale_items si
  USING sales s
  WHERE si.sale_id = s.id
    AND s.branch_id = v_branch_id
    AND s.invoice_number LIKE 'FV-LIVE-%';

  DELETE FROM sales
  WHERE branch_id = v_branch_id
    AND invoice_number LIKE 'FV-LIVE-%';

  DELETE FROM expenses
  WHERE branch_id = v_branch_id
    AND concept LIKE '[Live demo]%';

  DELETE FROM activities
  WHERE organization_id = v_org_id
    AND branch_id = v_branch_id
    AND summary LIKE '[Live demo]%';

  DELETE FROM customer_addresses ca
  USING customers c
  WHERE ca.customer_id = c.id
    AND c.branch_id = v_branch_id
    AND c.cedula LIKE '1019001%';

  DELETE FROM customers
  WHERE branch_id = v_branch_id
    AND cedula LIKE '1019001%';

  DELETE FROM inventory i
  USING products p
  WHERE i.product_id = p.id
    AND p.organization_id = v_org_id
    AND p.sku LIKE 'LIVE-%';

  DELETE FROM products
  WHERE organization_id = v_org_id
    AND sku LIKE 'LIVE-%';

  -- Categorías
  FOR i IN 1..array_length(cat_names, 1) LOOP
    INSERT INTO categories (organization_id, name, display_order)
    VALUES (v_org_id, cat_names[i], i - 1)
    ON CONFLICT (organization_id, name) DO UPDATE SET display_order = EXCLUDED.display_order;
  END LOOP;

  -- Productos (hasta 60 según cupo del plan)
  SELECT max_products INTO v_max_products FROM organizations WHERE id = v_org_id;
  SELECT COUNT(*)::int INTO v_current_products FROM products WHERE organization_id = v_org_id;

  IF v_max_products IS NULL OR v_max_products >= 999999 THEN
    v_product_target := 60;
  ELSE
    v_product_target := LEAST(60, GREATEST(0, v_max_products - v_current_products));
  END IF;

  FOR i IN 1..v_product_target LOOP
    SELECT id INTO v_cat_id
    FROM categories c
    WHERE c.organization_id = v_org_id
      AND c.name = cat_names[1 + ((i - 1) % array_length(cat_names, 1))]
    LIMIT 1;

    INSERT INTO products (
      organization_id, name, sku, description, brand, category_id,
      base_cost, base_price, apply_iva, image_url
    )
    VALUES (
      v_org_id,
      CASE (i % 8)
        WHEN 0 THEN 'Funda antigolpes premium modelo ' || (i % 12 + 1)
        WHEN 1 THEN 'Cargador rápido USB-C ' || (18 + (i % 4) * 7) || 'W'
        WHEN 2 THEN 'Cable trenzado 2m tipo C'
        WHEN 3 THEN 'Audífonos TWS con estuche'
        WHEN 4 THEN 'Soporte escritorio ajustable'
        WHEN 5 THEN 'Vidrio templado 9H'
        WHEN 6 THEN 'Power bank ' || (10000 + (i % 3) * 5000) || ' mAh'
        ELSE 'Soporte magnético para carro'
      END,
      'LIVE-' || LPAD(i::text, 4, '0'),
      'Producto demo operativo · referencia ' || i,
      (ARRAY['Anker', 'Baseus', 'UGREEN', 'Samsung', 'Xiaomi', 'Spigen'])[1 + (i % 6)],
      v_cat_id,
      ROUND((25000 + (i % 15) * 4500) * 0.55, 2),
      (25000 + (i % 15) * 4500)::numeric(12,2),
      (i % 5 = 0),
      'https://picsum.photos/seed/berea-live-' || i || '/800/800'
    )
    RETURNING id INTO v_prod_id;

    stock_qty := 12 + ((i * 3) % 55);
    INSERT INTO inventory (product_id, branch_id, location, quantity, min_stock)
    VALUES (v_prod_id, v_branch_id, 'local', stock_qty, 5)
    ON CONFLICT (product_id, branch_id, location)
    DO UPDATE SET quantity = EXCLUDED.quantity, min_stock = 5, updated_at = NOW();
  END LOOP;

  -- 100 clientes: 80 personas + 20 comercios (nombres distintos)
  FOR i IN 1..100 LOOP
    IF i <= 80 THEN
      v_first := first_names[1 + ((i - 1) % array_length(first_names, 1))];
      v_last := last_names[1 + (((i - 1) * 19 + (i - 1) / 4) % array_length(last_names, 1))];
      v_name := v_first || ' ' || v_last;
      IF i % 11 = 0 THEN
        v_name := v_name || ' ' || (ARRAY['Pérez', 'Gómez', 'Díaz', 'Moreno'])[1 + (i % 4)];
      END IF;
    ELSE
      v_name := business_names[i - 80];
    END IF;

    v_cedula := '1019001' || LPAD(i::text, 5, '0');
    v_email := lower(regexp_replace(split_part(v_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g'))
      || '.' || i::text || '@clientes-demo.co';
    v_phone := '3' || (ARRAY['00', '01', '02', '10', '11', '12', '13', '15', '16', '17'])[1 + (i % 10)]
      || LPAD((2000000 + i * 7919)::text, 7, '0');

    INSERT INTO customers (organization_id, branch_id, name, cedula, email, phone, active)
    VALUES (v_org_id, v_branch_id, v_name, v_cedula, v_email, v_phone, true)
    RETURNING id INTO v_customer_id;

    INSERT INTO customer_addresses (customer_id, label, address, reference_point, is_default, display_order)
    VALUES (
      v_customer_id,
      CASE WHEN i % 3 = 0 THEN 'Oficina' WHEN i % 3 = 1 THEN 'Casa' ELSE 'Entrega' END,
      calles[1 + (i % array_length(calles, 1))] || ' #' || (10 + (i % 80))::text || '-' || (20 + (i % 50))::text
        || ', barrio ' || barrios[1 + (i % array_length(barrios, 1))] || ', Sincelejo',
      'Cerca a ' || (ARRAY['plaza', 'colegio', 'parque', 'Éxito', 'terminal'])[1 + (i % 5)] || ' · ref ' || i,
      true,
      0
    );
  END LOOP;

  -- 125 ventas en los últimos 60 días (mix efectivo / transferencia / algunas anuladas)
  FOR i IN 1..125 LOOP
    v_created := NOW() - ((i % 60) || ' days')::interval
      - ((i % 13) || ' hours')::interval
      - ((i % 47) || ' minutes')::interval;

    v_inv := 'FV-LIVE-' || LPAD(i::text, 5, '0');

    IF i % 17 = 0 THEN
      v_customer_id := NULL;
    ELSE
      SELECT c.id INTO v_customer_id
      FROM customers c
      WHERE c.branch_id = v_branch_id
        AND c.cedula LIKE '1019001%'
      ORDER BY md5(c.id::text || i::text)
      LIMIT 1;
    END IF;

    v_payment := CASE
      WHEN i % 7 = 0 THEN 'mixed'
      WHEN i % 2 = 0 THEN 'cash'
      ELSE 'transfer'
    END;

    v_status := CASE WHEN i % 23 = 0 THEN 'cancelled' ELSE 'completed' END;

    INSERT INTO sales (
      branch_id, user_id, customer_id, invoice_number, total, payment_method, status,
      is_delivery, payment_pending, delivery_paid, channel,
      amount_cash, amount_transfer, inventory_deducted_at, created_at
    )
    VALUES (
      v_branch_id, v_user_id, v_customer_id, v_inv, 0, v_payment, v_status,
      false, false, true, 'pos',
      NULL, NULL,
      CASE WHEN v_status = 'completed' THEN v_created ELSE NULL END,
      v_created
    )
    RETURNING id INTO v_sale_id;

    v_total := 0;
    num_items := 1 + (i % 4);

    FOR j IN 1..num_items LOOP
      SELECT p.id, p.base_price INTO v_prod_id, v_unit
      FROM products p
      WHERE p.organization_id = v_org_id
        AND (p.sku LIKE 'RET-%' OR p.sku LIKE 'LIVE-%' OR p.sku LIKE 'BRN-%')
      ORDER BY md5(p.id::text || (i + j)::text)
      LIMIT 1;

      IF v_prod_id IS NULL THEN
        CONTINUE;
      END IF;

      v_qty := 1 + ((i + j) % 3);
      v_line := ROUND(v_unit * v_qty * (1 - CASE WHEN j = 2 AND i % 5 = 0 THEN 0.05 ELSE 0 END), 0);
      v_total := v_total + v_line;

      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_percent, discount_amount)
      VALUES (
        v_sale_id, v_prod_id, v_qty, v_unit,
        CASE WHEN j = 2 AND i % 5 = 0 THEN 5 ELSE 0 END,
        0
      );
    END LOOP;

    IF v_payment = 'cash' THEN
      UPDATE sales SET
        total = v_total,
        amount_cash = v_total,
        amount_transfer = 0
      WHERE id = v_sale_id;
    ELSIF v_payment = 'transfer' THEN
      UPDATE sales SET
        total = v_total,
        amount_cash = 0,
        amount_transfer = v_total
      WHERE id = v_sale_id;
    ELSE
      UPDATE sales SET
        total = v_total,
        amount_cash = ROUND(v_total * 0.6, 0),
        amount_transfer = v_total - ROUND(v_total * 0.6, 0)
      WHERE id = v_sale_id;
    END IF;
  END LOOP;

  -- Egresos recientes
  FOR i IN 1..18 LOOP
    v_created := NOW() - ((i % 45) || ' days')::interval;
    INSERT INTO expenses (branch_id, user_id, amount, payment_method, concept, notes, status, created_at)
    VALUES (
      v_branch_id,
      v_user_id,
      (45000 + (i * 12340) % 280000)::numeric(12,2),
      CASE WHEN i % 2 = 0 THEN 'cash' ELSE 'transfer' END,
      '[Live demo] ' || expense_concepts[1 + (i % array_length(expense_concepts, 1))],
      'Gasto operativo de ejemplo',
      'active',
      v_created
    );
  END LOOP;

  -- Actividades en el muro
  FOR i IN 1..28 LOOP
    v_created := NOW() - ((i % 30) || ' days')::interval;
    SELECT c.name, c.id INTO v_name, v_customer_id
    FROM customers c
    WHERE c.branch_id = v_branch_id AND c.cedula LIKE '1019001%'
    ORDER BY md5(c.id::text || 'act' || i::text)
    LIMIT 1;

    INSERT INTO activities (
      organization_id, branch_id, user_id, actor_type, action, entity_type,
      entity_id, summary, metadata, created_at
    )
    VALUES (
      v_org_id,
      v_branch_id,
      v_user_id,
      'user',
      CASE WHEN i % 3 = 0 THEN 'sale_created' ELSE 'customer_created' END,
      CASE WHEN i % 3 = 0 THEN 'sale' ELSE 'customer' END,
      CASE WHEN i % 3 = 0 THEN NULL ELSE v_customer_id END,
      CASE
        WHEN i % 3 = 0 THEN '[Live demo] Registró venta ' || 'FV-LIVE-' || LPAD((i % 125 + 1)::text, 5, '0')
        ELSE '[Live demo] Nuevo cliente: ' || COALESCE(v_name, 'Cliente')
      END,
      CASE
        WHEN i % 3 = 0 THEN jsonb_build_object('invoice_number', 'FV-LIVE-' || LPAD((i % 125 + 1)::text, 5, '0'))
        ELSE jsonb_build_object('name', v_name)
      END,
      v_created
    );
  END LOOP;

  RAISE NOTICE '✓ Demo LIVE listo para %', v_user_email;
  RAISE NOTICE '  Org: % · Sucursal: % · Productos LIVE: % · Clientes: 100 · Ventas: 125',
    v_org_id, v_branch_id, v_product_target;
  RAISE NOTICE '  (También usa productos BRN-* si ya corriste seed_bernabe_100_products_100_customers.sql)';
END $$;
