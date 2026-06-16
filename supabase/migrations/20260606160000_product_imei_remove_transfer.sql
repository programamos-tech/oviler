-- Baja y transferencia de unidades IMEI (local ↔ bodega).

CREATE OR REPLACE FUNCTION remove_product_imei_units(
  p_branch_id UUID,
  p_product_id UUID,
  p_imei_unit_ids UUID[]
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_unit_id UUID;
  v_count INT := 0;
  loc_rec RECORD;
BEGIN
  SELECT b.organization_id INTO v_org_id
  FROM branches b WHERE b.id = p_branch_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sucursal no encontrada';
  END IF;

  IF p_imei_unit_ids IS NULL OR array_length(p_imei_unit_ids, 1) IS NULL OR array_length(p_imei_unit_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Debes seleccionar al menos un IMEI';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = p_product_id AND p.organization_id = v_org_id AND COALESCE(p.requires_imei, false)
  ) THEN
    RAISE EXCEPTION 'Producto no encontrado o no requiere IMEI';
  END IF;

  FOREACH v_unit_id IN ARRAY p_imei_unit_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM product_imei_units u
      WHERE u.id = v_unit_id
        AND u.branch_id = p_branch_id
        AND u.product_id = p_product_id
        AND u.status = 'in_stock'
    ) THEN
      RAISE EXCEPTION 'IMEI no disponible en stock o no corresponde al producto';
    END IF;
  END LOOP;

  FOR loc_rec IN
    SELECT u.location, COUNT(*)::INT AS unit_qty
    FROM product_imei_units u
    WHERE u.id = ANY(p_imei_unit_ids)
    GROUP BY u.location
  LOOP
    PERFORM decrement_inventory(p_product_id, p_branch_id, loc_rec.unit_qty, loc_rec.location);
  END LOOP;

  DELETE FROM product_imei_units u
  WHERE u.id = ANY(p_imei_unit_ids)
    AND u.branch_id = p_branch_id
    AND u.product_id = p_product_id
    AND u.status = 'in_stock';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION transfer_product_imei_units(
  p_branch_id UUID,
  p_product_id UUID,
  p_imei_unit_ids UUID[],
  p_to_location TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_has_bodega BOOLEAN;
  v_to TEXT := COALESCE(NULLIF(trim(p_to_location), ''), 'local');
  v_unit_id UUID;
  v_count INT := 0;
  loc_rec RECORD;
BEGIN
  IF v_to NOT IN ('local', 'bodega') THEN
    RAISE EXCEPTION 'Ubicación destino inválida';
  END IF;

  SELECT b.organization_id, COALESCE(b.has_bodega, false)
  INTO v_org_id, v_has_bodega
  FROM branches b WHERE b.id = p_branch_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sucursal no encontrada';
  END IF;

  IF v_to = 'bodega' AND NOT v_has_bodega THEN
    RAISE EXCEPTION 'Esta sucursal no tiene bodega';
  END IF;

  IF p_imei_unit_ids IS NULL OR array_length(p_imei_unit_ids, 1) IS NULL OR array_length(p_imei_unit_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Debes seleccionar al menos un IMEI';
  END IF;

  FOREACH v_unit_id IN ARRAY p_imei_unit_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM product_imei_units u
      WHERE u.id = v_unit_id
        AND u.branch_id = p_branch_id
        AND u.product_id = p_product_id
        AND u.status = 'in_stock'
        AND u.location IS DISTINCT FROM v_to
    ) THEN
      RAISE EXCEPTION 'IMEI no disponible, ya está en el destino o no corresponde al producto';
    END IF;
  END LOOP;

  FOR loc_rec IN
    SELECT u.location AS from_loc, COUNT(*)::INT AS unit_qty
    FROM product_imei_units u
    WHERE u.id = ANY(p_imei_unit_ids)
    GROUP BY u.location
  LOOP
    PERFORM decrement_inventory(p_product_id, p_branch_id, loc_rec.unit_qty, loc_rec.from_loc);
    PERFORM increment_inventory(p_product_id, p_branch_id, loc_rec.unit_qty, v_to);
  END LOOP;

  UPDATE product_imei_units u
  SET location = v_to, updated_at = NOW()
  WHERE u.id = ANY(p_imei_unit_ids)
    AND u.branch_id = p_branch_id
    AND u.product_id = p_product_id
    AND u.status = 'in_stock';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_product_imei_units(UUID, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_product_imei_units(UUID, UUID, UUID[], TEXT) TO authenticated;
