-- Color por reunión/servicio para el calendario (hex, ej. #EC4899).
ALTER TABLE church_services ADD COLUMN IF NOT EXISTS color TEXT;
COMMENT ON COLUMN church_services.color IS 'Color de la reunión en el calendario (hex, ej. #EC4899).';
