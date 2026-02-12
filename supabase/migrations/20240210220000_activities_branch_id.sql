-- Actividades discriminadas por organización Y sucursal (branch_id).
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activities_branch_id ON activities(branch_id);
CREATE INDEX IF NOT EXISTS idx_activities_org_branch_created ON activities(organization_id, branch_id, created_at DESC);

-- Recrear políticas RLS: ver/insertar solo actividades de la org y de sucursales del usuario.
DROP POLICY IF EXISTS "Users see activities of their organization" ON activities;
DROP POLICY IF EXISTS "Users insert activities in their organization" ON activities;

CREATE POLICY "Users see activities of their organization and branches"
  ON activities FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      branch_id IS NULL
      OR branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users insert activities in their organization and branches"
  ON activities FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      branch_id IS NULL
      OR branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    )
  );
