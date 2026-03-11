-- Bucket solo para fotos de colaboradores (avatares). Separa de "logos" (sucursales).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Quitar políticas de avatares del bucket logos (ya no usamos logos para avatares)
DROP POLICY IF EXISTS "Users can upload avatars in their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read avatars in same org" ON storage.objects;

-- Políticas en bucket avatars. Ruta: {auth.uid()}/{collaborator_id}_{timestamp}.ext
-- INSERT: solo en tu carpeta (tu user_id)
DO $$ BEGIN
  CREATE POLICY "Users can upload avatars in their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SELECT: leer avatares propios o de usuarios de la misma organización
DO $$ BEGIN
  CREATE POLICY "Users can read avatars in same org"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_organization_id_for_user(((storage.foldername(name))[1])::uuid) = public.get_my_organization_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
