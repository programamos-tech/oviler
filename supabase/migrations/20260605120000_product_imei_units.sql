-- Trazabilidad IMEI: celulares/equipos serializados por unidad (stock → venta → garantía).

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS requires_imei BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.requires_imei IS 'Si true, cada unidad debe registrarse con IMEI (15 dígitos) en stock y al vender.';

CREATE TABLE IF NOT EXISTS product_imei_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  imei TEXT NOT NULL,
  imei_normalized TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (status IN ('in_stock', 'sold', 'warranty', 'defective', 'returned')),
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  sold_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_imei_units_org_imei_norm
  ON product_imei_units (organization_id, imei_normalized);

CREATE INDEX IF NOT EXISTS idx_product_imei_units_branch_product_status
  ON product_imei_units (branch_id, product_id, status);

CREATE INDEX IF NOT EXISTS idx_product_imei_units_sale_item
  ON product_imei_units (sale_item_id)
  WHERE sale_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_imei_units_sale
  ON product_imei_units (sale_id)
  WHERE sale_id IS NOT NULL;

ALTER TABLE warranties
  ADD COLUMN IF NOT EXISTS product_imei_unit_id UUID REFERENCES product_imei_units(id) ON DELETE SET NULL;

COMMENT ON TABLE product_imei_units IS 'Unidades serializadas (IMEI) por sucursal: stock, venta y postventa.';
COMMENT ON COLUMN warranties.product_imei_unit_id IS 'IMEI concreto cubierto por esta garantía (cuando aplica).';

-- Normaliza IMEI: solo dígitos
CREATE OR REPLACE FUNCTION normalize_imei(raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(raw, ''), '\D', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION validate_imei_normalized(norm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT norm IS NOT NULL AND length(norm) = 15;
$$;

CREATE OR REPLACE FUNCTION update_product_imei_units_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_product_imei_units_updated_at ON product_imei_units;
CREATE TRIGGER update_product_imei_units_updated_at
  BEFORE UPDATE ON product_imei_units
  FOR EACH ROW
  EXECUTE FUNCTION update_product_imei_units_updated_at();

-- Registrar IMEIs en stock (entrada de mercancía)
CREATE OR REPLACE FUNCTION register_product_imei_units(
  p_branch_id UUID,
  p_product_id UUID,
  p_imeis TEXT[]
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_requires BOOLEAN;
  v_imei TEXT;
  v_norm TEXT;
  v_count INT := 0;
BEGIN
  SELECT b.organization_id INTO v_org_id
  FROM branches b
  WHERE b.id = p_branch_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sucursal no encontrada';
  END IF;

  SELECT p.requires_imei INTO v_requires
  FROM products p
  WHERE p.id = p_product_id AND p.organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado en la organización';
  END IF;

  IF NOT COALESCE(v_requires, false) THEN
    RAISE EXCEPTION 'Este producto no está marcado como que requiere IMEI';
  END IF;

  IF p_imeis IS NULL OR array_length(p_imeis, 1) IS NULL OR array_length(p_imeis, 1) = 0 THEN
    RAISE EXCEPTION 'Debes indicar al menos un IMEI';
  END IF;

  FOREACH v_imei IN ARRAY p_imeis LOOP
    v_norm := normalize_imei(v_imei);
    IF NOT validate_imei_normalized(v_norm) THEN
      RAISE EXCEPTION 'IMEI inválido (debe tener 15 dígitos): %', v_imei;
    END IF;

    INSERT INTO product_imei_units (
      organization_id, branch_id, product_id, imei, imei_normalized, status
    ) VALUES (
      v_org_id, p_branch_id, p_product_id, trim(v_imei), v_norm, 'in_stock'
    );

    v_count := v_count + 1;
  END LOOP;

  PERFORM increment_inventory(p_product_id, p_branch_id, v_count);
  RETURN v_count;
END;
$$;

-- Asignar unidades IMEI a una línea de venta (al facturar)
CREATE OR REPLACE FUNCTION assign_imei_units_to_sale_item(
  p_sale_item_id UUID,
  p_imei_unit_ids UUID[]
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_item RECORD;
  v_unit_id UUID;
  v_expected INT;
  v_assigned INT := 0;
BEGIN
  SELECT si.id, si.sale_id, si.product_id, si.quantity, s.branch_id, s.customer_id, s.status AS sale_status
  INTO v_sale_item
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE si.id = p_sale_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Línea de venta no encontrada';
  END IF;

  v_expected := v_sale_item.quantity;

  IF p_imei_unit_ids IS NULL OR array_length(p_imei_unit_ids, 1) IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'Debes asignar exactamente % IMEI(s) a esta línea', v_expected;
  END IF;

  FOREACH v_unit_id IN ARRAY p_imei_unit_ids LOOP
    UPDATE product_imei_units u
    SET
      status = 'sold',
      sale_id = v_sale_item.sale_id,
      sale_item_id = p_sale_item_id,
      sold_at = COALESCE(sold_at, NOW())
    WHERE u.id = v_unit_id
      AND u.branch_id = v_sale_item.branch_id
      AND u.product_id = v_sale_item.product_id
      AND u.status = 'in_stock';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'IMEI no disponible o no corresponde al producto de la línea';
    END IF;

    v_assigned := v_assigned + 1;
  END LOOP;

  RETURN v_assigned;
END;
$$;

-- Al anular venta: devolver IMEIs a stock si ya estaban vendidos
CREATE OR REPLACE FUNCTION restore_inventory_when_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.status <> 'cancelled'
     OR OLD.status = 'cancelled'
     OR NEW.inventory_deducted_at IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE product_imei_units u
  SET
    status = 'in_stock',
    sale_id = NULL,
    sale_item_id = NULL,
    sold_at = NULL
  WHERE u.sale_id = NEW.id
    AND u.status = 'sold';

  FOR r IN
    SELECT si.product_id, COALESCE(si.quantity_picked, si.quantity) AS qty
    FROM sale_items si
    WHERE si.sale_id = NEW.id
      AND COALESCE(si.quantity_picked, si.quantity) > 0
  LOOP
    PERFORM increment_inventory(r.product_id, NEW.branch_id, r.qty);
  END LOOP;

  NEW.inventory_deducted_at := NULL;
  RETURN NEW;
END;
$$;

-- RLS product_imei_units
ALTER TABLE product_imei_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see imei units of their branches" ON product_imei_units;
CREATE POLICY "Users see imei units of their branches"
  ON product_imei_units FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users insert imei units in their branches" ON product_imei_units;
CREATE POLICY "Users insert imei units in their branches"
  ON product_imei_units FOR INSERT
  WITH CHECK (
    branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    AND organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users update imei units in their branches" ON product_imei_units;
CREATE POLICY "Users update imei units in their branches"
  ON product_imei_units FOR UPDATE
  USING (
    branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
  )
  WITH CHECK (
    branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
  );

GRANT EXECUTE ON FUNCTION register_product_imei_units(UUID, UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_imei_units_to_sale_item(UUID, UUID[]) TO authenticated;
