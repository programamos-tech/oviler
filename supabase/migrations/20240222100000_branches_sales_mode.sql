-- Modo de la sucursal: ventas (retail) o pedidos (restaurante/domicilios).
-- Define copy en la UI (Ventas vs Pedidos) y flujo de estados.
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS sales_mode TEXT NOT NULL DEFAULT 'sales'
  CHECK (sales_mode IN ('sales', 'orders'));

COMMENT ON COLUMN branches.sales_mode IS 'sales = retail (ventas); orders = restaurante/domicilios (pedidos)';
