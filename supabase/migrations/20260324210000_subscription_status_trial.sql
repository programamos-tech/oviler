-- Prueba gratis (trial) vs licencia activa tras clave / pago / plan de pago.
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled'));

-- Cuentas en plan free que seguían como "active" pasan a "trial" (prueba gratis).
UPDATE public.organizations
SET subscription_status = 'trial'
WHERE plan_type = 'free' AND subscription_status = 'active';

ALTER TABLE public.organizations ALTER COLUMN subscription_status SET DEFAULT 'trial';
