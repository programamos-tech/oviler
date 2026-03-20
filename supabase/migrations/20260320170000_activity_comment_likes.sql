-- Likes sobre comentarios del feed de actividades.
CREATE TABLE IF NOT EXISTS activity_comment_likes (
  comment_id UUID NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_comment_id
  ON activity_comment_likes(comment_id);
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE activity_comment_likes ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users see comment likes of their org activities"
    ON activity_comment_likes FOR SELECT
    USING (
      comment_id IN (
        SELECT ac.id
        FROM activity_comments ac
        JOIN activities a ON a.id = ac.activity_id
        WHERE a.organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert likes on their org comments"
    ON activity_comment_likes FOR INSERT
    WITH CHECK (
      comment_id IN (
        SELECT ac.id
        FROM activity_comments ac
        JOIN activities a ON a.id = ac.activity_id
        WHERE a.organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
      )
      AND user_id = auth.uid()
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users delete own likes on comments"
    ON activity_comment_likes FOR DELETE
    USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END $$;
