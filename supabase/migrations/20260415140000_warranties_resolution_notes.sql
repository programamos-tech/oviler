-- Texto obligatorio al marcar garantía como procesada: qué se hizo al producto/equipo y por qué.
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN warranties.resolution_notes IS 'Resolución al cerrar: trabajo realizado, criterio aplicado, etc.';
COMMENT ON COLUMN warranties.processed_at IS 'Momento en que pasó a estado procesada.';
COMMENT ON COLUMN warranties.processed_by IS 'Usuario que procesó la garantía.';
