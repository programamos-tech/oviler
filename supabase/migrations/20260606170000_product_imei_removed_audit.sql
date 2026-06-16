-- Historial de bajas IMEI: soft-delete con motivo (no se pierde trazabilidad).

ALTER TABLE product_imei_units
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removal_reason TEXT;

COMMENT ON COLUMN product_imei_units.removed_at IS 'Cuándo se dio de baja la unidad del stock.';
COMMENT ON COLUMN product_imei_units.removal_reason IS 'Motivo obligatorio al dar de baja una unidad en stock.';

ALTER TABLE product_imei_units DROP CONSTRAINT IF EXISTS product_imei_units_status_check;

ALTER TABLE product_imei_units
  ADD CONSTRAINT product_imei_units_status_check
  CHECK (status IN ('in_stock', 'sold', 'warranty', 'defective', 'returned', 'removed'));

-- Permite reutilizar IMEI si la unidad anterior fue dada de baja
DROP INDEX IF EXISTS idx_product_imei_units_org_imei_norm;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_imei_units_org_imei_active
  ON product_imei_units (organization_id, imei_normalized)
  WHERE status <> 'removed';

CREATE INDEX IF NOT EXISTS idx_product_imei_units_removed
  ON product_imei_units (branch_id, product_id, removed_at DESC)
  WHERE status = 'removed';

DROP FUNCTION IF EXISTS remove_product_imei_units(UUID, UUID, UUID[]);

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
