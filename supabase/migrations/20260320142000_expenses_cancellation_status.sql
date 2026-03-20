-- Permite anular egresos sin borrarlos (auditoría + reportes consistentes)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE expenses
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE expenses
ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE expenses
ALTER COLUMN status SET NOT NULL;

ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_status_check;

ALTER TABLE expenses
ADD CONSTRAINT expenses_status_check
CHECK (status IN ('active', 'cancelled'));

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_expenses_branch_status_created_at
ON expenses(branch_id, status, created_at DESC);
