-- =============================================================================
-- 500 créditos históricos — bernabe@tech.com · Berea Shopping
-- =============================================================================
-- Crea créditos ligados a ventas completadas (sin crédito previo) + abonos,
-- repartidos en distintos días desde HOY hacia atrás (~150 días).
-- Los abonos actualizan amount_paid y status vía triggers de la BD.
--
-- Cómo ejecutar: Supabase Dashboard → SQL Editor → pegar → Run.
-- Idempotente: borra créditos cuyas notas empiezan por [Hist demo].
--
-- Requisitos:
--   - Usuario bernabe@tech.com · sucursal Berea Shopping
--   - Ventas completadas con cliente (seed_bernabe_500_sales_history.sql)
-- =============================================================================

DO $$
DECLARE
  v_user_email TEXT := 'bernabe@tech.com';
  v_target_branch_name TEXT := 'Berea Shopping';
  v_org_id UUID;
  v_branch_id UUID;
  v_branch_label TEXT;
  v_user_id UUID;
  v_credit_id UUID;
  v_created TIMESTAMPTZ;
  v_payment_at TIMESTAMPTZ;
  v_day_offset INT;
  v_days_span INT := 150;
  v_credit_target INT := 500;
  v_total NUMERIC(14, 2);
  v_paid NUMERIC(14, 2);
  v_remain NUMERIC(14, 2);
  v_due DATE;
  v_inserted INT := 0;
  v_deleted INT;
  v_available INT;

  i INT;
  j INT;
  rec RECORD;

  credit_titles TEXT[] := ARRAY[
    'Compra a crédito — temporada',
    'Pedido mayorista fiado',
    'Venta mostrador — pago diferido',
    'Cliente frecuente — cupo',
    'Factura pendiente de cobro',
    'Crédito ropa y accesorios',
    'Crédito calzado — cuotas',
    'Compra corporativa',
    'Fiado fin de mes',
    'Saldo factura retail'
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

  DELETE FROM credit_payments cp
  USING customer_credits cc
  WHERE cp.credit_id = cc.id
    AND cc.notes LIKE '[Hist demo]%';

  DELETE FROM customer_credits
  WHERE notes LIKE '[Hist demo]%';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    RAISE NOTICE 'Créditos [Hist demo] anteriores eliminados: %', v_deleted;
  END IF;

  SELECT COUNT(*)::int INTO v_available
  FROM sales s
  WHERE s.branch_id = v_branch_id
    AND s.status = 'completed'
    AND s.customer_id IS NOT NULL
    AND COALESCE(s.total, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM customer_credits cc WHERE cc.sale_id = s.id
    );

  IF v_available = 0 THEN
    RAISE EXCEPTION
      'No hay ventas disponibles para crédito (completadas, con cliente, sin crédito). Corre seed_bernabe_500_sales_history.sql primero.';
  END IF;

  RAISE NOTICE 'Ventas disponibles para crédito: % (objetivo: %)', v_available, v_credit_target;

  i := 0;

  FOR rec IN
    SELECT
      s.id AS sale_id,
      s.customer_id,
      s.total AS sale_total,
      s.created_at AS sale_created,
      s.invoice_number
    FROM sales s
    WHERE s.branch_id = v_branch_id
      AND s.status = 'completed'
      AND s.customer_id IS NOT NULL
      AND COALESCE(s.total, 0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM customer_credits cc WHERE cc.sale_id = s.id
      )
    ORDER BY
      CASE
        WHEN s.invoice_number LIKE 'FV-HIST-%' THEN 0
        WHEN s.invoice_number LIKE 'FV-LIVE-%' THEN 1
        ELSE 2
      END,
      md5(s.id::text)
    LIMIT v_credit_target
  LOOP
    i := i + 1;

    v_day_offset := FLOOR(((i - 1)::numeric * v_days_span) / v_credit_target)::int;

    v_created :=
      DATE_TRUNC('day', NOW())
      - (v_day_offset || ' days')::interval
      + ((11 + (i % 8)) || ' hours')::interval
      + (((i * 3) % 60) || ' minutes')::interval;

    IF v_created < rec.sale_created THEN
      v_created := rec.sale_created + ((i % 6) || ' hours')::interval;
    END IF;

    v_total := GREATEST(rec.sale_total, 15000)::numeric(14, 2);

    -- Vencimiento y escenario por cupo
    IF i % 10 = 9 THEN
      -- Cancelado
      v_due := (v_created::date + INTERVAL '20 days')::date;
    ELSIF i % 10 IN (0, 1) THEN
      -- Vencido (mora)
      v_due := (v_created::date - ((8 + (i % 25)) || ' days')::interval)::date;
    ELSIF i % 10 IN (2, 3, 4) THEN
      -- Pendiente — vence en el futuro
      v_due := (v_created::date + ((20 + (i % 40)) || ' days')::interval)::date;
    ELSE
      -- Completado o casi — vencimiento pasado o cercano
      v_due := (v_created::date + ((10 + (i % 20)) || ' days')::interval)::date;
    END IF;

    INSERT INTO customer_credits (
      organization_id,
      branch_id,
      customer_id,
      sale_id,
      public_ref,
      title,
      total_amount,
      amount_paid,
      due_date,
      status,
      cancelled_at,
      notes,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      v_org_id,
      v_branch_id,
      rec.customer_id,
      rec.sale_id,
      'SCH' || LPAD(i::text, 5, '0'),
      credit_titles[1 + ((i - 1) % array_length(credit_titles, 1))],
      v_total,
      0,
      v_due,
      'pending',
      CASE WHEN i % 10 = 9 THEN v_created + INTERVAL '3 days' ELSE NULL END,
      '[Hist demo] Crédito por venta ' || COALESCE(rec.invoice_number, rec.sale_id::text)
        || ' · ref CR-HIST-' || LPAD(i::text, 5, '0'),
      v_user_id,
      v_created,
      v_created
    )
    RETURNING id INTO v_credit_id;

    -- Cancelados: sin abonos
    IF i % 10 = 9 THEN
      v_inserted := v_inserted + 1;
      CONTINUE;
    END IF;

    -- Abonos según escenario (triggers recalculan amount_paid y status)
    IF i % 10 IN (5, 6, 7) THEN
      -- Pendiente: sin abono o abono pequeño
      IF i % 2 = 0 THEN
        v_paid := ROUND(v_total * (0.15 + (i % 5) * 0.05), 0);
        v_payment_at := v_created + ((1 + (i % 4)) || ' days')::interval;
        IF v_payment_at >= DATE_TRUNC('day', NOW()) THEN
          v_payment_at := DATE_TRUNC('day', NOW()) - INTERVAL '1 day'
            + ((9 + (i % 8)) || ' hours')::interval;
        END IF;
        INSERT INTO credit_payments (
          credit_id, amount, payment_method, amount_cash, amount_transfer,
          notes, created_by, created_at, payment_source
        )
        VALUES (
          v_credit_id,
          v_paid,
          CASE WHEN i % 3 = 0 THEN 'transfer' ELSE 'cash' END,
          NULL,
          NULL,
          '[Hist demo] Abono parcial inicial',
          v_user_id,
          v_payment_at,
          'customer_payment'
        );
      END IF;

    ELSIF i % 10 IN (0, 1) THEN
      -- Vencido: 1–2 abonos parciales (40–65 % del total)
      v_paid := ROUND(v_total * (0.25 + (i % 4) * 0.1), 0);
      v_payment_at := v_created + ((2 + (i % 6)) || ' days')::interval;
      IF v_payment_at >= DATE_TRUNC('day', NOW()) THEN
        v_payment_at := DATE_TRUNC('day', NOW()) - INTERVAL '1 day'
          + ((10 + (i % 7)) || ' hours')::interval;
      END IF;
      INSERT INTO credit_payments (
        credit_id, amount, payment_method, notes, created_by, created_at, payment_source
      )
      VALUES (
        v_credit_id, v_paid,
        CASE WHEN i % 2 = 0 THEN 'cash' ELSE 'transfer' END,
        '[Hist demo] Abono en mora',
        v_user_id, v_payment_at, 'customer_payment'
      );

      IF i % 3 = 0 AND v_paid < v_total * 0.55 THEN
        v_remain := ROUND(v_total * 0.2, 0);
        v_payment_at := v_payment_at + INTERVAL '5 days';
        IF v_payment_at >= DATE_TRUNC('day', NOW()) THEN
          v_payment_at := DATE_TRUNC('day', NOW()) - INTERVAL '2 days'
            + ((11 + (i % 6)) || ' hours')::interval;
        END IF;
        INSERT INTO credit_payments (
          credit_id, amount, payment_method, notes, created_by, created_at, payment_source
        )
        VALUES (
          v_credit_id, v_remain, 'transfer',
          '[Hist demo] Segundo abono parcial',
          v_user_id, v_payment_at, 'customer_payment'
        );
      END IF;

    ELSE
      -- Completado: 1 a 3 abonos que cubren el total
      v_remain := v_total;
      FOR j IN 1..(1 + (i % 3)) LOOP
        IF v_remain <= 0.005 THEN
          EXIT;
        END IF;

        IF j = (1 + (i % 3)) OR v_remain <= ROUND(v_total * 0.35, 0) THEN
          v_paid := v_remain;
        ELSE
          v_paid := ROUND(v_remain * (0.35 + (j % 3) * 0.15), 0);
          v_paid := LEAST(v_paid, v_remain);
        END IF;

        v_payment_at := v_created + ((j * 4 + (i % 5)) || ' days')::interval;
        -- Nunca programar abonos demo en “hoy” o futuro (caja del dashboard en 0 al inicio del día).
        IF v_payment_at >= DATE_TRUNC('day', NOW()) THEN
          v_payment_at := DATE_TRUNC('day', NOW()) - INTERVAL '1 day'
            + ((8 + ((i + j) % 10)) || ' hours')::interval;
        END IF;

        IF i % 11 = 0 AND j = 2 THEN
          INSERT INTO credit_payments (
            credit_id, amount, payment_method, amount_cash, amount_transfer,
            notes, created_by, created_at, payment_source
          )
          VALUES (
            v_credit_id,
            v_paid,
            'mixed',
            ROUND(v_paid * 0.45, 0),
            v_paid - ROUND(v_paid * 0.45, 0),
            '[Hist demo] Abono mixto',
            v_user_id,
            v_payment_at,
            'customer_payment'
          );
        ELSE
          INSERT INTO credit_payments (
            credit_id, amount, payment_method, notes, created_by, created_at, payment_source
          )
          VALUES (
            v_credit_id,
            v_paid,
            CASE WHEN (i + j) % 2 = 0 THEN 'cash' ELSE 'transfer' END,
            '[Hist demo] Abono cuota ' || j::text,
            v_user_id,
            v_payment_at,
            'customer_payment'
          );
        END IF;

        v_remain := v_remain - v_paid;
      END LOOP;
    END IF;

    v_inserted := v_inserted + 1;
  END LOOP;

  RAISE NOTICE '✓ % créditos [Hist demo] creados para %', v_inserted, v_user_email;
  RAISE NOTICE '  Rango de fechas: hoy → hace % días · Sucursal: %', v_days_span, COALESCE(v_branch_label, v_branch_id::text);

  IF v_inserted < v_credit_target THEN
    RAISE NOTICE '  Solo se insertaron % (faltan ventas sin crédito). Agrega más ventas completadas.', v_inserted;
  END IF;

  RAISE NOTICE '  ~35%% saldados · ~30%% pendientes · ~20%% en mora · ~10%% cancelados (aprox.)';
END $$;
