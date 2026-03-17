-- Horarios semanales recurrentes por servicio (ej. Culto dominical domingos 10:00).
-- day_of_week: 1 = Lunes … 7 = Domingo (ISO).
CREATE TABLE IF NOT EXISTS church_service_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_service_id UUID NOT NULL REFERENCES church_services(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_time TIME NOT NULL,
  end_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_church_service_schedules_service ON church_service_schedules(church_service_id);

COMMENT ON TABLE church_service_schedules IS 'Horarios recurrentes por servicio: día de la semana (1-7) y hora para el calendario.';

-- RLS: acceso vía church_services que ya tiene RLS por organización
ALTER TABLE church_service_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see schedules of their org services" ON church_service_schedules;
CREATE POLICY "Users see schedules of their org services"
  ON church_service_schedules FOR SELECT
  USING (
    church_service_id IN (
      SELECT id FROM church_services
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users manage schedules of their org services" ON church_service_schedules;
CREATE POLICY "Users manage schedules of their org services"
  ON church_service_schedules FOR ALL
  USING (
    church_service_id IN (
      SELECT id FROM church_services
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    church_service_id IN (
      SELECT id FROM church_services
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

DROP TRIGGER IF EXISTS update_church_service_schedules_updated_at ON church_service_schedules;
CREATE TRIGGER update_church_service_schedules_updated_at
  BEFORE UPDATE ON church_service_schedules FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
