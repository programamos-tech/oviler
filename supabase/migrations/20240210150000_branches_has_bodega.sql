-- Permite que cada sucursal decida si usa bodega (stock en dos ubicaciones) o solo local.
ALTER TABLE branches ADD COLUMN IF NOT EXISTS has_bodega BOOLEAN DEFAULT false;
