-- =============================================================================
-- 500 egresos históricos — bernabe@tech.com · Berea Shopping
-- =============================================================================
-- Reparte ~500 gastos en distintos días desde HOY hacia atrás (~150 días).
-- Conceptos retail/operativos (arriendo, nómina, inventario, servicios, etc.).
--
-- Cómo ejecutar: Supabase Dashboard → SQL Editor → pegar → Run.
-- Idempotente: borra solo egresos con concepto que empieza por [Hist demo].
--
-- Requisitos:
--   - Usuario bernabe@tech.com en public.users
--   - Sucursal Berea Shopping (o ajusta v_target_branch_name)
-- =============================================================================

DO $$
DECLARE
  v_user_email TEXT := 'bernabe@tech.com';
  v_target_branch_name TEXT := 'Berea Shopping';
  v_org_id UUID;
  v_branch_id UUID;
  v_branch_label TEXT;
  v_user_id UUID;
  v_created TIMESTAMPTZ;
  v_day_offset INT;
  v_days_span INT := 150;
  v_expense_count INT := 500;
  v_amount NUMERIC(12,2);
  v_payment TEXT;
  v_status TEXT;
  v_concept TEXT;
  v_notes TEXT;
  v_ref TEXT;

  i INT;
  v_deleted INT;

  expense_concepts TEXT[] := ARRAY[
    'Arriendo local comercial',
    'Servicios públicos (luz y agua)',
    'Nómina vendedores',
    'Nómina cajeros fin de semana',
    'Transporte mercancía',
    'Publicidad redes sociales',
    'Mantenimiento equipos POS',
    'Insumos de empaque y bolsas',
    'Comisión datáfono',
    'Aseo y limpieza',
    'Internet y telefonía',
    'Compra inventario temporada',
    'Pedido proveedor ropa',
    'Pedido proveedor zapatos',
    'Reposición perfumería',
    'Insumos cuidado capilar',
    'Accesorios celular mayorista',
    'Seguro local',
    'Papelería y tickets',
    'Agua embotellada personal',
    'Reparación vitrina',
    'Uniformes personal',
    'Capacitación equipo ventas',
    'Flete desde Bogotá',
    'Devolución cliente (nota crédito)',
    'Gastos bancarios',
    'Decoración temporada',
    'Parqueadero mensual',
    'Software contable'
  ];

  expense_notes TEXT[] := ARRAY[
    'Pago mensual',
    'Factura proveedor',
    'Egreso operativo tienda',
    'Cierre parcial caja',
    'Compra urgente stock',
    'Servicio recurrente',
    'Ref. histórico demo',
    NULL,
    NULL
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

  DELETE FROM expenses
  WHERE branch_id = v_branch_id
    AND concept LIKE '[Hist demo]%';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    RAISE NOTICE 'Egresos [Hist demo] anteriores eliminados: %', v_deleted;
  END IF;

  FOR i IN 1..v_expense_count LOOP
    v_day_offset := FLOOR(((i - 1)::numeric * v_days_span) / v_expense_count)::int;

    v_created :=
      DATE_TRUNC('day', NOW())
      - (v_day_offset || ' days')::interval
      + ((9 + (i % 10)) || ' hours')::interval
      + (((i * 11) % 60) || ' minutes')::interval
      + (((i * 17) % 60) || ' seconds')::interval;

    v_concept := '[Hist demo] ' || expense_concepts[1 + ((i - 1) % array_length(expense_concepts, 1))];

    v_ref := 'EG-HIST-' || LPAD(i::text, 5, '0');

    v_amount := (
      28000
      + ((i * 9743) % 420000)
      + CASE
          WHEN expense_concepts[1 + ((i - 1) % array_length(expense_concepts, 1))] ILIKE '%arriendo%' THEN 180000
          WHEN expense_concepts[1 + ((i - 1) % array_length(expense_concepts, 1))] ILIKE '%nómina%' THEN 95000
          WHEN expense_concepts[1 + ((i - 1) % array_length(expense_concepts, 1))] ILIKE '%inventario%'
            OR expense_concepts[1 + ((i - 1) % array_length(expense_concepts, 1))] ILIKE '%proveedor%'
            OR expense_concepts[1 + ((i - 1) % array_length(expense_concepts, 1))] ILIKE '%pedido%'
            OR expense_concepts[1 + ((i - 1) % array_length(expense_concepts, 1))] ILIKE '%reposición%'
          THEN 120000
          ELSE 0
        END
    )::numeric(12,2);

    v_payment := CASE WHEN i % 4 = 0 THEN 'transfer' ELSE 'cash' END;

    v_status := CASE WHEN i % 37 = 0 THEN 'cancelled' ELSE 'active' END;

    v_notes := COALESCE(
      expense_notes[1 + ((i - 1) % array_length(expense_notes, 1))],
      'Ref. ' || v_ref
    );
    IF v_notes IS NOT NULL THEN
      v_notes := v_notes || ' · ' || v_ref;
    END IF;

    INSERT INTO expenses (
      branch_id,
      user_id,
      amount,
      payment_method,
      concept,
      notes,
      status,
      cancelled_at,
      cancellation_reason,
      created_at,
      updated_at
    )
    VALUES (
      v_branch_id,
      v_user_id,
      v_amount,
      v_payment,
      v_concept,
      v_notes,
      v_status,
      CASE WHEN v_status = 'cancelled' THEN v_created + INTERVAL '2 hours' ELSE NULL END,
      CASE WHEN v_status = 'cancelled' THEN 'Anulado en revisión de caja (demo histórico)' ELSE NULL END,
      v_created,
      v_created
    );
  END LOOP;

  RAISE NOTICE '✓ % egresos [Hist demo] creados para %', v_expense_count, v_user_email;
  RAISE NOTICE '  Rango de fechas: hoy → hace % días · Sucursal: %', v_days_span, COALESCE(v_branch_label, v_branch_id::text);
  RAISE NOTICE '  Activos: ~% · Anulados: ~%', v_expense_count - (v_expense_count / 37), (v_expense_count / 37);
END $$;
