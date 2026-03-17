-- Tipos de ingreso por organización (diezmo, ofrenda, donación, eventos, etc.)

CREATE TABLE IF NOT EXISTS income_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_income_types_organization_id ON income_types(organization_id);

COMMENT ON TABLE income_types IS 'Conceptos de ingreso: diezmo, ofrenda, donación, eventos, campamentos, etc.';

ALTER TABLE sales ADD COLUMN IF NOT EXISTS income_type_id UUID REFERENCES income_types(id) ON DELETE SET NULL;
COMMENT ON COLUMN sales.income_type_id IS 'Tipo de ingreso cuando aplica (diezmo, ofrenda, evento, etc.).';

CREATE INDEX IF NOT EXISTS idx_sales_income_type_id ON sales(income_type_id);

-- RLS
ALTER TABLE income_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see income_types of their organization" ON income_types;
CREATE POLICY "Users see income_types of their organization"
  ON income_types FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users manage income_types of their organization" ON income_types;
CREATE POLICY "Users manage income_types of their organization"
  ON income_types FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Trigger updated_at (la función update_updated_at_column ya existe en el schema)
DROP TRIGGER IF EXISTS update_income_types_updated_at ON income_types;
CREATE TRIGGER update_income_types_updated_at
  BEFORE UPDATE ON income_types FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
