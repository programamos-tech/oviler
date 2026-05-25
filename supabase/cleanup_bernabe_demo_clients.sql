-- Borra SOLO los clientes falsos del seed antiguo ("Cliente Bernabé demo 001", cédula 9200000…).
-- No toca clientes reales ni los del seed_bernabe_live_demo.sql (cédula 1019001…).
--
-- Ejecutar en Supabase → SQL Editor (producción) con el usuario bernabe@tech.com ya creado.

DO $$
DECLARE
  v_user_email TEXT := 'bernabe@tech.com';
  v_org_id UUID;
  v_deleted INT;
BEGIN
  SELECT u.organization_id INTO v_org_id
  FROM users u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(v_user_email))
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró organización para %', v_user_email;
  END IF;

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

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Eliminados % clientes demo (Bernabé 001…100). Ahora ejecuta seed_bernabe_live_demo.sql para cargar nombres reales.', v_deleted;
END $$;
