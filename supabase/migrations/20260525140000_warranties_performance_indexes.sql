-- Listado de garantías por sucursal (orden reciente).
CREATE INDEX IF NOT EXISTS idx_warranties_branch_created_at ON warranties (branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warranties_branch_status_created_at ON warranties (branch_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warranties_customer_id ON warranties (customer_id);
