-- Permitir actualizar usuarios de la misma organización (editar colaborador: nombre, email, rol, estado, avatar_url)
-- Sin esta política, el UPDATE en users no aplicaba y los cambios no se guardaban.
DO $$ BEGIN
  CREATE POLICY "Users can update users in their organization"
  ON public.users FOR UPDATE
  USING (organization_id = public.get_my_organization_id())
  WITH CHECK (organization_id = public.get_my_organization_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
