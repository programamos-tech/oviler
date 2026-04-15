-- Seed: categorías, productos (artesanías) y clientes de prueba para la cuenta activa.
-- La organización se toma del usuario más reciente en public.users (p. ej. recién registrado).
-- Requisitos: al menos un usuario y, para stock e inventario, al menos una sucursal.
--
-- Cómo ejecutar:
-- 1. Con Supabase local: supabase db reset  (migraciones + este seed; borra la DB).
-- 2. Solo este seed (conserva datos): psql $DB_URL -v ON_ERROR_STOP=1 -f supabase/seed.sql
--    o pégalo en el SQL Editor del dashboard.

DO $$
DECLARE
  v_org_id UUID;
  v_branch_id UUID;
  v_prod_id UUID;
  v_cat_id UUID;
  v_cust_id UUID;
  i INT;
  prod_name TEXT;
  prod_sku TEXT;
  prod_cat TEXT;
  prod_brand TEXT;
  prod_desc TEXT;
  prod_price DECIMAL;
  prod_cost DECIMAL;
  prod_iva BOOLEAN;
  stock_qty INT;
  names TEXT[] := ARRAY[
    'Mochila wayuu tejida a mano', 'Hamaca doble en algodón crudo', 'Ruana en lana de oveja',
    'Tapete tejido en telar vertical', 'Cojín bordado con motivos andinos', 'Sombrero vueltiao tradicional',
    'Jarra de cerámica gres esmaltada', 'Set tazones artesanales (x4)', 'Plato hondo decorado con flores',
    'Figura de barro policromada', 'Incensario de arcilla', 'Maceta rústica con drenaje',
    'Caja musical en madera de cedro', 'Tabla para quesos en nogal', 'Perchero de ramas tratadas',
    'Canasto en bejuco teñido', 'Atril de madera tallada', 'Marco para foto 20x25 artesanal',
    'Morral en cuero curtido vegetal', 'Cinturón tejido a mano', 'Billetera bifold cuero',
    'Pulsera en semillas y chaquiras', 'Collar largo en tagua', 'Aretes en filigrana',
    'Anillo ajustable en alpaca', 'Tobillera macramé con turquesa', 'Lamparita en papel maché',
    'Guirnalda fieltro motivos navideños', 'Velón de soya aroma vainilla', 'Difusor rattan lavanda',
    'Agenda encuadernación japonesa', 'Set postales ilustración local', 'Máscara decorativa pared',
    'Ocarina cerámica 8 agujeros', 'Maracas en calabazo', 'Flauta dulce madera',
    'Kit bordado inicio punto cruz', 'Hilos de algodón orgánico (madeja)', 'Agujas tapicería',
    'Delantal lino bordado', 'Bolsa reutilizable yute', 'Individual tejido (par)',
    'Escultura miniatura resina', 'Reloj de pared mimbre', 'Espejo marco en pasto'
  ];
  categories TEXT[] := ARRAY[
    'Textiles y tejidos', 'Cerámica y barro', 'Madera y cestería', 'Cuero y marroquinería',
    'Joyería y bisutería', 'Decoración y hogar', 'Papel y fibras', 'Instrumentos y sonido',
    'Costura y manualidades', 'Hogar y cocina', 'Regalos y detalles'
  ];
  brands TEXT[] := ARRAY[
    'Taller El Telar', 'Barro Vivo', 'Cedro & Cestería', 'Curtidos del Valle', 'Semillas del Cauca',
    'Luz de Vela', 'Papel al Viento', 'Sonidos Ancestrales', 'Manos del Sur', NULL
  ];
