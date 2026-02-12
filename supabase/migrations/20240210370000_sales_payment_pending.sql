-- Ventas a domicilio: pago contra entrega o transferencia por confirmar.
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_pending BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN sales.payment_pending IS 'True cuando el cobro es en entrega o la transferencia aún no se ha recibido.';
