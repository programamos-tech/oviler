-- Quién dio de baja cada unidad IMEI (auditoría por usuario).

ALTER TABLE product_imei_units
  ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN product_imei_units.removed_by IS 'Usuario que registró la baja de la unidad.';

CREATE INDEX IF NOT EXISTS idx_product_imei_units_removed_by
  ON product_imei_units (removed_by)
  WHERE status = 'removed';

CREATE OR REPLACE FUNCTION remove_product_imei_units(
  p_branch_id UUID,
  p_product_id UUID,
  p_imei_unit_ids UUID[],
  p_reason TEXT
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
  v_reason TEXT := NULLIF(trim(p_reason), '');
  loc_rec RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para dar de baja unidades';
  END IF;

  IF v_reason IS NULL OR length(v_reason) < 3 THEN
    RAISE EXCEPTION 'Debes indicar el motivo de la baja (mínimo 3 caracteres)';
  END IF;

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

  UPDATE product_imei_units u
  SET
    status = 'removed',
    removal_reason = v_reason,
    removed_at = NOW(),
    removed_by = auth.uid(),
    updated_at = NOW()
  WHERE u.id = ANY(p_imei_unit_ids)
    AND u.branch_id = p_branch_id
    AND u.product_id = p_product_id
    AND u.status = 'in_stock';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_product_imei_units(UUID, UUID, UUID[], TEXT) TO authenticated;

-- Backfill: bajas previas sin usuario desde la bitácora (mismo producto, IMEI y ±2 min)
UPDATE product_imei_units u
SET removed_by = sub.user_id
FROM (
  SELECT DISTINCT ON (u2.id)
    u2.id AS unit_id,
    a.user_id
  FROM product_imei_units u2
  JOIN activities a
    ON a.entity_type = 'product'
   AND a.entity_id = u2.product_id
   AND a.action = 'stock_adjusted'
   AND a.user_id IS NOT NULL
   AND COALESCE(a.metadata->>'imeiMovement', '') = 'baja'
   AND u2.imei = ANY(
     SELECT jsonb_array_elements_text(COALESCE(a.metadata->'imeis', '[]'::jsonb))
   )
   AND u2.removed_at IS NOT NULL
   AND abs(extract(epoch FROM (u2.removed_at - a.created_at))) <= 120
  WHERE u2.status = 'removed'
    AND u2.removed_by IS NULL
  ORDER BY u2.id, abs(extract(epoch FROM (u2.removed_at - a.created_at)))
) sub
WHERE u.id = sub.unit_id
  AND u.removed_by IS NULL;
