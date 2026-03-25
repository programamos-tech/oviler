-- Unificar búsqueda: "1102867002" debe coincidir con "CC 1102867002" (misma lógica que en app).
-- Si hay al menos 5 dígitos, cedula_norm = solo dígitos; si no, minúsculas + espacios colapsados.

DROP INDEX IF EXISTS customers_branch_cedula_norm_unique;

ALTER TABLE customers DROP COLUMN IF EXISTS cedula_norm;

ALTER TABLE customers
ADD COLUMN cedula_norm text
GENERATED ALWAYS AS (
  CASE
    WHEN cedula IS NULL OR btrim(cedula) = '' THEN NULL
    WHEN length(regexp_replace(cedula, '\D', '', 'g')) >= 5 THEN
      NULLIF(regexp_replace(cedula, '\D', '', 'g'), '')
    ELSE lower(btrim(regexp_replace(cedula, '\s+', ' ', 'g')))
  END
) STORED;

COMMENT ON COLUMN customers.cedula_norm IS 'Unicidad por sucursal: si ≥5 dígitos en el documento, solo dígitos; si no, minúsculas y espacios colapsados.';

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY branch_id, cedula_norm
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM customers
  WHERE cedula_norm IS NOT NULL
    AND branch_id IS NOT NULL
)
UPDATE customers c
SET cedula = NULL
FROM ranked r
WHERE c.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS customers_branch_cedula_norm_unique
ON customers (branch_id, cedula_norm)
WHERE cedula_norm IS NOT NULL AND branch_id IS NOT NULL;
