-- Permite eliminar productos del catálogo (misma regla de org que SELECT/UPDATE).
-- Sin esta política RLS, el DELETE no afecta filas y el producto "vuelve a aparecer".

DO $$ BEGIN
  CREATE POLICY "Users delete products in their organization"
    ON products FOR DELETE
    USING (
      organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
