-- Contexto del ingreso cuando no es por miembro: reunión, evento, culto, etc. (ej. ofrendas de culto dominical)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS income_context TEXT;
COMMENT ON COLUMN sales.income_context IS 'Reunión, evento o contexto del ingreso cuando no está asociado a un miembro (ej. Ofrenda de culto dominical, Reunión de jóvenes).';
