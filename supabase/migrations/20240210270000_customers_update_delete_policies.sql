-- Permitir actualizar y eliminar clientes de la organización.
CREATE POLICY "Users update customers in their organization"
  ON customers FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users delete customers in their organization"
  ON customers FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );
