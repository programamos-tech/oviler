-- Modo de garantías: por venta (factura) o por producto
ALTER TABLE branches ADD COLUMN IF NOT EXISTS warranty_by_sale BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN branches.warranty_by_sale IS 'true = garantías vinculadas a factura/venta; false = garantías por producto (sin exigir factura)';
