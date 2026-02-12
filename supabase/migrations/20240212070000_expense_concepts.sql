-- Conceptos de egresos por organización (lista configurable; por defecto se usan unos predefinidos en la app).
CREATE TABLE IF NOT EXISTS expense_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_concepts_organization_id ON expense_concepts(organization_id);

ALTER TABLE expense_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see expense concepts of their organization"
  ON expense_concepts FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users create expense concepts in their organization"
  ON expense_concepts FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users update expense concepts in their organization"
  ON expense_concepts FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users delete expense concepts in their organization"
  ON expense_concepts FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );
