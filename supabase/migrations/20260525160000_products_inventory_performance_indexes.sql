-- Listado de productos por organización (orden alfabético).
CREATE INDEX IF NOT EXISTS idx_products_org_name ON products (organization_id, name);

-- Inventario por sucursal y producto.
CREATE INDEX IF NOT EXISTS idx_inventory_branch_product ON inventory (branch_id, product_id);
