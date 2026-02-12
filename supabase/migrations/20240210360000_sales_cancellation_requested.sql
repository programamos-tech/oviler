-- Solicitud de anulación pendiente de aprobación (cuando la sucursal tiene invoice_cancel_requires_approval).
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_requested_by UUID NULL REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN sales.cancellation_requested_at IS 'Cuando no es null y status sigue completed, la anulación está pendiente de aprobación por un admin.';
COMMENT ON COLUMN sales.cancellation_requested_by IS 'Usuario que solicitó la anulación (cuando requiere aprobación).';
