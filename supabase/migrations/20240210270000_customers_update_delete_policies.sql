-- Permitir actualizar y eliminar clientes de la organización.
DO $$ BEGIN
  CREATE POLICY "Users update customers in their organization"
    ON customers FOR UPDATE
    USING (
      organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
    WITH CHECK (
      organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users delete customers in their organization"
    ON customers FOR DELETE
    USING (
      organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
