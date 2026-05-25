-- Listado de clientes por sucursal ordenado por nombre.
CREATE INDEX IF NOT EXISTS idx_customers_branch_name ON customers (branch_id, name);

-- Ventas recientes de un cliente (detalle de cliente).
CREATE INDEX IF NOT EXISTS idx_sales_customer_created_at ON sales (customer_id, created_at DESC);

-- Créditos del cliente en sucursal.
CREATE INDEX IF NOT EXISTS idx_customer_credits_branch_customer ON customer_credits (branch_id, customer_id, created_at DESC);
