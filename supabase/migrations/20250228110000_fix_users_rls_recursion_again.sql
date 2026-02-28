-- Eliminar recursión en RLS de users: la política que usaba
-- "SELECT organization_id FROM users WHERE id = auth.uid()" provoca recursión infinita.
-- Solución: función SECURITY DEFINER + políticas que no consulten users dentro de la política.

CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Quitar todas las políticas SELECT actuales en users (incluida la recursiva)
DROP POLICY IF EXISTS "Users see only users in their organization" ON users;
DROP POLICY IF EXISTS "Users can read own row" ON users;

-- 1) Cada usuario puede leer su propia fila (login, middleware)
CREATE POLICY "Users can read own row"
  ON users FOR SELECT
  USING (id = auth.uid());

-- 2) Cada usuario puede leer otros usuarios de su misma organización (usa función, no subquery)
CREATE POLICY "Users see only users in their organization"
  ON users FOR SELECT
  USING (organization_id = public.get_my_organization_id());
