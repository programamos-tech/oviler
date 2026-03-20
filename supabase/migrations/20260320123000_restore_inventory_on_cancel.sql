-- Al anular una venta/pedido, devolver stock si ya había sido descontado.
-- El dinero ya se "descuenta" de reportes porque estos solo cuentan ventas completed.

CREATE OR REPLACE FUNCTION restore_inventory_when_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Solo restaurar cuando realmente pasa a cancelado
  IF NEW.status <> 'cancelled'
     OR OLD.status = 'cancelled'
     OR NEW.inventory_deducted_at IS NULL THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT si.product_id, COALESCE(si.quantity_picked, si.quantity) AS qty
    FROM sale_items si
    WHERE si.sale_id = NEW.id
      AND COALESCE(si.quantity_picked, si.quantity) > 0
  LOOP
    PERFORM increment_inventory(r.product_id, NEW.branch_id, r.qty);
  END LOOP;

  -- Permite trazabilidad: quedó anulada y sin stock descontado.
  NEW.inventory_deducted_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_restore_inventory_on_cancel ON sales;
CREATE TRIGGER trigger_restore_inventory_on_cancel
  BEFORE UPDATE OF status ON sales
  FOR EACH ROW
  EXECUTE FUNCTION restore_inventory_when_cancelled();
