-- Si es true, la anulación de factura no se aplica al instante: queda como solicitud hasta que un admin la apruebe.
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS invoice_cancel_requires_approval BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN branches.invoice_cancel_requires_approval IS 'Cuando es true, las anulaciones de factura requieren aprobación de un administrador u owner.';
