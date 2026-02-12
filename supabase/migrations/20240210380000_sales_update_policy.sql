-- Permitir a usuarios actualizar ventas de sus sucursales (anular, marcar pago recibido, etc.).
CREATE POLICY "Users update sales of their branches"
  ON sales FOR UPDATE
  USING (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );
