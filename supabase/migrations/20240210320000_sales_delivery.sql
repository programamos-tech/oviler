-- Venta a domicilio: indicador, dirección de entrega y valor del domicilio (obligatorio en la app cuando is_delivery).
ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_delivery BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES customer_addresses(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) NULL;
