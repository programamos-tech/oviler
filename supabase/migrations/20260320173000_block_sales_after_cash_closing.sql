-- Bloquear nuevas ventas cuando ya existe cierre de caja del día en la sucursal.
CREATE OR REPLACE FUNCTION prevent_sales_after_daily_closing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  today_bogota DATE;
  has_closing BOOLEAN;
BEGIN
  today_bogota := (timezone('America/Bogota', now()))::date;

  SELECT EXISTS (
    SELECT 1
    FROM cash_closings cc
    WHERE cc.branch_id = NEW.branch_id
      AND cc.closing_date = today_bogota
  ) INTO has_closing;

  IF has_closing THEN
    RAISE EXCEPTION 'Ya existe cierre de caja para hoy en esta sucursal. No se pueden registrar más ventas.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_sales_after_daily_closing ON sales;

CREATE TRIGGER trg_prevent_sales_after_daily_closing
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION prevent_sales_after_daily_closing();
