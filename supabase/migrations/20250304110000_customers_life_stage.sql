-- Etapa de vida del miembro para organizar por ministerios (niños, jóvenes, etc.)

ALTER TABLE customers ADD COLUMN IF NOT EXISTS life_stage TEXT;
COMMENT ON COLUMN customers.life_stage IS 'Etapa de vida: niño, adolescente, joven, joven_adulto, adulto, adulto_mayor. Para organizar ministerios y grupos.';
