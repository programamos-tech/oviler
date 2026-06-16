-- IMEI por ubicación (local / bodega): registro, inventario y descuento al vender.

ALTER TABLE product_imei_units
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'local'
    CHECK (location IN ('local', 'bodega'));

COMMENT ON COLUMN product_imei_units.location IS 'Ubicación física de la unidad en la sucursal (mostrador o bodega).';

CREATE INDEX IF NOT EXISTS idx_product_imei_units_branch_product_location_status
  ON product_imei_units (branch_id, product_id, location, status);

-- Inventario por ubicación
CREATE OR REPLACE FUNCTION increment_inventory(
  p_product_id UUID,
  p_branch_id UUID,
  p_quantity INT,
  p_location TEXT DEFAULT 'local'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location TEXT := COALESCE(NULLIF(trim(p_location), ''), 'local');
BEGIN
  IF v_location NOT IN ('local', 'bodega') THEN
    RAISE EXCEPTION 'Ubicación inválida: %', p_location;
  END IF;

  INSERT INTO inventory (product_id, branch_id, location, quantity, updated_at)
  VALUES (p_product_id, p_branch_id, v_location, p_quantity, NOW())
  ON CONFLICT (product_id, branch_id, location)
  DO UPDATE SET
    quantity = inventory.quantity + p_quantity,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION decrement_inventory(
  p_product_id UUID,
  p_branch_id UUID,
  p_quantity INT,
  p_location TEXT DEFAULT 'local'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location TEXT := COALESCE(NULLIF(trim(p_location), ''), 'local');
BEGIN
  IF v_location NOT IN ('local', 'bodega') THEN
    RAISE EXCEPTION 'Ubicación inválida: %', p_location;
  END IF;

  UPDATE inventory
  SET quantity = GREATEST(0, quantity - p_quantity),
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND branch_id = p_branch_id
    AND location = v_location;

  IF NOT FOUND THEN
    INSERT INTO inventory (product_id, branch_id, location, quantity, updated_at)
    VALUES (p_product_id, p_branch_id, v_location, 0, NOW())
    ON CONFLICT (product_id, branch_id, location) DO NOTHING;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS register_product_imei_units(UUID, UUID, TEXT[]);

CREATE OR REPLACE FUNCTION register_product_imei_units(
  p_branch_id UUID,
  p_product_id UUID,
  p_imeis TEXT[],
  p_location TEXT DEFAULT 'local'
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_requires BOOLEAN;
  v_has_bodega BOOLEAN;
  v_location TEXT := COALESCE(NULLIF(trim(p_location), ''), 'local');
  v_imei TEXT;
  v_norm TEXT;
  v_count INT := 0;
BEGIN
  IF v_location NOT IN ('local', 'bodega') THEN
    RAISE EXCEPTION 'Ubicación inválida';
  END IF;

  SELECT b.organization_id, COALESCE(b.has_bodega, false)
  INTO v_org_id, v_has_bodega
  FROM branches b
  WHERE b.id = p_branch_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sucursal no encontrada';
  END IF;

  IF v_location = 'bodega' AND NOT v_has_bodega THEN
    RAISE EXCEPTION 'Esta sucursal no tiene bodega';
  END IF;

  SELECT p.requires_imei INTO v_requires
  FROM products p
  WHERE p.id = p_product_id AND p.organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado en la organización';
  END IF;

  IF NOT COALESCE(v_requires, false) THEN
    RAISE EXCEPTION 'Este producto no está marcado como que requiere IMEI';
  END IF;

  IF p_imeis IS NULL OR array_length(p_imeis, 1) IS NULL OR array_length(p_imeis, 1) = 0 THEN
    RAISE EXCEPTION 'Debes indicar al menos un IMEI';
  END IF;

  FOREACH v_imei IN ARRAY p_imeis LOOP
    v_norm := normalize_imei(v_imei);
    IF NOT validate_imei_normalized(v_norm) THEN
      RAISE EXCEPTION 'IMEI inválido (debe tener 15 dígitos): %', v_imei;
    END IF;

    INSERT INTO product_imei_units (
      organization_id, branch_id, product_id, imei, imei_normalized, status, location
    ) VALUES (
      v_org_id, p_branch_id, p_product_id, trim(v_imei), v_norm, 'in_stock', v_location
    );

    v_count := v_count + 1;
  END LOOP;

  PERFORM increment_inventory(p_product_id, p_branch_id, v_count, v_location);
  RETURN v_count;
END;
$$;

-- Descontar stock al finalizar venta: por ubicación si la línea tiene IMEIs asignados
CREATE OR REPLACE FUNCTION deduct_inventory_when_dispatched()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  loc_rec RECORD;
  qty INT;
  should_deduct BOOLEAN := false;
BEGIN
  IF NEW.inventory_deducted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.is_delivery = true AND NEW.status = 'on_the_way' AND OLD.status IS DISTINCT FROM 'on_the_way' THEN
    should_deduct := true;
  END IF;

  IF NEW.is_delivery = false AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    should_deduct := true;
  END IF;

  IF NOT should_deduct THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT si.id AS sale_item_id, si.product_id, COALESCE(si.quantity_picked, si.quantity) AS qty
    FROM sale_items si
    WHERE si.sale_id = NEW.id
      AND COALESCE(si.quantity_picked, si.quantity) > 0
  LOOP
    qty := r.qty;

    IF EXISTS (
      SELECT 1 FROM product_imei_units u
      WHERE u.sale_item_id = r.sale_item_id AND u.status = 'sold'
    ) THEN
      FOR loc_rec IN
        SELECT u.location, COUNT(*)::INT AS unit_qty
        FROM product_imei_units u
        WHERE u.sale_item_id = r.sale_item_id AND u.status = 'sold'
        GROUP BY u.location
      LOOP
        PERFORM decrement_inventory(r.product_id, NEW.branch_id, loc_rec.unit_qty, loc_rec.location);
      END LOOP;
    ELSE
      PERFORM decrement_inventory(r.product_id, NEW.branch_id, qty, 'local');
    END IF;
  END LOOP;

  NEW.inventory_deducted_at := NOW();
  RETURN NEW;
END;
$$;

-- Al anular venta: devolver IMEIs y stock por ubicación
CREATE OR REPLACE FUNCTION restore_inventory_when_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  loc_rec RECORD;
BEGIN
  IF NEW.status <> 'cancelled'
     OR OLD.status = 'cancelled'
     OR NEW.inventory_deducted_at IS NULL THEN
    RETURN NEW;
  END IF;

  FOR loc_rec IN
    SELECT u.product_id, u.location, COUNT(*)::INT AS unit_qty
    FROM product_imei_units u
    WHERE u.sale_id = NEW.id AND u.status = 'sold'
    GROUP BY u.product_id, u.location
  LOOP
    PERFORM increment_inventory(loc_rec.product_id, NEW.branch_id, loc_rec.unit_qty, loc_rec.location);
  END LOOP;

  UPDATE product_imei_units u
  SET
    status = 'in_stock',
    sale_id = NULL,
    sale_item_id = NULL,
    sold_at = NULL
  WHERE u.sale_id = NEW.id
    AND u.status = 'sold';

  FOR r IN
    SELECT si.product_id, si.id AS sale_item_id, COALESCE(si.quantity_picked, si.quantity) AS qty
    FROM sale_items si
    WHERE si.sale_id = NEW.id
      AND COALESCE(si.quantity_picked, si.quantity) > 0
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM product_imei_units u WHERE u.sale_item_id = r.sale_item_id
    ) THEN
      PERFORM increment_inventory(r.product_id, NEW.branch_id, r.qty, 'local');
    END IF;
  END LOOP;

  NEW.inventory_deducted_at := NULL;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION register_product_imei_units(UUID, UUID, TEXT[], TEXT) TO authenticated;
