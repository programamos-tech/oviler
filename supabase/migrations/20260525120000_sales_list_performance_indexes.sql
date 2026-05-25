-- Acelera listado de ventas por sucursal + fecha (orden created_at DESC).
CREATE INDEX IF NOT EXISTS idx_sales_branch_created_at ON sales (branch_id, created_at DESC);

-- Filtros frecuentes por sucursal y estado.
CREATE INDEX IF NOT EXISTS idx_sales_branch_status_created_at ON sales (branch_id, status, created_at DESC);

-- Búsqueda por número de factura dentro de la sucursal.
CREATE INDEX IF NOT EXISTS idx_sales_branch_invoice_number ON sales (branch_id, invoice_number);
