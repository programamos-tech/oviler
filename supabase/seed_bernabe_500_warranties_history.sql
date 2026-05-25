-- =============================================================================
-- 500 garantías históricas — bernabe@tech.com · Berea Shopping
-- =============================================================================
-- Crea garantías ligadas a ítems de ventas completadas (FV-HIST / FV-LIVE / otras),
-- repartidas en distintos días desde HOY hacia atrás (~150 días).
-- Una garantía por línea de venta (sale_item_id único).
--
-- Cómo ejecutar: Supabase Dashboard → SQL Editor → pegar → Run.
-- Idempotente: borra garantías cuyo motivo empieza por [Hist demo].
--
-- Requisitos:
--   - Usuario bernabe@tech.com · sucursal Berea Shopping
--   - Ventas completadas con cliente (p. ej. seed_bernabe_500_sales_history.sql)
-- =============================================================================

DO $$
DECLARE
  v_user_email TEXT := 'bernabe@tech.com';
  v_target_branch_name TEXT := 'Berea Shopping';
  v_org_id UUID;
  v_branch_id UUID;
  v_branch_label TEXT;
  v_user_id UUID;
  v_replacement_id UUID;
  v_created TIMESTAMPTZ;
  v_reviewed_at TIMESTAMPTZ;
  v_day_offset INT;
  v_days_span INT := 150;
  v_warranty_target INT := 500;
  v_inserted INT := 0;
  v_deleted INT;
  v_available INT;

  i INT;
  rec RECORD;

  warranty_reasons TEXT[] := ARRAY[
    'Talla incorrecta — cliente solicita cambio',
    'Producto con defecto de fábrica',
    'Color no coincide con el exhibido',
    'Zapatilla con despegue de suela',
    'Prenda con costura defectuosa',
    'Perfume con válvula dañada',
    'Funda no ajusta al modelo del teléfono',
    'Cliente no satisfecho — devolución',
    'Garantía por mancha en tela',
    'Reparación de cierre en chaqueta',
    'Cambio por talla agotada — producto equivalente',
    'Artículo usado en probador — cambio',
    'Devolución por compra duplicada',
    'Reparación de hebilla en cinturón',
    'Producto llegó sin etiqueta interna'
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

  RAISE NOTICE 'Sucursal: % (%)', COALESCE(v_branch_label, '?'), v_branch_id;

  DELETE FROM defective_products dp
  USING warranties w
  WHERE dp.warranty_id = w.id
    AND w.reason LIKE '[Hist demo]%';

  DELETE FROM warranties w
  WHERE w.reason LIKE '[Hist demo]%';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    RAISE NOTICE 'Garantías [Hist demo] anteriores eliminadas: %', v_deleted;
  END IF;

  SELECT COUNT(*)::int INTO v_available
  FROM sale_items si
  INNER JOIN sales s ON s.id = si.sale_id
  WHERE s.branch_id = v_branch_id
    AND s.status = 'completed'
    AND s.customer_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM warranties w WHERE w.sale_item_id = si.id
    );

  IF v_available = 0 THEN
    RAISE EXCEPTION
      'No hay líneas de venta disponibles (completadas, con cliente, sin garantía). Corre seed_bernabe_500_sales_history.sql primero.';
  END IF;

  RAISE NOTICE 'Líneas de venta disponibles para garantía: % (objetivo: %)', v_available, v_warranty_target;

  i := 0;

  FOR rec IN
    SELECT
      si.id AS sale_item_id,
      si.sale_id,
      si.product_id,
      GREATEST(1, si.quantity)::int AS item_qty,
      s.customer_id,
      s.created_at AS sale_created,
      s.invoice_number
    FROM sale_items si
    INNER JOIN sales s ON s.id = si.sale_id
    WHERE s.branch_id = v_branch_id
      AND s.status = 'completed'
      AND s.customer_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM warranties w WHERE w.sale_item_id = si.id
      )
    ORDER BY
      CASE
        WHEN s.invoice_number LIKE 'FV-HIST-%' THEN 0
        WHEN s.invoice_number LIKE 'FV-LIVE-%' THEN 1
        ELSE 2
      END,
      md5(si.id::text)
    LIMIT v_warranty_target
  LOOP
    i := i + 1;

    v_day_offset := FLOOR(((i - 1)::numeric * v_days_span) / v_warranty_target)::int;

    v_created :=
      DATE_TRUNC('day', NOW())
      - (v_day_offset || ' days')::interval
      + ((10 + (i % 9)) || ' hours')::interval
      + (((i * 5) % 60) || ' minutes')::interval;

    IF v_created < rec.sale_created + INTERVAL '12 hours' THEN
      v_created := rec.sale_created + ((i % 10) + 1 || ' days')::interval + ((i % 8) || ' hours')::interval;
    END IF;

    v_reviewed_at := NULL;
    IF i % 5 <> 0 THEN
      v_reviewed_at := v_created + ((2 + (i % 5)) || ' hours')::interval;
    END IF;

    v_replacement_id := NULL;
    IF i % 3 = 0 AND i % 5 IN (1, 4) THEN
      SELECT p.id INTO v_replacement_id
      FROM products p
      WHERE p.organization_id = v_org_id
        AND p.id <> rec.product_id
      ORDER BY md5(p.id::text || i::text)
      LIMIT 1;
    END IF;

    INSERT INTO warranties (
      sale_id,
      sale_item_id,
      branch_id,
      customer_id,
      product_id,
      quantity,
      warranty_type,
      reason,
      status,
      requested_by,
      reviewed_by,
      reviewed_at,
      rejection_reason,
      replacement_product_id,
      resolution_notes,
      processed_at,
      processed_by,
      created_at,
      updated_at
    )
    VALUES (
      rec.sale_id,
      rec.sale_item_id,
      v_branch_id,
      rec.customer_id,
      rec.product_id,
      LEAST(rec.item_qty, 1 + (i % rec.item_qty)),
      CASE
        WHEN i % 7 = 0 THEN 'repair'
        WHEN i % 3 = 0 THEN 'refund'
        ELSE 'exchange'
      END,
      '[Hist demo] ' || warranty_reasons[1 + ((i - 1) % array_length(warranty_reasons, 1))],
      CASE
        WHEN i % 5 = 0 THEN 'pending'
        WHEN i % 5 = 1 THEN 'approved'
        WHEN i % 5 = 2 THEN 'rejected'
        ELSE 'processed'
      END,
      v_user_id,
      CASE WHEN i % 5 = 0 THEN NULL ELSE v_user_id END,
      v_reviewed_at,
      CASE
        WHEN i % 5 = 2 THEN 'Fuera de política de cambios — pasaron más de 30 días (demo)'
        ELSE NULL
      END,
      v_replacement_id,
      CASE
        WHEN i % 5 IN (3, 4) THEN 'Resuelto en tienda · ref. GAR-HIST-' || LPAD(i::text, 5, '0')
        ELSE NULL
      END,
      CASE WHEN i % 5 IN (3, 4) THEN v_reviewed_at + INTERVAL '1 hour' ELSE NULL END,
      CASE WHEN i % 5 IN (3, 4) THEN v_user_id ELSE NULL END,
      v_created,
      v_created
    );

    v_inserted := v_inserted + 1;
  END LOOP;

  RAISE NOTICE '✓ % garantías [Hist demo] creadas para %', v_inserted, v_user_email;
  RAISE NOTICE '  Rango de fechas: hoy → hace % días · Sucursal: %', v_days_span, COALESCE(v_branch_label, v_branch_id::text);

  IF v_inserted < v_warranty_target THEN
    RAISE NOTICE '  Solo se insertaron % (faltan líneas de venta sin garantía). Agrega más ventas o ítems.', v_inserted;
  END IF;

  RAISE NOTICE '  Estados ~20%% pendiente · ~20%% aprobada · ~20%% rechazada · ~40%% procesada';
  RAISE NOTICE '  Tipos ~cambio · ~devolución · ~reparación';
END $$;
