-- Columnas para efectivo (cuánto me dieron / vuelto) y pago mixto (desglose).
-- Si ya existen por 20240210310000_sales_payment_mixed, no se duplican (IF NOT EXISTS).

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('cash', 'transfer', 'mixed'));

ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_received DECIMAL(10,2) NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_cash DECIMAL(10,2) NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_transfer DECIMAL(10,2) NULL;
