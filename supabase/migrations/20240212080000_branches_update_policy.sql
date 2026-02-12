-- Permitir actualizar sucursales de la organización (nombre, NIT, dirección, teléfono, logo, etc.)
CREATE POLICY "Users update branches in their organization"
  ON branches FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );
