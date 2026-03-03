-- Descontar stock de la sucursal cuando el pedido pasa a "Despachado" (on_the_way).
-- Se usa quantity_picked por línea; si es NULL, se usa quantity. Solo se descuenta una vez por venta.

ALTER TABLE sales ADD COLUMN IF NOT EXISTS inventory_deducted_at TIMESTAMPTZ;

COMMENT ON COLUMN sales.inventory_deducted_at IS 'Momento en que se descontó el inventario al despachar (status = on_the_way). NULL = aún no se ha descontado.';

CREATE OR REPLACE FUNCTION deduct_inventory_when_dispatched()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  qty INT;
BEGIN
  -- Solo actuar cuando el estado pasa a on_the_way y aún no se ha descontado
  IF NEW.status <> 'on_the_way'
     OR OLD.status = 'on_the_way'
     OR NEW.inventory_deducted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT si.product_id, COALESCE(si.quantity_picked, si.quantity) AS qty
    FROM sale_items si
    WHERE si.sale_id = NEW.id
      AND COALESCE(si.quantity_picked, si.quantity) > 0
  LOOP
    qty := r.qty;
    PERFORM decrement_inventory(r.product_id, NEW.branch_id, qty);
  END LOOP;

  NEW.inventory_deducted_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_dispatch ON sales;
CREATE TRIGGER trigger_deduct_inventory_on_dispatch
  BEFORE UPDATE OF status ON sales
  FOR EACH ROW
  EXECUTE FUNCTION deduct_inventory_when_dispatched();
