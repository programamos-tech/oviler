-- ============================================
-- SCHEMA PARA NOU - SOFTWARE PARA INVENTARIOS
-- Multi-tenant SaaS con Supabase
-- ============================================

-- 1. ORGANIZATIONS (Tenant Principal)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'basic' CHECK (plan_type IN ('basic', 'intermediate', 'advanced')),
  max_branches INT NOT NULL DEFAULT 1,
  max_users INT NOT NULL DEFAULT 999999,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS (Vinculados a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'admin', 'cashier', 'delivery')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BRANCHES (Sucursales)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nit TEXT,
  address TEXT,
  phone TEXT,
  responsable_iva BOOLEAN DEFAULT false,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USER_BRANCHES (Relación muchos a muchos)
CREATE TABLE IF NOT EXISTS user_branches (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, branch_id)
);

-- 5. PRODUCTS (Pertenecen a una organización)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  base_cost DECIMAL(10,2),
  base_price DECIMAL(10,2),
  apply_iva BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVENTORY (Stock por sucursal)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0,
  min_stock INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, branch_id)
);

-- 7. CUSTOMERS (Compartidos por toda la organización)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SALES (Pertenecen a una sucursal específica)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_organization_id ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_user_id ON user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch_id ON user_branches(branch_id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users see only their organization"
    ON organizations FOR SELECT
    USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users see only users in their organization"
    ON users FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users see only branches in their organization"
    ON branches FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users create branches in their organization"
    ON branches FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users see only products in their organization"
    ON products FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users create products in their organization"
    ON products FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users see inventory of their branches"
    ON inventory FOR SELECT
    USING (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users see sales of their branches"
    ON sales FOR SELECT
    USING (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users create sales in their branches"
    ON sales FOR INSERT
    WITH CHECK (branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users see only customers in their organization"
    ON customers FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users create customers in their organization"
    ON customers FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users see their branch assignments"
    ON user_branches FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can add themselves to branches"
    ON user_branches FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION check_branch_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count FROM branches WHERE organization_id = NEW.organization_id;
  SELECT max_branches INTO max_allowed FROM organizations WHERE id = NEW.organization_id;
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Límite de sucursales alcanzado para este plan. Plan actual permite % sucursales.', max_allowed;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_insert_branch ON branches;
CREATE TRIGGER before_insert_branch
BEFORE INSERT ON branches FOR EACH ROW
EXECUTE FUNCTION check_branch_limit();

CREATE OR REPLACE FUNCTION check_user_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count FROM users WHERE organization_id = NEW.organization_id;
  SELECT max_users INTO max_allowed FROM organizations WHERE id = NEW.organization_id;
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Límite de usuarios alcanzado para este plan. Plan actual permite % usuarios.', max_allowed;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_insert_user ON users;
CREATE TRIGGER before_insert_user
BEFORE INSERT ON users FOR EACH ROW
EXECUTE FUNCTION check_user_limit();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
