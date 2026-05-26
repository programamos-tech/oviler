-- Evita que abonos [Hist demo] caigan en el día calendario actual (reportes en 0 al abrir “Hoy”).
-- Ejecutar en Supabase SQL Editor (proyecto nou / bernabe@tech.com).

UPDATE credit_payments cp
SET created_at = DATE_TRUNC('day', NOW()) - INTERVAL '1 day'
  + ((EXTRACT(HOUR FROM cp.created_at)::int % 12) + 8) * INTERVAL '1 hour'
  + (EXTRACT(MINUTE FROM cp.created_at)::int % 60) * INTERVAL '1 minute'
FROM customer_credits cc
JOIN users u ON u.organization_id = cc.organization_id
WHERE cp.credit_id = cc.id
  AND LOWER(TRIM(u.email)) = 'bernabe@tech.com'
  AND cp.notes LIKE '[Hist demo]%'
  AND cp.created_at >= DATE_TRUNC('day', NOW())
  AND cp.created_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day';
