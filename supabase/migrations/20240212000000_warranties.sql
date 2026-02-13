-- Tabla de garantías (proceso administrativo)
CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warranty_type TEXT NOT NULL CHECK (warranty_type IN ('exchange', 'refund', 'repair')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  replacement_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Solo una garantía por ítem de venta
  UNIQUE(sale_item_id)
);

CREATE INDEX IF NOT EXISTS idx_warranties_sale_id ON warranties(sale_id);
CREATE INDEX IF NOT EXISTS idx_warranties_sale_item_id ON warranties(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_warranties_customer_id ON warranties(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_product_id ON warranties(product_id);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON warranties(status);

-- RLS
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users see warranties of their branches"
    ON warranties FOR SELECT
    USING (
      sale_id IN (
        SELECT id FROM sales
        WHERE branch_id IN (
          SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users create warranties for sales in their branches"
    ON warranties FOR INSERT
    WITH CHECK (
      sale_id IN (
        SELECT id FROM sales
        WHERE branch_id IN (
          SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
        )
      )
      AND requested_by = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users update warranties of their branches"
    ON warranties FOR UPDATE
    USING (
      sale_id IN (
        SELECT id FROM sales
        WHERE branch_id IN (
          SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_warranties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_warranties_updated_at ON warranties;
CREATE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION update_warranties_updated_at();
