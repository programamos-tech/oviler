-- Stock puede estar en local o bodega por sucursal (cuando la sucursal tiene bodega).
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'local' CHECK (location IN ('local','bodega'));

-- Reemplazar constraint único: un registro por (producto, sucursal, ubicación).
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_product_id_branch_id_key;
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_product_id_branch_id_location_key;
ALTER TABLE inventory ADD CONSTRAINT inventory_product_id_branch_id_location_key
  UNIQUE (product_id, branch_id, location);
