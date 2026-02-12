-- Clientes: columna active para desactivar en lugar de eliminar cuando tienen ventas.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN customers.active IS 'Si false, el cliente está desactivado (no se muestra en lista); se usa cuando tiene ventas y no se puede borrar.';
