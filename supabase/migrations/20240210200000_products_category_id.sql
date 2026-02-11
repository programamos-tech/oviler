-- Reemplazar columna category (texto) por category_id (FK a categories). Una sola fuente: tabla categories.
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Migrar datos existentes: asignar category_id según el nombre guardado en category
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE c.organization_id = p.organization_id AND c.name = p.category AND p.category_id IS NULL;

ALTER TABLE products DROP COLUMN IF EXISTS category;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
