-- Transferencia atómica entre stock local y bodega (misma sucursal).
-- Activa bodega en sucursales existentes para alinear con el producto (stock dual sin obligar ubicaciones físicas).

UPDATE branches SET has_bodega = true WHERE has_bodega IS NOT TRUE;

ALTER TABLE branches ALTER COLUMN has_bodega SET DEFAULT true;

CREATE OR REPLACE FUNCTION public.transfer_inventory_between_locations(
  p_product_id uuid,
  p_branch_id uuid,
  p_from text,
  p_to text,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_from_qty int;
  v_has_bodega boolean;
  v_org uuid;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_from NOT IN ('local', 'bodega') OR p_to NOT IN ('local', 'bodega') THEN
    RAISE EXCEPTION 'INVALID_LOCATIONS';
  END IF;
  IF p_from = p_to THEN
    RAISE EXCEPTION 'SAME_ORIGIN_DEST';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_branches ub
    WHERE ub.user_id = auth.uid() AND ub.branch_id = p_branch_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN_BRANCH';
  END IF;

  SELECT b.has_bodega INTO v_has_bodega FROM branches b WHERE b.id = p_branch_id;
  IF NOT COALESCE(v_has_bodega, false) THEN
    RAISE EXCEPTION 'BRANCH_NO_BODEGA';
  END IF;

  SELECT p.organization_id INTO v_org FROM products p WHERE p.id = p_product_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN_PRODUCT';
  END IF;

  SELECT i.quantity INTO v_from_qty
  FROM inventory i
  WHERE i.product_id = p_product_id
    AND i.branch_id = p_branch_id
    AND i.location = p_from
  FOR UPDATE;

  v_from_qty := COALESCE(v_from_qty, 0);
  IF v_from_qty < p_quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK';
  END IF;

  UPDATE inventory
  SET quantity = quantity - p_quantity,
      updated_at = now()
  WHERE product_id = p_product_id
    AND branch_id = p_branch_id
    AND location = p_from;

  INSERT INTO inventory (product_id, branch_id, location, quantity)
  VALUES (p_product_id, p_branch_id, p_to, p_quantity)
  ON CONFLICT (product_id, branch_id, location)
  DO UPDATE SET
    quantity = inventory.quantity + EXCLUDED.quantity,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.transfer_inventory_between_locations(uuid, uuid, text, text, integer) IS
  'Mueve unidades entre location local y bodega en una sucursal (requiere has_bodega).';

GRANT EXECUTE ON FUNCTION public.transfer_inventory_between_locations(uuid, uuid, text, text, integer) TO authenticated;
