-- Servicios/reuniones de la iglesia (Culto dominical, Reunión de jóvenes, etc.) para asociar ofrendas e ingresos.
CREATE TABLE IF NOT EXISTS church_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_church_services_organization_id ON church_services(organization_id);

COMMENT ON TABLE church_services IS 'Servicios o reuniones de la iglesia: culto dominical, reunión de jóvenes, escuela dominical, etc. Se usan al registrar ofrendas.';

ALTER TABLE sales ADD COLUMN IF NOT EXISTS church_service_id UUID REFERENCES church_services(id) ON DELETE SET NULL;
COMMENT ON COLUMN sales.church_service_id IS 'Servicio/reunión asociado al ingreso (ej. ofrenda de culto dominical).';

-- RLS
ALTER TABLE church_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see church_services of their organization" ON church_services;
CREATE POLICY "Users see church_services of their organization"
  ON church_services FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users manage church_services of their organization" ON church_services;
CREATE POLICY "Users manage church_services of their organization"
  ON church_services FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS update_church_services_updated_at ON church_services;
CREATE TRIGGER update_church_services_updated_at
  BEFORE UPDATE ON church_services FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
