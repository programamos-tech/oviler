-- Datos de cobro / período de licencia (solo uso interno NOU; no exponer a clientes).
-- No hay políticas RLS para anon/authenticated: solo service_role en API.

CREATE TABLE IF NOT EXISTS public.internal_org_billing (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Inicio del período de licencia (anual u otro plazo según license_period_months).
  license_period_start TIMESTAMPTZ,
  license_period_months INT NOT NULL DEFAULT 12 CHECK (license_period_months >= 1 AND license_period_months <= 120),
  -- Estado de cobro manual (equipo interno).
  billing_status TEXT NOT NULL DEFAULT 'pending' CHECK (billing_status IN ('paid', 'pending', 'overdue')),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_internal_org_billing_status
ON public.internal_org_billing (billing_status);

CREATE OR REPLACE FUNCTION public.internal_org_billing_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_internal_org_billing_updated_at ON public.internal_org_billing;
CREATE TRIGGER trg_internal_org_billing_updated_at
BEFORE UPDATE ON public.internal_org_billing
FOR EACH ROW
EXECUTE FUNCTION public.internal_org_billing_set_updated_at();

REVOKE ALL ON public.internal_org_billing FROM PUBLIC;
REVOKE ALL ON public.internal_org_billing FROM anon;
REVOKE ALL ON public.internal_org_billing FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_org_billing TO service_role;
