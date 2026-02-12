-- Ítems por venta (producto, cantidad, precio) para ticket promedio y top productos por cliente.
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see sale_items of their branches"
  ON sale_items FOR SELECT
  USING (
    sale_id IN (
      SELECT id FROM sales
      WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users insert sale_items for sales in their branches"
  ON sale_items FOR INSERT
  WITH CHECK (
    sale_id IN (
      SELECT id FROM sales
      WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users delete sale_items of their branches"
  ON sale_items FOR DELETE
  USING (
    sale_id IN (
      SELECT id FROM sales
      WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    )
  );
