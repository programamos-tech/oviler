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
  max_users INT NOT NULL DEFAULT 999999, -- Ilimitado para basic
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
  brand TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
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
  cedula TEXT,
  email TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7b. CUSTOMER_ADDRESSES (Varias direcciones por cliente: casa, oficina, etc.)
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  reference_point TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);

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

-- 8b. SALE_ITEMS (Ítems por venta: producto, cantidad, precio unitario, descuento opcional)
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- 9. CATEGORIES (Categorías de productos por organización)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- 10. ACTIVITIES (Muro por organización y sucursal, retención 90 días)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  summary TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_likes (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (activity_id, user_id)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_organization_id ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_branch_id ON activities(branch_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_org_branch_created ON activities(organization_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_user_id ON user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch_id ON user_branches(branch_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios solo ven su organización
CREATE POLICY "Users see only their organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Usuarios solo ven usuarios de su organización
CREATE POLICY "Users see only users in their organization"
  ON users FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Usuarios solo ven sucursales de su organización
CREATE POLICY "Users see only branches in their organization"
  ON branches FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Usuarios pueden crear sucursales en su organización
CREATE POLICY "Users create branches in their organization"
  ON branches FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Usuarios solo ven productos de su organización
CREATE POLICY "Users see only products in their organization"
  ON products FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Usuarios pueden crear productos en su organización
CREATE POLICY "Users create products in their organization"
  ON products FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Usuarios solo ven inventario de sucursales donde trabajan
CREATE POLICY "Users see inventory of their branches"
  ON inventory FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );

-- Policy: Usuarios solo ven ventas de sucursales donde trabajan
CREATE POLICY "Users see sales of their branches"
  ON sales FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );

-- Policy: Usuarios pueden crear ventas en sucursales donde trabajan
CREATE POLICY "Users create sales in their branches"
  ON sales FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );

-- Policy: sale_items (ver/crear/eliminar solo de ventas de sus sucursales)
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see sale_items of their branches"
  ON sale_items FOR SELECT
  USING (sale_id IN (SELECT id FROM sales WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));
CREATE POLICY "Users insert sale_items for sales in their branches"
  ON sale_items FOR INSERT
  WITH CHECK (sale_id IN (SELECT id FROM sales WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));
CREATE POLICY "Users delete sale_items of their branches"
  ON sale_items FOR DELETE
  USING (sale_id IN (SELECT id FROM sales WHERE branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));

-- Policy: Usuarios solo ven clientes de su organización
CREATE POLICY "Users see only customers in their organization"
  ON customers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Usuarios pueden crear clientes en su organización
CREATE POLICY "Users create customers in their organization"
  ON customers FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users update customers in their organization"
  ON customers FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users delete customers in their organization"
  ON customers FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Policy: Direcciones de clientes (ver/crear/actualizar/eliminar solo las de clientes de su org)
CREATE POLICY "Users see addresses of customers in their organization"
  ON customer_addresses FOR SELECT
  USING (
    customer_id IN (SELECT id FROM customers WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  );
CREATE POLICY "Users insert addresses for customers in their organization"
  ON customer_addresses FOR INSERT
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  );
CREATE POLICY "Users update addresses of customers in their organization"
  ON customer_addresses FOR UPDATE
  USING (
    customer_id IN (SELECT id FROM customers WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  );
CREATE POLICY "Users delete addresses of customers in their organization"
  ON customer_addresses FOR DELETE
  USING (
    customer_id IN (SELECT id FROM customers WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  );

-- Policy: Categorías (solo ver/crear/actualizar/eliminar las de su organización)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see categories of their organization"
  ON categories FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users create categories in their organization"
  ON categories FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users update categories in their organization"
  ON categories FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users delete categories in their organization"
  ON categories FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Policy: Actividades (muro, retención 90 días)
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see activities of their organization and branches" ON activities FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()) AND (branch_id IS NULL OR branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));
CREATE POLICY "Users insert activities in their organization and branches" ON activities FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()) AND (branch_id IS NULL OR branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())));
CREATE POLICY "Users see comments of their org activities" ON activity_comments FOR SELECT USING (activity_id IN (SELECT id FROM activities WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));
CREATE POLICY "Users insert comments on their org activities" ON activity_comments FOR INSERT WITH CHECK (activity_id IN (SELECT id FROM activities WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())) AND user_id = auth.uid());
CREATE POLICY "Users delete own comments" ON activity_comments FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Users see likes of their org activities" ON activity_likes FOR SELECT USING (activity_id IN (SELECT id FROM activities WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));
CREATE POLICY "Users insert likes on their org activities" ON activity_likes FOR INSERT WITH CHECK (activity_id IN (SELECT id FROM activities WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())) AND user_id = auth.uid());
CREATE POLICY "Users delete own likes" ON activity_likes FOR DELETE USING (user_id = auth.uid());

-- Policy: Usuarios pueden ver sus relaciones con sucursales
CREATE POLICY "Users see their branch assignments"
  ON user_branches FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- FUNCIONES Y TRIGGERS PARA VALIDACIÓN DE LÍMITES
-- ============================================

-- Función para validar límite de sucursales
CREATE OR REPLACE FUNCTION check_branch_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM branches
  WHERE organization_id = NEW.organization_id;
  
  SELECT max_branches INTO max_allowed
  FROM organizations
  WHERE id = NEW.organization_id;
  
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Límite de sucursales alcanzado para este plan. Plan actual permite % sucursales.', max_allowed;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_branch
BEFORE INSERT ON branches
FOR EACH ROW
EXECUTE FUNCTION check_branch_limit();

-- Función para validar límite de usuarios
CREATE OR REPLACE FUNCTION check_user_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM users
  WHERE organization_id = NEW.organization_id;
  
  SELECT max_users INTO max_allowed
  FROM organizations
  WHERE id = NEW.organization_id;
  
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Límite de usuarios alcanzado para este plan. Plan actual permite % usuarios.', max_allowed;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_user
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION check_user_limit();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
