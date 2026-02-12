-- Descuento por ítem: porcentaje o valor fijo sobre la línea.
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN sale_items.discount_percent IS 'Descuento en % sobre (quantity * unit_price).';
COMMENT ON COLUMN sale_items.discount_amount IS 'Descuento fijo en $ sobre el total de la línea.';
