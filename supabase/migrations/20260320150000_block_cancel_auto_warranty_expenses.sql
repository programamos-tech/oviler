-- Bloquear anulación de egresos automáticos por devolución de garantía.
CREATE OR REPLACE FUNCTION prevent_cancel_auto_warranty_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  is_auto_refund boolean;
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'cancelled' THEN
    is_auto_refund :=
      COALESCE(OLD.concept, '') LIKE 'Devolución garantía %'
      OR COALESCE(OLD.notes, '') LIKE '%Reembolso automático al procesar garantía tipo devolución%';

    IF is_auto_refund THEN
      RAISE EXCEPTION 'No se puede anular un egreso automático de garantía.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_cancel_auto_warranty_expense ON expenses;

CREATE TRIGGER trg_prevent_cancel_auto_warranty_expense
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION prevent_cancel_auto_warranty_expense();
