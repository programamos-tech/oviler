-- Cédula o documento de identidad del cliente.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS cedula TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_cedula ON customers(organization_id, cedula) WHERE cedula IS NOT NULL;

COMMENT ON COLUMN customers.cedula IS 'Cédula o documento de identidad del cliente.';
