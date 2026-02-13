-- Tabla de domiciliarios por sucursal
CREATE TABLE IF NOT EXISTS delivery_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- Código como "d1", "d2", "d3", etc.
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, code)
);

CREATE INDEX IF NOT EXISTS idx_delivery_persons_branch_id ON delivery_persons(branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_persons_active ON delivery_persons(active);

-- RLS
ALTER TABLE delivery_persons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users see delivery persons of their branches"
    ON delivery_persons FOR SELECT
    USING (
      branch_id IN (
        SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage delivery persons of their branches"
    ON delivery_persons FOR ALL
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
