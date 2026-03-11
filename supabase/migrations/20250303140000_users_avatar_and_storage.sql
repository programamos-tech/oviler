-- Columna avatar_url en users para foto de colaborador
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Función para obtener organization_id de un user (para políticas de storage)
CREATE OR REPLACE FUNCTION public.get_organization_id_for_user(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = user_uuid LIMIT 1;
$$;

-- Políticas en bucket logos para avatares: path avatars/{auth.uid()}/{filename}
-- INSERT: solo en tu carpeta avatars/{tu_id}/...
DO $$ BEGIN
  CREATE POLICY "Users can upload avatars in their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SELECT: leer avatares propios o de usuarios de la misma organización
DO $$ BEGIN
  CREATE POLICY "Users can read avatars in same org"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.get_organization_id_for_user(((storage.foldername(name))[2])::uuid) = public.get_my_organization_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
