-- Envío base del catálogo web: lo define el dueño en Configurar sucursal (no el cliente en checkout).

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS catalog_delivery_fee_cop integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN branches.catalog_delivery_fee_cop IS 'Costo de envío (COP) aplicado a pedidos del catálogo web; ≥ 0.';
