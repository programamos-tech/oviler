-- Permitir que cada usuario pueda leer su propia fila en users (para login y middleware).
-- Así el chequeo de organization_id en login no depende de políticas circulares.

DROP POLICY IF EXISTS "Users can read own row" ON users;
CREATE POLICY "Users can read own row"
  ON users FOR SELECT
  USING (id = auth.uid());
