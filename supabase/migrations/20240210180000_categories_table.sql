-- Categorías de productos por organización (cada org define las suyas).
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON categories(organization_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see categories of their organization"
  ON categories FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users create categories in their organization"
  ON categories FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users update categories in their organization"
  ON categories FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users delete categories in their organization"
  ON categories FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );
