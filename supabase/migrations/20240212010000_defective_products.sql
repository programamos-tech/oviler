-- Tabla de productos defectuosos (inventario físico de merma)
CREATE TABLE IF NOT EXISTS defective_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  defect_description TEXT NOT NULL,
  disposition TEXT NOT NULL DEFAULT 'pending' CHECK (disposition IN ('pending', 'returned_to_supplier', 'destroyed', 'repaired')),
  disposition_date TIMESTAMPTZ,
  disposition_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defective_products_warranty_id ON defective_products(warranty_id);
CREATE INDEX IF NOT EXISTS idx_defective_products_product_id ON defective_products(product_id);
CREATE INDEX IF NOT EXISTS idx_defective_products_branch_id ON defective_products(branch_id);
CREATE INDEX IF NOT EXISTS idx_defective_products_disposition ON defective_products(disposition);

-- RLS
ALTER TABLE defective_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users see defective products of their branches"
    ON defective_products FOR SELECT
    USING (
      branch_id IN (
        SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users create defective products for their branches"
    ON defective_products FOR INSERT
    WITH CHECK (
      branch_id IN (
        SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users update defective products of their branches"
    ON defective_products FOR UPDATE
    USING (
      branch_id IN (
        SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_defective_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_defective_products_updated_at ON defective_products;
CREATE TRIGGER update_defective_products_updated_at
  BEFORE UPDATE ON defective_products
  FOR EACH ROW
  EXECUTE FUNCTION update_defective_products_updated_at();

-- Trigger: cuando un producto defectuoso se marca como 'repaired', aumentar stock normal
CREATE OR REPLACE FUNCTION handle_repaired_defective_product()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar cuando cambia de cualquier estado a 'repaired'
  IF NEW.disposition = 'repaired' AND (OLD.disposition IS NULL OR OLD.disposition != 'repaired') THEN
    -- Aumentar stock normal del producto en la sucursal
    INSERT INTO inventory (product_id, branch_id, quantity, updated_at)
    VALUES (NEW.product_id, NEW.branch_id, NEW.quantity, NOW())
    ON CONFLICT (product_id, branch_id)
    DO UPDATE SET
      quantity = inventory.quantity + NEW.quantity,
      updated_at = NOW();
    
    -- Actualizar fecha de disposición si no está establecida
    IF NEW.disposition_date IS NULL THEN
      NEW.disposition_date = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_repaired_defective_product ON defective_products;
CREATE TRIGGER handle_repaired_defective_product
  BEFORE UPDATE ON defective_products
  FOR EACH ROW
  EXECUTE FUNCTION handle_repaired_defective_product();
