-- Egresos y gastos por sucursal (salida de dinero: efectivo o transferencia)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
  concept TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see expenses of their branches"
  ON expenses FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users create expenses for their branches"
  ON expenses FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users update expenses of their branches"
  ON expenses FOR UPDATE
  USING (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete expenses of their branches"
  ON expenses FOR DELETE
  USING (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );
