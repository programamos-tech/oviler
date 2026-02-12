-- Función RPC para decrementar inventario (usada en garantías y otros procesos)
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
    AND branch_id = p_branch_id;
  
  -- Si no existe el registro, crear uno con cantidad 0 (no debería pasar pero por seguridad)
  IF NOT FOUND THEN
    INSERT INTO inventory (product_id, branch_id, quantity, updated_at)
    VALUES (p_product_id, p_branch_id, 0, NOW())
    ON CONFLICT (product_id, branch_id) DO NOTHING;
  END IF;
END;
$$;

-- Función RPC para incrementar inventario
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
  INSERT INTO inventory (product_id, branch_id, quantity, updated_at)
  VALUES (p_product_id, p_branch_id, p_quantity, NOW())
  ON CONFLICT (product_id, branch_id)
  DO UPDATE SET
    quantity = inventory.quantity + p_quantity,
    updated_at = NOW();
END;
$$;
