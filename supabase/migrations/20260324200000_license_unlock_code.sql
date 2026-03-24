-- Clave de acceso temporal (hash + salt); el texto plano solo se devuelve al guardar cobro (API interna).
ALTER TABLE public.internal_org_billing
  ADD COLUMN IF NOT EXISTS license_unlock_salt TEXT,
  ADD COLUMN IF NOT EXISTS license_unlock_code_hash TEXT;
