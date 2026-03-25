-- Catálogo web público: sucursal, productos, ventas (canal + seguimiento + comprobante)

-- 1) Sucursal: slug único, activación y cuentas para mostrar al comprador
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS catalog_slug TEXT,
  ADD COLUMN IF NOT EXISTS catalog_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_nequi TEXT,
  ADD COLUMN IF NOT EXISTS payment_bancolombia TEXT,
  ADD COLUMN IF NOT EXISTS payment_llave TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_catalog_slug_lower
  ON branches (lower(trim(catalog_slug)))
  WHERE catalog_slug IS NOT NULL AND trim(catalog_slug) <> '';

COMMENT ON COLUMN branches.catalog_slug IS 'Segmento URL pública /t/{slug}; único (case-insensitive).';
COMMENT ON COLUMN branches.catalog_enabled IS 'Si true y slug definido, el catálogo público responde.';
COMMENT ON COLUMN branches.payment_nequi IS 'Número o alias Nequi para mostrar en checkout web.';
COMMENT ON COLUMN branches.payment_bancolombia IS 'Cuenta o datos Bancolombia para transferencia.';
COMMENT ON COLUMN branches.payment_llave IS 'Llave o datos adicionales para pago.';

-- 2) Producto: imagen opcional (URL pública en bucket product-images)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN products.image_url IS 'URL pública de imagen del producto (catálogo web).';

-- 3) Venta: seguimiento público, canal, comprobante de pago
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS public_tracking_token UUID,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'pos',
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Valores de canal
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_channel_check;
ALTER TABLE sales ADD CONSTRAINT sales_channel_check
  CHECK (channel IN ('pos', 'web_catalog'));

-- Rellenar token para filas existentes
UPDATE sales SET public_tracking_token = gen_random_uuid() WHERE public_tracking_token IS NULL;

ALTER TABLE sales ALTER COLUMN public_tracking_token SET DEFAULT gen_random_uuid();
ALTER TABLE sales ALTER COLUMN public_tracking_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_public_tracking_token ON sales(public_tracking_token);

COMMENT ON COLUMN sales.public_tracking_token IS 'Token opaco para /t/pedido/{token} sin exponer id interno.';
COMMENT ON COLUMN sales.channel IS 'pos = caja/app; web_catalog = pedido desde catálogo público.';
COMMENT ON COLUMN sales.payment_proof_url IS 'URL pública del comprobante subido por el comprador (Storage).';

-- Buckets Storage (públicos lectura; escritura controlada por políticas o service role)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- product-images: {organization_id}/{filename} — solo usuarios de la org
DO $$ BEGIN
  CREATE POLICY "Org members upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM users WHERE id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Org members update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM users WHERE id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Org members delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM users WHERE id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- payment-proofs: subida solo por service role (sin política INSERT para auth) — el API usa admin client
-- Lectura: miembros de la org del primer segmento de ruta = organization_id
DO $$ BEGIN
  CREATE POLICY "Org members read payment proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM users WHERE id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
