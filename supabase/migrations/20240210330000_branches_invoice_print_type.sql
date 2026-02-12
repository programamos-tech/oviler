-- Tipo de factura al imprimir: tirilla (papel térmico) o hoja de block (A4/carta).
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS invoice_print_type TEXT NOT NULL DEFAULT 'block'
  CHECK (invoice_print_type IN ('tirilla', 'block'));

COMMENT ON COLUMN branches.invoice_print_type IS 'tirilla = papel térmico estrecho (80mm); block = hoja tamaño carta/A4.';
