-- Mostrar u ocultar el módulo de egresos en menú, dashboard y cierre de caja
ALTER TABLE branches ADD COLUMN IF NOT EXISTS show_expenses BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN branches.show_expenses IS 'Si true, se muestra el menú Egresos y las secciones de egresos registrados en dashboard y cierre de caja';