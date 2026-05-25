-- =============================================================================
-- 500 ventas históricas — bernabe@tech.com · Berea Shopping
-- =============================================================================
-- Reparte ~500 facturas en distintos días desde HOY hacia atrás (~150 días),
-- con ítems de productos RET-* / LIVE-* / BRN-* (o cualquier SKU de la org).
--
-- Cómo ejecutar: Supabase Dashboard → SQL Editor → pegar → Run.
-- Idempotente: borra solo ventas con prefijo FV-HIST- en la sucursal objetivo.
--
-- Requisitos:
--   - Usuario bernabe@tech.com en public.users
--   - Sucursal Berea Shopping (o ajusta v_target_branch_name)
--   - Productos en catálogo (p. ej. seed_bernabe_retail_catalog.sql)
--   - Clientes en la sucursal (p. ej. seed_bernabe_live_demo.sql)
-- =============================================================================

DO $$
DECLARE
  v_user_email TEXT := 'bernabe@tech.com';
  v_target_branch_name TEXT := 'Berea Shopping';
  v_org_id UUID;
  v_branch_id UUID;
  v_branch_label TEXT;
  v_user_id UUID;
  v_customer_id UUID;
  v_sale_id UUID;
  v_prod_id UUID;
  v_unit NUMERIC(12,2);
  v_line NUMERIC(12,2);
  v_total NUMERIC(12,2);
  v_payment TEXT;
  v_status TEXT;
  v_inv TEXT;
  v_created TIMESTAMPTZ;
  v_day_offset INT;
  v_days_span INT := 150;
  v_sale_count INT := 500;

  i INT;
  j INT;
  num_items INT;
  v_qty INT;

  v_product_count INT;
  v_customer_count INT;
  v_deleted_sales INT;
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

  SELECT COUNT(*)::int INTO v_product_count
  FROM products p
  WHERE p.organization_id = v_org_id;

  SELECT COUNT(*)::int INTO v_customer_count
  FROM customers c
  WHERE c.branch_id = v_branch_id
    AND COALESCE(c.active, true) = true;

  IF v_product_count = 0 THEN
    RAISE EXCEPTION 'No hay productos en la organización. Corre seed_bernabe_retail_catalog.sql primero.';
  END IF;

  RAISE NOTICE 'Sucursal: % (%) · Productos: % · Clientes activos: %',
    COALESCE(v_branch_label, '?'), v_branch_id, v_product_count, v_customer_count;

  -- Limpieza idempotente (solo este lote histórico)
  DELETE FROM sale_items si
  USING sales s
  WHERE si.sale_id = s.id
    AND s.branch_id = v_branch_id
    AND s.invoice_number LIKE 'FV-HIST-%';

  DELETE FROM sales
  WHERE branch_id = v_branch_id
    AND invoice_number LIKE 'FV-HIST-%';

  GET DIAGNOSTICS v_deleted_sales = ROW_COUNT;

  IF v_deleted_sales > 0 THEN
    RAISE NOTICE 'Ventas FV-HIST- anteriores eliminadas: %', v_deleted_sales;
  END IF;

  FOR i IN 1..v_sale_count LOOP
    -- Reparto lineal: venta 1 = hoy, venta 500 ≈ hace 150 días
    v_day_offset := FLOOR(((i - 1)::numeric * v_days_span) / v_sale_count)::int;

    v_created :=
      DATE_TRUNC('day', NOW())
      - (v_day_offset || ' days')::interval
      + ((8 + (i % 12)) || ' hours')::interval
      + (((i * 7) % 60) || ' minutes')::interval
      + (((i * 13) % 60) || ' seconds')::interval;

    v_inv := 'FV-HIST-' || LPAD(i::text, 5, '0');

    IF i % 14 = 0 OR v_customer_count = 0 THEN
      v_customer_id := NULL;
    ELSE
      SELECT c.id INTO v_customer_id
      FROM customers c
      WHERE c.branch_id = v_branch_id
        AND COALESCE(c.active, true) = true
      ORDER BY md5(c.id::text || i::text)
      LIMIT 1;
    END IF;

    v_payment := CASE
      WHEN i % 9 = 0 THEN 'mixed'
      WHEN i % 3 = 0 THEN 'transfer'
      ELSE 'cash'
    END;

    v_status := CASE WHEN i % 31 = 0 THEN 'cancelled' ELSE 'completed' END;

    INSERT INTO sales (
      branch_id, user_id, customer_id, invoice_number, total, payment_method, status,
      is_delivery, payment_pending, delivery_paid, channel,
      amount_cash, amount_transfer, inventory_deducted_at, created_at, updated_at
    )
    VALUES (
      v_branch_id, v_user_id, v_customer_id, v_inv, 0, v_payment, v_status,
      false, false, true, 'pos',
      NULL, NULL,
      CASE WHEN v_status = 'completed' THEN v_created ELSE NULL END,
      v_created,
      v_created
    )
    RETURNING id INTO v_sale_id;

    v_total := 0;
    num_items := 1 + (i % 4);

    FOR j IN 1..num_items LOOP
      SELECT p.id, p.base_price INTO v_prod_id, v_unit
      FROM products p
      WHERE p.organization_id = v_org_id
        AND (
          p.sku LIKE 'RET-%'
          OR p.sku LIKE 'LIVE-%'
          OR p.sku LIKE 'BRN-%'
          OR p.sku IS NOT NULL
        )
      ORDER BY md5(p.id::text || (i * 17 + j)::text)
      LIMIT 1;

      IF v_prod_id IS NULL THEN
        CONTINUE;
      END IF;

      v_qty := 1 + ((i + j) % 3);
      v_line := ROUND(
        v_unit * v_qty * (1 - CASE WHEN j = 2 AND i % 6 = 0 THEN 0.08 ELSE 0 END),
        0
      );
      v_total := v_total + v_line;

      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_percent, discount_amount)
      VALUES (
        v_sale_id,
        v_prod_id,
        v_qty,
        v_unit,
        CASE WHEN j = 2 AND i % 6 = 0 THEN 8 ELSE 0 END,
        0
      );
    END LOOP;

    IF v_total <= 0 THEN
      v_total := (35000 + (i % 40) * 8200)::numeric(12,2);
      UPDATE sales SET total = v_total WHERE id = v_sale_id;
      CONTINUE;
    END IF;

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
        amount_cash = ROUND(v_total * 0.55, 0),
        amount_transfer = v_total - ROUND(v_total * 0.55, 0)
      WHERE id = v_sale_id;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ % ventas FV-HIST- creadas para %', v_sale_count, v_user_email;
  RAISE NOTICE '  Rango de fechas: hoy → hace % días · Sucursal: %', v_days_span, COALESCE(v_branch_label, v_branch_id::text);
  RAISE NOTICE '  Completadas: ~% · Anuladas: ~%', v_sale_count - (v_sale_count / 31), (v_sale_count / 31);
END $$;
