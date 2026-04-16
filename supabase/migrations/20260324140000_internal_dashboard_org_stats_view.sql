-- Vista solo para uso con service_role (panel interno NOU). Agrega conteos por organización.
-- DROP evita error 42P16 si la vista remota ya existía con otras columnas (CREATE OR REPLACE no puede quitar columnas).
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
