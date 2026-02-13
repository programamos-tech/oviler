-- ============================================
-- MIGRACIONES NUEVAS PARA APLICAR MANUALMENTE
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================

-- 1. Tabla de egresos
-- Egresos y gastos por sucursal (salida de dinero: efectivo o transferencia)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
  concept TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see expenses of their branches"
  ON expenses FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users create expenses for their branches"
  ON expenses FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users update expenses of their branches"
  ON expenses FOR UPDATE
  USING (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete expenses of their branches"
  ON expenses FOR DELETE
  USING (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );

-- 2. Conceptos de egresos
-- Conceptos de egresos por organización (lista configurable; por defecto se usan unos predefinidos en la app).
CREATE TABLE IF NOT EXISTS expense_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_concepts_organization_id ON expense_concepts(organization_id);

ALTER TABLE expense_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see expense concepts of their organization"
  ON expense_concepts FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users create expense concepts in their organization"
  ON expense_concepts FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users update expense concepts in their organization"
  ON expense_concepts FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users delete expense concepts in their organization"
  ON expense_concepts FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- 3. Política UPDATE para branches
-- Permitir actualizar sucursales de la organización (nombre, NIT, dirección, teléfono, logo, etc.)
CREATE POLICY "Users update branches in their organization"
  ON branches FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- 4. Columna show_expenses en branches
-- Mostrar u ocultar el módulo de egresos en menú, dashboard y cierre de caja
ALTER TABLE branches ADD COLUMN IF NOT EXISTS show_expenses BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN branches.show_expenses IS 'Si true, se muestra el menú Egresos y las secciones de egresos registrados en dashboard y cierre de caja';
