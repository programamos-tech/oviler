-- Punto de referencia para entregas a domicilio (ej. "frente al parque", "casa blanca portón negro").
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS reference_point TEXT;

COMMENT ON COLUMN customers.reference_point IS 'Punto de referencia para ubicar la dirección en entregas.';
