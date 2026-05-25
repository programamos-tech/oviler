-- Listado de créditos por sucursal (orden reciente).
CREATE INDEX IF NOT EXISTS idx_customer_credits_branch_created_at ON customer_credits (branch_id, created_at DESC);
