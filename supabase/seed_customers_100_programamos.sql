-- 100 clientes de demo para la vista /clientes (usuario programamos.st@gmail.com).
-- Idempotente: borra primero los insertados por este script (mismo rango de cédula) y vuelve a crearlos.
--
-- Cómo ejecutarlo:
--   1) Supabase Dashboard → SQL Editor → pega todo y Run.
--   2) O local:  supabase db execute --file supabase/seed_customers_100_programamos.sql
--
-- Requisitos: el usuario existe en `users`, tiene `organization_id` y fila en `user_branches` (sucursal activa).

DO $seed$
DECLARE
  v_user_email TEXT := 'programamos.st@gmail.com';
  v_org_id UUID;
  v_branch_id UUID;
  v_customer_id UUID;
  i INT;
BEGIN
  SELECT u.organization_id, ub.branch_id
  INTO v_org_id, v_branch_id
  FROM users u
  INNER JOIN user_branches ub ON ub.user_id = u.id
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(v_user_email))
  ORDER BY ub.branch_id
  LIMIT 1;

  IF v_org_id IS NULL OR v_branch_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró organization_id + branch_id para %. ¿Usuario o user_branches?', v_user_email;
  END IF;

  -- Quitar demo previo (mismo branch + cédulas 9100000001 … 9100000100)
  DELETE FROM customer_addresses ca
  USING customers c
  WHERE ca.customer_id = c.id
    AND c.branch_id = v_branch_id
    AND c.cedula ~ '^9100000[0-9]{3}$';

  DELETE FROM customers c
  WHERE c.branch_id = v_branch_id
    AND c.cedula ~ '^9100000[0-9]{3}$';

  FOR i IN 1..100 LOOP
    INSERT INTO customers (organization_id, branch_id, name, cedula, email, phone, active)
    VALUES (
      v_org_id,
      v_branch_id,
      'Cliente demo ' || LPAD(i::text, 3, '0'),
      (9100000000 + i)::text,
      'seed100.demo.' || i::text || '@nou.local',
      '310' || LPAD((2000000 + i)::text, 7, '0'),
      true
    )
    RETURNING id INTO v_customer_id;

    INSERT INTO customer_addresses (customer_id, label, address, reference_point, is_default, display_order)
    VALUES (
      v_customer_id,
      'Principal',
      'Calle Demo ' || i || ' # ' || (10 + (i % 90)) || '-' || (20 + (i % 80)),
      'Ref. bloque seed · fila ' || i,
      true,
      0
    );
  END LOOP;

  RAISE NOTICE 'Listo: 100 clientes en org % branch % (email %).', v_org_id, v_branch_id, v_user_email;
END $seed$;
