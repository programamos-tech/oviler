CREATE POLICY "Users update products in their organization"
  ON products FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );
