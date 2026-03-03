-- Ventas en tienda (sin envío): descontar stock al marcar como Finalizado.
-- Con envío: se sigue descontando al pasar a Despachado (on_the_way).

CREATE OR REPLACE FUNCTION deduct_inventory_when_dispatched()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  qty INT;
  should_deduct BOOLEAN := false;
BEGIN
  IF NEW.inventory_deducted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Con envío: descontar al pasar a Despachado (on_the_way)
  IF NEW.is_delivery = true AND NEW.status = 'on_the_way' AND OLD.status IS DISTINCT FROM 'on_the_way' THEN
    should_deduct := true;
  END IF;

  -- Venta en tienda (sin envío): descontar al pasar a Finalizado (completed)
  IF NEW.is_delivery = false AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    should_deduct := true;
  END IF;

  IF NOT should_deduct THEN
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

COMMENT ON COLUMN sales.inventory_deducted_at IS 'Momento en que se descontó el inventario: en envíos al despachar (on_the_way), en venta en tienda al finalizar (completed). NULL = aún no se ha descontado.';
