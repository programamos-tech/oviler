-- Situación laboral y estado civil (áreas de vida del miembro)

ALTER TABLE customers ADD COLUMN IF NOT EXISTS occupation_status TEXT;
COMMENT ON COLUMN customers.occupation_status IS 'Situación laboral: empleado, emprendedor, estudiante, sin_trabajo, jubilado, otro.';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS marital_status TEXT;
COMMENT ON COLUMN customers.marital_status IS 'Estado civil: soltero, casado, divorciado, viudo, union_libre, otro.';
