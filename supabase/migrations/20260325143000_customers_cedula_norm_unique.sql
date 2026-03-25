-- Cédula única por sucursal (evita duplicados como "CC 123" vs "cc  123").

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS cedula_norm text
GENERATED ALWAYS AS (
  CASE
    WHEN cedula IS NULL OR btrim(cedula) = '' THEN NULL
    ELSE lower(btrim(regexp_replace(cedula, '\s+', ' ', 'g')))
  END
) STORED;

COMMENT ON COLUMN customers.cedula_norm IS 'Cédula normalizada para unicidad por sucursal (minúsculas, espacios colapsados).';

-- Dejar un solo registro por (branch_id, cedula_norm): el más antiguo conserva cédula; al resto se les quita.
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
