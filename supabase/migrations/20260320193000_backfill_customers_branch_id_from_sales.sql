-- Backfill branch_id for legacy customers created before branch scoping.
-- Rule: assign the branch of the customer's most recent sale.
WITH latest_sale_branch AS (
  SELECT DISTINCT ON (s.customer_id)
    s.customer_id,
    s.branch_id
  FROM sales s
  WHERE s.customer_id IS NOT NULL
  ORDER BY s.customer_id, s.created_at DESC
)
UPDATE customers c
SET branch_id = lsb.branch_id
FROM latest_sale_branch lsb
WHERE c.id = lsb.customer_id
  AND c.branch_id IS NULL;
