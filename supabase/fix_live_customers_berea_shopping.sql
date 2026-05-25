-- Mueve clientes/ventas demo LIVE a la sucursal "Berea Shopping" (la que ves en el sidebar).
-- Útil si corriste el seed antes del arreglo y los datos quedaron en otra sucursal.
--
-- 1) Ejecuta este script en SQL Editor
-- 2) Recarga /clientes en la app (o pulsa Actualizar)

DO $$
DECLARE
  v_user_email TEXT := 'bernabe@tech.com';
  v_target_branch_name TEXT := 'Berea Shopping';
  v_org_id UUID;
  v_user_id UUID;
  v_shopping_id UUID;
  v_shopping_name TEXT;
  v_customers_moved INT;
  v_sales_moved INT;
  v_count_shopping INT;
BEGIN
  SELECT u.id, u.organization_id INTO v_user_id, v_org_id
  FROM users u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(v_user_email))
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró % en public.users', v_user_email;
  END IF;

  SELECT b.id, b.name INTO v_shopping_id, v_shopping_name
  FROM branches b
  INNER JOIN user_branches ub ON ub.branch_id = b.id AND ub.user_id = v_user_id
  WHERE b.organization_id = v_org_id
    AND b.name ILIKE '%' || TRIM(v_target_branch_name) || '%'
  ORDER BY
    CASE WHEN lower(b.name) = lower(trim(v_target_branch_name)) THEN 0 ELSE 1 END,
    b.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_shopping_id IS NULL THEN
    RAISE EXCEPTION 'No hay sucursal asignada que coincida con "%". Revisa el nombre en branches.', v_target_branch_name;
  END IF;

  UPDATE customers c
  SET branch_id = v_shopping_id, updated_at = NOW()
  WHERE c.organization_id = v_org_id
    AND c.cedula LIKE '1019001%'
    AND c.branch_id IS DISTINCT FROM v_shopping_id;

  GET DIAGNOSTICS v_customers_moved = ROW_COUNT;

  UPDATE sales s
  SET branch_id = v_shopping_id, updated_at = NOW()
  WHERE s.invoice_number LIKE 'FV-LIVE-%'
    AND s.branch_id IS DISTINCT FROM v_shopping_id
    AND EXISTS (
      SELECT 1 FROM user_branches ub
      WHERE ub.user_id = v_user_id AND ub.branch_id = s.branch_id
    );

  GET DIAGNOSTICS v_sales_moved = ROW_COUNT;

  SELECT COUNT(*)::int INTO v_count_shopping
  FROM customers c
  WHERE c.branch_id = v_shopping_id
    AND c.cedula LIKE '1019001%'
    AND COALESCE(c.active, true) = true;

  RAISE NOTICE 'Sucursal: % (%)', v_shopping_name, v_shopping_id;
  RAISE NOTICE 'Clientes movidos a esta sucursal: %', v_customers_moved;
  RAISE NOTICE 'Ventas FV-LIVE movidas: %', v_sales_moved;
  RAISE NOTICE 'Clientes demo LIVE visibles en Clientes ahora: %', v_count_shopping;

  IF v_count_shopping = 0 THEN
    RAISE NOTICE '→ No hay clientes 1019001%% en esta sucursal. Ejecuta de nuevo seed_bernabe_live_demo.sql (ya apunta a Berea Shopping).';
  END IF;
END $$;
