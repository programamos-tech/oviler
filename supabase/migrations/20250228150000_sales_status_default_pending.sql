-- Por defecto los nuevos pedidos/ventas se crean en estado "Iniciado" (pending).
-- La app envía status explícitamente; este default solo aplica si no se envía.
ALTER TABLE sales
  ALTER COLUMN status SET DEFAULT 'pending';
