-- Scope customers per branch so each branch starts from zero.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
