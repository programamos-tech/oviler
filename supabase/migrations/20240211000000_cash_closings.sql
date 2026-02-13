-- Tabla para almacenar los cierres de caja diarios
CREATE TABLE IF NOT EXISTS cash_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  closing_date DATE NOT NULL,
  
  -- Resumen financiero
  expected_cash DECIMAL(10,2) NOT NULL,
  expected_transfer DECIMAL(10,2) NOT NULL,
  actual_cash DECIMAL(10,2) NOT NULL,
  actual_transfer DECIMAL(10,2) NOT NULL,
  cash_difference DECIMAL(10,2) NOT NULL DEFAULT 0,
  transfer_difference DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Estadísticas del día
  total_sales INT NOT NULL DEFAULT 0,
  physical_sales INT NOT NULL DEFAULT 0,
  delivery_sales INT NOT NULL DEFAULT 0,
  total_units INT NOT NULL DEFAULT 0,
  cancelled_invoices INT NOT NULL DEFAULT 0,
  cancelled_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  warranties_count INT NOT NULL DEFAULT 0,
  
  -- Notas y observaciones
  notes TEXT,
  difference_reason TEXT,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un solo cierre por sucursal por día
  UNIQUE(branch_id, closing_date)
);

CREATE INDEX IF NOT EXISTS idx_cash_closings_branch_id ON cash_closings(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_closings_user_id ON cash_closings(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_closings_closing_date ON cash_closings(closing_date DESC);

-- RLS
ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users see cash closings of their branches"
    ON cash_closings FOR SELECT
    USING (
      branch_id IN (
        SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users create cash closings for their branches"
    ON cash_closings FOR INSERT
    WITH CHECK (
      branch_id IN (
        SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
      )
      AND user_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users update cash closings of their branches"
    ON cash_closings FOR UPDATE
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
