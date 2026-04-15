-- Al anular una venta/factura, cancelar el crédito vinculado (sale_id) y eliminar abonos
-- para que dejen de contar en ingresos. SECURITY DEFINER: credit_payments no tiene política DELETE para el cliente.

CREATE OR REPLACE FUNCTION cancel_customer_credits_when_sale_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  inv_label TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  inv_label := COALESCE(NULLIF(btrim(COALESCE(NEW.invoice_number, '')), ''), NEW.id::text);

  FOR rec IN
    SELECT id FROM customer_credits
    WHERE sale_id = NEW.id AND cancelled_at IS NULL
  LOOP
    UPDATE customer_credits
    SET
      cancelled_at = timezone('utc', now()),
      updated_at = timezone('utc', now()),
      notes = CASE
        WHEN notes IS NULL OR btrim(notes) = '' THEN
          '[Crédito cancelado automáticamente: factura ' || inv_label || ' anulada.]'
        ELSE
          notes || E'\n[Crédito cancelado automáticamente: factura ' || inv_label || ' anulada.]'
      END
    WHERE id = rec.id;

    DELETE FROM credit_payments WHERE credit_id = rec.id;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION cancel_customer_credits_when_sale_cancelled() IS
  'Tras marcar sales.status = cancelled: cancela customer_credits con sale_id y borra credit_payments (abonos ya no suman en reportes).';

DROP TRIGGER IF EXISTS trg_cancel_linked_credits_on_sale_cancel ON sales;
CREATE TRIGGER trg_cancel_linked_credits_on_sale_cancel
  AFTER UPDATE OF status ON sales
  FOR EACH ROW
  EXECUTE FUNCTION cancel_customer_credits_when_sale_cancelled();
