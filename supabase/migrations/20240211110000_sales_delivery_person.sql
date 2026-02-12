-- Agregar campos de domiciliario y pago de envío a sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_person_id UUID REFERENCES delivery_persons(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_paid_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_sales_delivery_person_id ON sales(delivery_person_id);
CREATE INDEX IF NOT EXISTS idx_sales_delivery_paid ON sales(delivery_paid);
