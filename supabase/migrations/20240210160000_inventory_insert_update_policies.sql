-- Permitir a usuarios crear y actualizar inventario en sucursales donde trabajan.
DO $$ BEGIN
  CREATE POLICY "Users insert inventory in their branches"
    ON inventory FOR INSERT
    WITH CHECK (
      branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users update inventory in their branches"
    ON inventory FOR UPDATE
    USING (
      branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    )
    WITH CHECK (
      branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
