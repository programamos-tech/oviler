-- Motivo de anulación cuando la factura se anula desde el detalle.
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL;

COMMENT ON COLUMN sales.cancellation_reason IS 'Motivo indicado por el usuario al anular la factura.';
