-- Fix 42P10: inventory es único por (product_id, branch_id, location).
-- Las RPC antiguas usaban ON CONFLICT (product_id, branch_id).

CREATE OR REPLACE FUNCTION decrement_inventory(
  p_product_id UUID,
  p_branch_id UUID,
  p_quantity INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE inventory
  SET quantity = GREATEST(0, quantity - p_quantity),
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND branch_id = p_branch_id
    AND location = 'local';

  IF NOT FOUND THEN
    INSERT INTO inventory (product_id, branch_id, location, quantity, updated_at)
    VALUES (p_product_id, p_branch_id, 'local', 0, NOW())
    ON CONFLICT (product_id, branch_id, location) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION increment_inventory(
  p_product_id UUID,
  p_branch_id UUID,
  p_quantity INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO inventory (product_id, branch_id, location, quantity, updated_at)
  VALUES (p_product_id, p_branch_id, 'local', p_quantity, NOW())
  ON CONFLICT (product_id, branch_id, location)
  DO UPDATE SET
    quantity = inventory.quantity + p_quantity,
    updated_at = NOW();
END;
$$;
