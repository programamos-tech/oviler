-- Bucket para logos de sucursales. Ruta: logos/branches/{user_id}/{filename}
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas: solo el usuario autenticado puede subir/leer en su carpeta (branches/{user_id}/...)
DO $$ BEGIN
  CREATE POLICY "Users can upload logos in their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can read logos in their folder"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
