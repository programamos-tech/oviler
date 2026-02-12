-- Permitir método de pago "mixed" y guardar montos para efectivo (vuelto) y mixto (split).
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('cash', 'transfer', 'mixed'));

-- Cuánto me dieron (efectivo) para calcular vuelto.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_received DECIMAL(10,2) NULL;

-- Desglose cuando es pago mixto.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_cash DECIMAL(10,2) NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_transfer DECIMAL(10,2) NULL;
