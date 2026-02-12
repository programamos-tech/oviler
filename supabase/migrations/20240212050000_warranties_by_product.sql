-- Permitir garantías por producto (sin factura): sale_id/sale_item_id opcionales, branch_id y quantity
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;
ALTER TABLE warranties ALTER COLUMN sale_id DROP NOT NULL;
ALTER TABLE warranties ALTER COLUMN sale_item_id DROP NOT NULL;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;

-- Una garantía debe tener sale_id o branch_id (para por producto)
ALTER TABLE warranties DROP CONSTRAINT IF EXISTS warranties_sale_item_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_warranties_sale_item_id_unique
  ON warranties(sale_item_id) WHERE sale_item_id IS NOT NULL;

-- RLS: reemplazar políticas para permitir garantías con sale_id (por venta) o con branch_id (por producto)
DROP POLICY IF EXISTS "Users see warranties of their branches" ON warranties;
CREATE POLICY "Users see warranties of their branches"
  ON warranties FOR SELECT
  USING (
    (sale_id IS NOT NULL AND sale_id IN (
      SELECT id FROM sales
      WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    ))
    OR
    (sale_id IS NULL AND branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Users create warranties for sales in their branches" ON warranties;
CREATE POLICY "Users create warranties for sales in their branches"
  ON warranties FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND (
      (sale_id IS NOT NULL AND sale_id IN (
        SELECT id FROM sales
        WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
      ))
      OR
      (sale_id IS NULL AND branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users update warranties of their branches" ON warranties;
CREATE POLICY "Users update warranties of their branches"
  ON warranties FOR UPDATE
  USING (
    (sale_id IS NOT NULL AND sale_id IN (
      SELECT id FROM sales
      WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    ))
    OR
    (sale_id IS NULL AND branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))
  );

COMMENT ON COLUMN warranties.branch_id IS 'Sucursal; obligatorio cuando la garantía es por producto (sin factura)';
COMMENT ON COLUMN warranties.quantity IS 'Cantidad de unidades; usado cuando no hay sale_item_id';
