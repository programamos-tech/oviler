-- Membresías: free (prueba 15 días), basic, pro. Límite de referencias (productos).

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS max_products INT NOT NULL DEFAULT 999999;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Migrar valores legacy antes de cambiar el CHECK
UPDATE public.organizations
SET plan_type = 'pro'
WHERE plan_type IN ('intermediate', 'advanced');

ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

ALTER TABLE public.organizations
ADD CONSTRAINT organizations_plan_type_check
CHECK (plan_type IN ('free', 'basic', 'pro'));

-- Límites por plan (referencias = productos)
UPDATE public.organizations
SET
  max_products = 500,
  max_users = 3,
  max_branches = 999999
WHERE plan_type = 'basic';

UPDATE public.organizations
SET
  max_products = 1000,
  max_users = 5,
  max_branches = 3
WHERE plan_type = 'pro';

-- free: solo si ya existiera algún registro
UPDATE public.organizations
SET
  max_products = 50,
  max_users = 1,
  max_branches = 1,
  trial_ends_at = COALESCE(trial_ends_at, created_at + interval '15 days')
WHERE plan_type = 'free';

-- Vista panel interno: incluir límites y trial
-- (CREATE OR REPLACE no puede insertar columnas nuevas en medio: 42P16; hay que recrear.)
DROP VIEW IF EXISTS public.internal_dashboard_org_stats CASCADE;

CREATE VIEW public.internal_dashboard_org_stats AS
SELECT
  o.id,
  o.name,
  o.plan_type,
  o.subscription_status,
  o.created_at,
  o.max_branches,
  o.max_users,
  o.max_products,
  o.trial_ends_at,
  (SELECT COUNT(*)::int FROM users u WHERE u.organization_id = o.id) AS user_count,
  (SELECT COUNT(*)::int FROM branches b WHERE b.organization_id = o.id) AS branch_count,
  (SELECT COUNT(*)::int FROM products p WHERE p.organization_id = o.id) AS product_count,
  (SELECT COUNT(*)::int FROM customers c WHERE c.organization_id = o.id) AS customer_count,
  (
    SELECT COUNT(*)::int
    FROM sales s
    INNER JOIN branches br ON s.branch_id = br.id
    WHERE br.organization_id = o.id
  ) AS sale_count,
  (
    SELECT COUNT(*)::int
    FROM expenses e
    INNER JOIN branches br ON e.branch_id = br.id
    WHERE br.organization_id = o.id
  ) AS expense_count
FROM organizations o;

COMMENT ON VIEW internal_dashboard_org_stats IS 'Métricas agregadas por tenant; consumir solo desde backend con SUPABASE_SERVICE_ROLE_KEY.';

REVOKE ALL ON internal_dashboard_org_stats FROM PUBLIC;
GRANT SELECT ON internal_dashboard_org_stats TO service_role;

CREATE OR REPLACE FUNCTION public.check_product_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count FROM public.products WHERE organization_id = NEW.organization_id;
  SELECT max_products INTO max_allowed FROM public.organizations WHERE id = NEW.organization_id;
  IF max_allowed IS NULL OR max_allowed >= 999999 THEN
    RETURN NEW;
  END IF;
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Límite de referencias (productos) alcanzado para este plan. Plan actual permite % referencias.', max_allowed;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_insert_product ON public.products;
CREATE TRIGGER before_insert_product
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.check_product_limit();
