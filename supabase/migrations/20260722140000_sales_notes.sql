-- Nota adicional opcional por venta/factura (comentarios internos, instrucciones, etc.).
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN sales.notes IS 'Nota adicional de la venta (visible en detalle de factura).';
