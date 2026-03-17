-- Perfil de miembro (iglesia): edad, estado personal, notas
-- birth_date permite calcular edad y promedio de edad en la organización

ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;
COMMENT ON COLUMN customers.birth_date IS 'Fecha de nacimiento para calcular edad y promedios.';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_baptized BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN customers.is_baptized IS 'Miembro bautizado.';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_married BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN customers.is_married IS 'Estado civil: casado/a.';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_working BOOLEAN;
COMMENT ON COLUMN customers.is_working IS 'Trabaja actualmente (null = no indicado).';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_university_student BOOLEAN;
COMMENT ON COLUMN customers.is_university_student IS 'Es estudiante universitario (null = no indicado).';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
COMMENT ON COLUMN customers.notes IS 'Notas libres sobre el miembro.';
