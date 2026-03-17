-- Fecha del ingreso: permite registrar un ingreso con la fecha que corresponde (ej. ofrenda del miércoles).
-- Si es NULL, el calendario usa created_at para compatibilidad con registros antiguos.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_date DATE;
COMMENT ON COLUMN sales.sale_date IS 'Fecha a la que corresponde el ingreso (ej. día del culto). Si NULL, se usa created_at para listados y calendario.';
