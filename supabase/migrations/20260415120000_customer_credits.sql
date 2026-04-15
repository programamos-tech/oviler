-- Créditos a clientes por sucursal + abonos (efectivo, transferencia o mixto).

CREATE TABLE IF NOT EXISTS customer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  public_ref TEXT NOT NULL,
  title TEXT,
  total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
  amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'overdue', 'completed', 'cancelled')),
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_credits_paid_lte_total CHECK (amount_paid <= total_amount + 0.01)
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_credits_public_ref_key ON customer_credits (public_ref);
CREATE INDEX IF NOT EXISTS idx_customer_credits_branch_id ON customer_credits (branch_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_customer_id ON customer_credits (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_org_id ON customer_credits (organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_sale_id ON customer_credits (sale_id) WHERE sale_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS credit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID NOT NULL REFERENCES customer_credits(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'mixed')),
  amount_cash NUMERIC(14, 2),
  amount_transfer NUMERIC(14, 2),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_payments_mixed CHECK (
    (payment_method = 'cash' AND amount_cash IS NULL AND amount_transfer IS NULL)
    OR (payment_method = 'transfer' AND amount_cash IS NULL AND amount_transfer IS NULL)
    OR (
      payment_method = 'mixed'
      AND amount_cash IS NOT NULL
      AND amount_transfer IS NOT NULL
      AND amount_cash >= 0
      AND amount_transfer >= 0
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_credit_payments_credit_id ON credit_payments (credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_created_at ON credit_payments (credit_id, created_at DESC);

CREATE OR REPLACE FUNCTION generate_customer_credit_public_ref()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  tries INT := 0;
BEGIN
  LOOP
    ref := 'SC' || lower(substr(md5(random()::text || clock_timestamp()::text || tries::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM customer_credits WHERE public_ref = ref);
    tries := tries + 1;
    IF tries > 20 THEN
      ref := 'SC' || lower(replace(gen_random_uuid()::text, '-', ''));
      EXIT;
    END IF;
  END LOOP;
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION customer_credits_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_ref IS NULL OR btrim(NEW.public_ref) = '' THEN
    NEW.public_ref := generate_customer_credit_public_ref();
  END IF;
  IF NEW.amount_paid IS NULL THEN
    NEW.amount_paid := 0;
  END IF;
  IF NEW.cancelled_at IS NOT NULL THEN
    NEW.status := 'cancelled';
  ELSIF NEW.due_date < (timezone('utc', now()))::date THEN
    NEW.status := 'overdue';
  ELSE
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_credits_before_insert ON customer_credits;
CREATE TRIGGER trg_customer_credits_before_insert
  BEFORE INSERT ON customer_credits
  FOR EACH ROW EXECUTE FUNCTION customer_credits_before_insert();

CREATE OR REPLACE FUNCTION refresh_customer_credit_from_payments(p_credit_id UUID)
RETURNS VOID AS $$
DECLARE
  tot NUMERIC(14, 2);
  paid NUMERIC(14, 2);
  due DATE;
  canc TIMESTAMPTZ;
  st TEXT;
BEGIN
  SELECT total_amount, due_date, cancelled_at INTO tot, due, canc
  FROM customer_credits WHERE id = p_credit_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO paid FROM credit_payments WHERE credit_id = p_credit_id;

  IF canc IS NOT NULL THEN
    st := 'cancelled';
  ELSIF paid >= tot - 0.005 THEN
    st := 'completed';
  ELSIF due < (timezone('utc', now()))::date AND paid < tot - 0.005 THEN
    st := 'overdue';
  ELSE
    st := 'pending';
  END IF;

  UPDATE customer_credits
  SET amount_paid = paid, status = st, updated_at = now()
  WHERE id = p_credit_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION credit_payments_after_mutate()
RETURNS TRIGGER AS $$
DECLARE
  cid UUID;
BEGIN
  cid := COALESCE(NEW.credit_id, OLD.credit_id);
  PERFORM refresh_customer_credit_from_payments(cid);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_credit_payments_after_insert ON credit_payments;
CREATE TRIGGER trg_credit_payments_after_insert
  AFTER INSERT ON credit_payments
  FOR EACH ROW EXECUTE FUNCTION credit_payments_after_mutate();

DROP TRIGGER IF EXISTS trg_credit_payments_after_update ON credit_payments;
CREATE TRIGGER trg_credit_payments_after_update
  AFTER UPDATE ON credit_payments
  FOR EACH ROW EXECUTE FUNCTION credit_payments_after_mutate();

DROP TRIGGER IF EXISTS trg_credit_payments_after_delete ON credit_payments;
CREATE TRIGGER trg_credit_payments_after_delete
  AFTER DELETE ON credit_payments
  FOR EACH ROW EXECUTE FUNCTION credit_payments_after_mutate();

CREATE OR REPLACE FUNCTION customer_credits_after_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    PERFORM refresh_customer_credit_from_payments(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_credits_after_update ON customer_credits;
CREATE TRIGGER trg_customer_credits_after_update
  AFTER UPDATE ON customer_credits
  FOR EACH ROW EXECUTE FUNCTION customer_credits_after_update();

DROP TRIGGER IF EXISTS update_customer_credits_updated_at ON customer_credits;
CREATE TRIGGER update_customer_credits_updated_at
  BEFORE UPDATE ON customer_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users see credits of their branches"
    ON customer_credits FOR SELECT
    USING (
      branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert credits in their branches"
    ON customer_credits FOR INSERT
    WITH CHECK (
      branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
      AND organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users update credits of their branches"
    ON customer_credits FOR UPDATE
    USING (
      branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    )
    WITH CHECK (
      branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users see payments of credits in their branches"
    ON credit_payments FOR SELECT
    USING (
      credit_id IN (
        SELECT id FROM customer_credits
        WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert payments for credits in their branches"
    ON credit_payments FOR INSERT
    WITH CHECK (
      credit_id IN (
        SELECT id FROM customer_credits
        WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
      )
      AND created_by = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
