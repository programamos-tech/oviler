-- Permisos personalizados por usuario (override del rol base).
ALTER TABLE users
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_permissions_gin
ON users
USING GIN (permissions);
