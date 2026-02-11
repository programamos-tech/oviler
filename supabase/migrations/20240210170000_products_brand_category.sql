-- Marca y categoría opcionales para productos (ej. filtros y reportes).
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
