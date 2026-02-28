-- Warehouse location hierarchy: warehouses (bodega/almacén) → floors → zones → aisles → locations
-- and inventory_locations for stock by location. Run this on an existing DB that already has branches, products, inventory.

-- 6b. WAREHOUSES (Bodega, Almacén: physical spaces per branch)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warehouses_branch_id ON warehouses(branch_id);

-- 6c. FLOORS
CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_floors_warehouse_id ON floors(warehouse_id);

-- 6d. ZONES (e.g. cold zone, dry zone)
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zones_floor_id ON zones(floor_id);

-- 6e. AISLES (subzones within a zone)
CREATE TABLE IF NOT EXISTS aisles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aisles_zone_id ON aisles(zone_id);

-- 6f. LOCATIONS (bin/slot where product is stored)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aisle_id UUID NOT NULL REFERENCES aisles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_locations_aisle_id ON locations(aisle_id);
CREATE INDEX IF NOT EXISTS idx_locations_branch_id ON locations(branch_id);

CREATE OR REPLACE FUNCTION set_location_branch_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT w.branch_id INTO NEW.branch_id
  FROM aisles a
  JOIN zones z ON z.id = a.zone_id
  JOIN floors f ON f.id = z.floor_id
  JOIN warehouses w ON w.id = f.warehouse_id
  WHERE a.id = NEW.aisle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_location_branch_id_trigger ON locations;
CREATE TRIGGER set_location_branch_id_trigger
  BEFORE INSERT OR UPDATE OF aisle_id ON locations
  FOR EACH ROW EXECUTE FUNCTION set_location_branch_id();

-- 6g. INVENTORY_LOCATIONS (quantity per product per location; sum = inventory.quantity)
CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, location_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_product_id ON inventory_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_location_id ON inventory_locations(location_id);

CREATE OR REPLACE FUNCTION sync_inventory_from_locations()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_branch_id UUID;
  v_total INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
    SELECT branch_id INTO v_branch_id FROM locations WHERE id = OLD.location_id;
  ELSE
    v_product_id := NEW.product_id;
    SELECT branch_id INTO v_branch_id FROM locations WHERE id = NEW.location_id;
  END IF;

  SELECT COALESCE(SUM(il.quantity), 0)::INT INTO v_total
  FROM inventory_locations il
  JOIN locations l ON l.id = il.location_id
  WHERE il.product_id = v_product_id AND l.branch_id = v_branch_id;

  INSERT INTO inventory (product_id, branch_id, location, quantity)
  VALUES (v_product_id, v_branch_id, 'bodega', v_total)
  ON CONFLICT (product_id, branch_id, location) DO UPDATE SET quantity = v_total, updated_at = NOW();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS sync_inventory_after_inventory_location_change ON inventory_locations;
CREATE TRIGGER sync_inventory_after_inventory_location_change
  AFTER INSERT OR UPDATE OR DELETE ON inventory_locations
  FOR EACH ROW EXECUTE FUNCTION sync_inventory_from_locations();

-- RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE aisles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see warehouses of their branches" ON warehouses;
CREATE POLICY "Users see warehouses of their branches"
  ON warehouses FOR SELECT
  USING (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users manage warehouses in their branches" ON warehouses;
CREATE POLICY "Users manage warehouses in their branches"
  ON warehouses FOR ALL
  USING (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))
  WITH CHECK (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users see floors of their branches" ON floors;
CREATE POLICY "Users see floors of their branches"
  ON floors FOR SELECT
  USING (warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS "Users manage floors in their branches" ON floors;
CREATE POLICY "Users manage floors in their branches"
  ON floors FOR ALL
  USING (warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())))
  WITH CHECK (warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Users see zones of their branches" ON zones;
CREATE POLICY "Users see zones of their branches"
  ON zones FOR SELECT
  USING (floor_id IN (SELECT id FROM floors WHERE warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))));
DROP POLICY IF EXISTS "Users manage zones in their branches" ON zones;
CREATE POLICY "Users manage zones in their branches"
  ON zones FOR ALL
  USING (floor_id IN (SELECT id FROM floors WHERE warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))))
  WITH CHECK (floor_id IN (SELECT id FROM floors WHERE warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))));

DROP POLICY IF EXISTS "Users see aisles of their branches" ON aisles;
CREATE POLICY "Users see aisles of their branches"
  ON aisles FOR SELECT
  USING (zone_id IN (SELECT id FROM zones WHERE floor_id IN (SELECT id FROM floors WHERE warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())))));
DROP POLICY IF EXISTS "Users manage aisles in their branches" ON aisles;
CREATE POLICY "Users manage aisles in their branches"
  ON aisles FOR ALL
  USING (zone_id IN (SELECT id FROM zones WHERE floor_id IN (SELECT id FROM floors WHERE warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())))))
  WITH CHECK (zone_id IN (SELECT id FROM zones WHERE floor_id IN (SELECT id FROM floors WHERE warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())))));

DROP POLICY IF EXISTS "Users see locations of their branches" ON locations;
CREATE POLICY "Users see locations of their branches"
  ON locations FOR SELECT
  USING (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users manage locations in their branches" ON locations;
CREATE POLICY "Users manage locations in their branches"
  ON locations FOR ALL
  USING (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))
  WITH CHECK (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users see inventory_locations of their branches" ON inventory_locations;
CREATE POLICY "Users see inventory_locations of their branches"
  ON inventory_locations FOR SELECT
  USING (location_id IN (SELECT id FROM locations WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS "Users manage inventory_locations in their branches" ON inventory_locations;
CREATE POLICY "Users manage inventory_locations in their branches"
  ON inventory_locations FOR ALL
  USING (location_id IN (SELECT id FROM locations WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())))
  WITH CHECK (location_id IN (SELECT id FROM locations WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));

-- updated_at triggers (assumes update_updated_at_column exists)
DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
DROP TRIGGER IF EXISTS update_floors_updated_at ON floors;
DROP TRIGGER IF EXISTS update_zones_updated_at ON zones;
DROP TRIGGER IF EXISTS update_aisles_updated_at ON aisles;
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
DROP TRIGGER IF EXISTS update_inventory_locations_updated_at ON inventory_locations;
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON floors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aisles_updated_at BEFORE UPDATE ON aisles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_locations_updated_at BEFORE UPDATE ON inventory_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
