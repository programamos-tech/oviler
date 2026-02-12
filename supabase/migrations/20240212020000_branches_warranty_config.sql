-- Agregar configuración de garantías a branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS warranty_requires_approval BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS warranty_days INT;

-- Comentarios para documentación
COMMENT ON COLUMN branches.warranty_requires_approval IS 'Si true, las garantías requieren aprobación de supervisor antes de procesarse';
COMMENT ON COLUMN branches.warranty_days IS 'Días de garantía por defecto (referencia opcional, puede variar por proveedor)';
