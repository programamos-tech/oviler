-- Stands (estantes físicos) con niveles en altura.
-- Jerarquía: aisle → stand → location (cada location = un nivel del stand).
-- inventory_locations sigue siendo por location_id (un nivel concreto).

-- 1. Tabla stands (estante físico: un stand con N niveles)
CREATE TABLE IF NOT EXISTS stands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aisle_id UUID NOT NULL REFERENCES aisles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  level_count INT NOT NULL DEFAULT 1 CHECK (level_count >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stands_aisle_id ON stands(aisle_id);

-- 2. Añadir stand_id y level a locations (nullable para migración)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS stand_id UUID REFERENCES stands(id) ON DELETE CASCADE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS level INT CHECK (level >= 1);

-- 3. Migrar datos: cada location actual → 1 stand con 1 nivel
DO $$
DECLARE
  r RECORD;
  new_stand_id UUID;
BEGIN
  FOR r IN SELECT id, aisle_id, name, code FROM locations WHERE stand_id IS NULL
  LOOP
    INSERT INTO stands (aisle_id, name, code, level_count)
    VALUES (r.aisle_id, r.name, r.code, 1)
    RETURNING id INTO new_stand_id;
    UPDATE locations SET stand_id = new_stand_id, level = 1 WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Quitar aisle_id de locations y fijar stand_id + level (el trigger depende de aisle_id, hay que quitarlo antes)
DROP TRIGGER IF EXISTS set_location_branch_id_trigger ON locations;
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_aisle_id_fkey;
ALTER TABLE locations DROP COLUMN IF EXISTS aisle_id;
ALTER TABLE locations ALTER COLUMN stand_id SET NOT NULL;
ALTER TABLE locations ALTER COLUMN level SET NOT NULL;
DROP INDEX IF EXISTS idx_locations_aisle_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_stand_level ON locations(stand_id, level);
CREATE INDEX IF NOT EXISTS idx_locations_stand_id ON locations(stand_id);

-- 5. Trigger branch_id: location → stand → aisle → zone → floor → warehouse
CREATE OR REPLACE FUNCTION set_location_branch_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT w.branch_id INTO NEW.branch_id
  FROM stands s
  JOIN aisles a ON a.id = s.aisle_id
  JOIN zones z ON z.id = a.zone_id
  JOIN floors f ON f.id = z.floor_id
  JOIN warehouses w ON w.id = f.warehouse_id
  WHERE s.id = NEW.stand_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_location_branch_id_trigger ON locations;
CREATE TRIGGER set_location_branch_id_trigger
  BEFORE INSERT OR UPDATE OF stand_id ON locations
  FOR EACH ROW EXECUTE FUNCTION set_location_branch_id();

-- Recalcular branch_id por si acaso
UPDATE locations SET updated_at = NOW() WHERE stand_id IS NOT NULL;

-- 6. RLS stands
ALTER TABLE stands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see stands of their branches" ON stands;
CREATE POLICY "Users see stands of their branches"
  ON stands FOR SELECT
  USING (aisle_id IN (SELECT id FROM aisles WHERE zone_id IN (SELECT id FROM zones WHERE floor_id IN (SELECT id FROM floors WHERE warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))))));
DROP POLICY IF EXISTS "Users manage stands in their branches" ON stands;
CREATE POLICY "Users manage stands in their branches"
  ON stands FOR ALL
  USING (aisle_id IN (SELECT id FROM aisles WHERE zone_id IN (SELECT id FROM zones WHERE floor_id IN (SELECT id FROM floors WHERE warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))))))
  WITH CHECK (aisle_id IN (SELECT id FROM aisles WHERE zone_id IN (SELECT id FROM zones WHERE floor_id IN (SELECT id FROM floors WHERE warehouse_id IN (SELECT id FROM warehouses WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()))))));

-- 7. updated_at para stands
CREATE TRIGGER update_stands_updated_at BEFORE UPDATE ON stands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
