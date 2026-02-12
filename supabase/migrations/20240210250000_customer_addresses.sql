-- Varias direcciones por cliente (casa, oficina, abuelos, etc.).
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  reference_point TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see addresses of customers in their organization"
  ON customer_addresses FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users insert addresses for customers in their organization"
  ON customer_addresses FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users update addresses of customers in their organization"
  ON customer_addresses FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users delete addresses of customers in their organization"
  ON customer_addresses FOR DELETE
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- Migrar dirección actual de clientes a la nueva tabla (una fila por cliente que tenga address o reference_point).
-- reference_point puede no existir en customers si no se aplicó la migración 20240210240000.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'reference_point'
  ) THEN
    INSERT INTO customer_addresses (customer_id, label, address, reference_point, is_default, display_order)
    SELECT id, 'Principal', COALESCE(TRIM(address), ''), NULLIF(TRIM(reference_point), ''), true, 0
    FROM customers
    WHERE TRIM(COALESCE(address, '')) <> '' OR TRIM(COALESCE(reference_point, '')) <> '';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'address'
  ) THEN
    INSERT INTO customer_addresses (customer_id, label, address, reference_point, is_default, display_order)
    SELECT id, 'Principal', COALESCE(TRIM(address), ''), NULL, true, 0
    FROM customers
    WHERE TRIM(COALESCE(address, '')) <> '';
  END IF;
END $$;

-- Quitar columnas de dirección de customers (ahora solo en customer_addresses).
ALTER TABLE customers DROP COLUMN IF EXISTS address;
ALTER TABLE customers DROP COLUMN IF EXISTS reference_point;
