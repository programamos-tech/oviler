-- Alistamiento: cantidad realmente alistada por línea (NULL = pendiente, 0 = no hay, 1..quantity = alistado).
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS quantity_picked INT;

ALTER TABLE sale_items
  DROP CONSTRAINT IF EXISTS sale_items_quantity_picked_check;
ALTER TABLE sale_items
  ADD CONSTRAINT sale_items_quantity_picked_check
  CHECK (quantity_picked IS NULL OR (quantity_picked >= 0 AND quantity_picked <= quantity));

COMMENT ON COLUMN sale_items.quantity_picked IS 'Cantidad alistada por el picker. NULL = pendiente, 0 = no hay, 1..quantity = cantidad alistada.';

-- Permitir actualizar ítems de ventas de sus sucursales (para registrar alistamiento).
DROP POLICY IF EXISTS "Users update sale_items of their branches" ON sale_items;
CREATE POLICY "Users update sale_items of their branches"
  ON sale_items FOR UPDATE
  USING (sale_id IN (SELECT id FROM sales WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())))
  WITH CHECK (sale_id IN (SELECT id FROM sales WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));