BEGIN
  SELECT u.organization_id INTO v_org_id
  FROM public.users u
  ORDER BY u.created_at DESC NULLS LAST, u.id DESC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No hay usuarios en public.users; no se puede inferir la organización.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
    RAISE NOTICE 'La organización del usuario más reciente no existe.';
    RETURN;
  END IF;

  SELECT b.id INTO v_branch_id
  FROM branches b
  WHERE b.organization_id = v_org_id
  ORDER BY b.created_at ASC NULLS LAST, b.id ASC
  LIMIT 1;

  IF v_branch_id IS NULL THEN
    RAISE NOTICE 'No hay sucursales; se crearán categorías, productos y clientes sin stock ni direcciones vinculadas a sucursal.';
  END IF;

  -- Quitar datos de seed anteriores (mismos prefijos) para poder re-ejecutar
  DELETE FROM customer_addresses ca
  USING customers c
  WHERE ca.customer_id = c.id
    AND c.organization_id = v_org_id
    AND c.cedula LIKE 'CC 7999999%';

  DELETE FROM customers
  WHERE organization_id = v_org_id
    AND cedula LIKE 'CC 7999999%';

  DELETE FROM products
  WHERE organization_id = v_org_id
    AND (sku LIKE 'SKU-%' OR sku LIKE 'ART-%');

  INSERT INTO categories (organization_id, name, display_order)
  SELECT v_org_id, unnest(categories), generate_series(0, array_length(categories, 1) - 1)
  ON CONFLICT (organization_id, name) DO NOTHING;

  FOR i IN 1..array_length(names, 1) LOOP
    prod_name := names[i];
    prod_sku := 'ART-' || LPAD(i::TEXT, 3, '0');
    prod_cat := categories[1 + ((i - 1) % array_length(categories, 1))];
    prod_brand := brands[1 + ((i - 1) % array_length(brands, 1))];
    prod_desc := 'Pieza artesanal de demostración: ' || lower(prod_cat) || '. Ideal para catálogo y pruebas de inventario.';
    prod_price := (12000 + (i * 1500) + (i % 7 * 2500))::DECIMAL;
    prod_cost := (prod_price * (0.35 + (i % 5) * 0.06))::DECIMAL;
    prod_iva := (i % 4) = 0;

    SELECT id INTO v_cat_id FROM categories WHERE organization_id = v_org_id AND name = prod_cat LIMIT 1;

    INSERT INTO products (organization_id, name, sku, description, category_id, brand, base_price, base_cost, apply_iva)
    VALUES (v_org_id, prod_name, prod_sku, prod_desc, v_cat_id, prod_brand, prod_price, prod_cost, prod_iva)
    RETURNING id INTO v_prod_id;

    IF v_branch_id IS NOT NULL THEN
      stock_qty := (i * 5 + 3) % 40;
      INSERT INTO inventory (product_id, branch_id, location, quantity)
      VALUES (v_prod_id, v_branch_id, 'local', stock_qty)
      ON CONFLICT (product_id, branch_id, location) DO UPDATE SET quantity = EXCLUDED.quantity;
    END IF;
  END LOOP;

  IF v_branch_id IS NOT NULL THEN
    FOR i IN 1..18 LOOP
      INSERT INTO customers (organization_id, branch_id, name, email, phone, cedula, active)
      VALUES (
        v_org_id,
        v_branch_id,
        CASE i
          WHEN 1 THEN 'María Fernanda López'
          WHEN 2 THEN 'Comercial Artesanías del Norte SAS'
          WHEN 3 THEN 'Carlos Andrés Muñoz'
          WHEN 4 THEN 'Tienda Raíces — punto de venta'
          WHEN 5 THEN 'Lucía Pérez Gómez'
          WHEN 6 THEN 'Eventos Culturales La Plaza'
          WHEN 7 THEN 'Jorge Iván Rincón'
          WHEN 8 THEN 'Hotel Boutique Los Tejidos'
          WHEN 9 THEN 'Ana Milena Soto'
          WHEN 10 THEN 'Corporación Manos Libres'
          WHEN 11 THEN 'Pedro Nel Ocampo'
          WHEN 12 THEN 'Feria Campesina — stand 12'
          WHEN 13 THEN 'Diana Marcela Urrea'
          WHEN 14 THEN 'Librería Papel y Barro'
          WHEN 15 THEN 'Héctor Fabio Zapata'
          WHEN 16 THEN 'Asociación Mujeres Tejedoras'
          WHEN 17 THEN 'Laura Cristina Mejía'
          WHEN 18 THEN 'Bazar Solidario Comunitario'
        END,
        'cliente.seed' || i::TEXT || '@demo.oviler.local',
        CASE WHEN i % 3 = 0 THEN NULL ELSE '300' || LPAD((5550000 + i)::TEXT, 7, '0') END,
        'CC 7999999' || LPAD(i::TEXT, 3, '0'),
        true
      )
      RETURNING id INTO v_cust_id;

      IF i <= 12 THEN
        INSERT INTO customer_addresses (customer_id, label, address, reference_point, is_default, display_order)
        VALUES (
          v_cust_id,
          'Principal',
          CASE (i % 4)
            WHEN 0 THEN 'Carrera 14 # 82-45, Bogotá'
            WHEN 1 THEN 'Calle 5 # 10-20, Rionegro'
            WHEN 2 THEN 'Av. Santander 45-60, Manizales'
            ELSE 'Transversal 39 # 72-109, Medellín'
          END,
          CASE WHEN i % 2 = 0 THEN 'Portón verde, timbre 2' ELSE 'Edificio Torre B, apto 501' END,
          true,
          0
        );
      END IF;
    END LOOP;
  ELSE
    RAISE NOTICE 'Sin sucursal no se insertaron clientes (requieren branch_id).';
  END IF;

  RAISE NOTICE 'Seed completado: artesanías y clientes para la organización del usuario más reciente.';
END $$;
