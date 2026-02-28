-- Fix: sync_inventory_from_locations usaba ON CONFLICT (product_id, branch_id)
-- pero inventory tiene UNIQUE (product_id, branch_id, location). Incluir location = 'bodega'.

CREATE OR REPLACE FUNCTION sync_inventory_from_locations()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_branch_id UUID;
  v_total INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
    SELECT branch_id INTO v_branch_id FROM locations WHERE id = OLD.location_id;
  ELSE
    v_product_id := NEW.product_id;
    SELECT branch_id INTO v_branch_id FROM locations WHERE id = NEW.location_id;
  END IF;

  SELECT COALESCE(SUM(il.quantity), 0)::INT INTO v_total
  FROM inventory_locations il
  JOIN locations l ON l.id = il.location_id
  WHERE il.product_id = v_product_id AND l.branch_id = v_branch_id;

  INSERT INTO inventory (product_id, branch_id, location, quantity)
  VALUES (v_product_id, v_branch_id, 'bodega', v_total)
  ON CONFLICT (product_id, branch_id, location) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
