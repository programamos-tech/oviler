-- Muro de actividades por organización. Retención 90 días (purge con función).
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  summary TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);

CREATE TABLE IF NOT EXISTS activity_likes (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (activity_id, user_id)
);

-- RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see activities of their organization"
  ON activities FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users insert activities in their organization"
  ON activities FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users see comments of their org activities"
  ON activity_comments FOR SELECT
  USING (
    activity_id IN (SELECT id FROM activities WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users insert comments on their org activities"
  ON activity_comments FOR INSERT
  WITH CHECK (
    activity_id IN (SELECT id FROM activities WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
    AND user_id = auth.uid()
  );

CREATE POLICY "Users delete own comments"
  ON activity_comments FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users see likes of their org activities"
  ON activity_likes FOR SELECT
  USING (
    activity_id IN (SELECT id FROM activities WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users insert likes on their org activities"
  ON activity_likes FOR INSERT
  WITH CHECK (
    activity_id IN (SELECT id FROM activities WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
    AND user_id = auth.uid()
  );

CREATE POLICY "Users delete own likes"
  ON activity_likes FOR DELETE
  USING (user_id = auth.uid());

-- Purga: eliminar actividades con más de 90 días (ejecutar por cron diario o semanal).
CREATE OR REPLACE FUNCTION purge_activities_older_than_90_days()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM activities
    WHERE created_at < (NOW() - INTERVAL '90 days')
    RETURNING id
  )
  SELECT COUNT(*)::INT INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION purge_activities_older_than_90_days() IS 'Elimina actividades con más de 90 días. Ejecutar por cron (Supabase Edge Function o externo).';
