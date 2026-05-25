-- =============================================================================
-- Catálogo retail Berea Shopping — ropa, zapatos, cuidado personal, perfumería, cases
-- =============================================================================
-- Reemplaza productos demo (accesorios celular genéricos, BRN-*, LIVE-*) por un
-- inventario de tienda retail realista.
--
-- Usuario: bernabe@tech.com · Sucursal: Berea Shopping (ajusta v_target_branch_name)
-- Ejecutar en Supabase → SQL Editor → Run completo
--
-- Después: Inventario → Actualizar. Opcional: vuelve a correr ventas con
-- seed_bernabe_live_demo.sql si quieres facturas ligadas a estos SKU (RET-*).
-- =============================================================================

DO $$
DECLARE
  v_user_email TEXT := 'bernabe@tech.com';
  v_target_branch_name TEXT := 'Berea Shopping';
  v_org_id UUID;
  v_branch_id UUID;
  v_branch_label TEXT;
  v_user_id UUID;
  v_prod_id UUID;
  stock_qty INT;
  v_max_products INT;
  v_product_cap INT;
  v_inserted INT;
  v_deleted_products INT;
  v_sku TEXT;
  r RECORD;
  v_br RECORD;

  retail_cats TEXT[] := ARRAY[
    'Ropa',
    'Zapatos',
    'Cuidado capilar',
    'Perfumería',
    'Accesorios celular'
  ];
BEGIN
  SELECT u.id, u.organization_id INTO v_user_id, v_org_id
  FROM users u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(v_user_email))
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No existe public.users para %', v_user_email;
  END IF;

  SELECT b.id, b.name INTO v_branch_id, v_branch_label
  FROM branches b
  INNER JOIN user_branches ub ON ub.branch_id = b.id AND ub.user_id = v_user_id
  WHERE b.organization_id = v_org_id
    AND b.name ILIKE '%' || TRIM(v_target_branch_name) || '%'
  ORDER BY
    CASE WHEN lower(b.name) = lower(trim(v_target_branch_name)) THEN 0 ELSE 1 END,
    b.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró sucursal "%" para %.', v_target_branch_name, v_user_email;
  END IF;

  RAISE NOTICE 'Organización % · Sucursal: % (%)', v_org_id, v_branch_label, v_branch_id;

  -- Ventas demo previas (evita facturas con productos que vamos a borrar)
  DELETE FROM sale_items si
  USING sales s
  WHERE si.sale_id = s.id
    AND s.branch_id = v_branch_id
    AND s.invoice_number LIKE 'FV-LIVE-%';

  DELETE FROM sales
  WHERE branch_id = v_branch_id
    AND invoice_number LIKE 'FV-LIVE-%';

  -- Quitar catálogo anterior de la organización (BRN, LIVE, RET previos, etc.)
  DELETE FROM products
  WHERE organization_id = v_org_id;

  GET DIAGNOSTICS v_deleted_products = ROW_COUNT;

  -- Categorías retail (reemplaza las de accesorios tecnológicos)
  DELETE FROM categories
  WHERE organization_id = v_org_id
    AND NOT (name = ANY(retail_cats));

  FOR i IN 1..array_length(retail_cats, 1) LOOP
    INSERT INTO categories (organization_id, name, display_order)
    VALUES (v_org_id, retail_cats[i], i - 1)
    ON CONFLICT (organization_id, name)
    DO UPDATE SET display_order = EXCLUDED.display_order;
  END LOOP;

  SELECT max_products INTO v_max_products FROM organizations WHERE id = v_org_id;
  IF v_max_products IS NULL OR v_max_products >= 999999 THEN
    v_product_cap := 80;
  ELSE
    v_product_cap := v_max_products;
  END IF;

  -- Productos retail (SKU RET-*)
  WITH catalog AS (
    SELECT * FROM (VALUES
      -- Ropa
      ('Ropa', 'Camiseta algodón básica talla M', 'RET-ROP-001', 'Camiseta 100% algodón peinado, cuello redondo.', 'Studio F', 22000, 45900, false),
      ('Ropa', 'Camiseta algodón básica talla L', 'RET-ROP-002', 'Camiseta 100% algodón peinado, cuello redondo.', 'Studio F', 22000, 45900, false),
      ('Ropa', 'Jean skinny mujer talla 10', 'RET-ROP-003', 'Jean tiro alto con stretch, azul oscuro.', 'Punto Blanco', 72000, 139900, false),
      ('Ropa', 'Jean recto hombre talla 32', 'RET-ROP-004', 'Jean clásico cinco bolsillos.', 'Punto Blanco', 68000, 129900, false),
      ('Ropa', 'Vestido casual floral talla S', 'RET-ROP-005', 'Vestido midi manga corta, estampado floral.', 'Zingara', 55000, 99900, false),
      ('Ropa', 'Vestido oficina liso negro talla M', 'RET-ROP-006', 'Vestido tubo elegante para oficina.', 'Zingara', 62000, 119900, false),
      ('Ropa', 'Bermuda drill hombre talla 34', 'RET-ROP-007', 'Bermuda cargo ligera color caqui.', 'Koaj', 38000, 74900, false),
      ('Ropa', 'Buso licrado deportivo talla M', 'RET-ROP-008', 'Buso cuello redondo, secado rápido.', 'Leonisa', 42000, 82900, false),
      ('Ropa', 'Leggings deportivo negro talla M', 'RET-ROP-009', 'Leggings alta compresión suave.', 'Leonisa', 35000, 69900, false),
      ('Ropa', 'Camisa manga larga lisa talla M', 'RET-ROP-010', 'Camisa popelina, ideal para trabajo.', 'Arturo Calle', 48000, 89900, false),
      ('Ropa', 'Polo piqué hombre talla L', 'RET-ROP-011', 'Polo clásico con botones, varios colores.', 'Arturo Calle', 40000, 79900, false),
      ('Ropa', 'Falda midi plisada talla S', 'RET-ROP-012', 'Falda plisada cintura alta.', 'Mango', 36000, 69900, false),
      ('Ropa', 'Chaqueta denim oversize talla M', 'RET-ROP-013', 'Chaqueta jean deslavada unisex.', 'Mango', 85000, 159900, false),
      ('Ropa', 'Sudadera con capucha talla L', 'RET-ROP-014', 'Hoodie franela interior, cierre canguro.', 'Koaj', 65000, 124900, false),
      ('Ropa', 'Short deportivo mujer talla M', 'RET-ROP-015', 'Short dry-fit con bolsillo lateral.', 'Leonisa', 28000, 54900, false),
      ('Ropa', 'Blusa lino manga campana talla M', 'RET-ROP-016', 'Blusa fresca para clima cálido.', 'Zingara', 44000, 84900, false),
      -- Zapatos
      ('Zapatos', 'Tenis urbano mujer talla 37', 'RET-ZAP-001', 'Tenis blanco suela chunky, uso diario.', 'Bosi', 95000, 179900, false),
      ('Zapatos', 'Tenis urbano mujer talla 38', 'RET-ZAP-002', 'Tenis blanco suela chunky, uso diario.', 'Bosi', 95000, 179900, false),
      ('Zapatos', 'Tenis running hombre talla 42', 'RET-ZAP-003', 'Tenis amortiguación para caminata y gym.', 'Nike', 145000, 279900, false),
      ('Zapatos', 'Tenis clásico lona hombre 41', 'RET-ZAP-004', 'Tenis casual cordón, suela goma.', 'Converse', 88000, 169900, false),
      ('Zapatos', 'Sandalia casual mujer talla 37', 'RET-ZAP-005', 'Sandalia tiras cruzadas, plantilla acolchada.', 'Bosi', 42000, 79900, false),
      ('Zapatos', 'Sandalia hombre talla 42', 'RET-ZAP-006', 'Sandalia sintética uso urbano.', 'Cat', 38000, 74900, false),
      ('Zapatos', 'Botín taco bajo mujer 38', 'RET-ZAP-007', 'Botín sintético tacón 5 cm, color negro.', 'Bosi', 78000, 149900, false),
      ('Zapatos', 'Zapato formal hombre 42', 'RET-ZAP-008', 'Oxford cuero sintético, oficina.', 'Clarks', 120000, 229900, false),
      ('Zapatos', 'Ballerina mujer talla 37', 'RET-ZAP-009', 'Ballerina punta redonda, flexibles.', 'Bosi', 45000, 85900, false),
      ('Zapatos', 'Chancla playa unisex 40', 'RET-ZAP-010', 'Chancla EVA ligera.', 'Havaianas', 18000, 34900, false),
      ('Zapatos', 'Bota media hombre 42', 'RET-ZAP-011', 'Bota trabajo suela antideslizante.', 'Cat', 135000, 259900, false),
      ('Zapatos', 'Mocasín mujer 37', 'RET-ZAP-012', 'Mocasín confort piso blando.', 'Clarks', 92000, 174900, false),
      -- Cuidado capilar
      ('Cuidado capilar', 'Shampoo anticaspa 400 ml', 'RET-CAP-001', 'Limpieza profunda cuero cabelludo.', 'Head & Shoulders', 12000, 24900, true),
      ('Cuidado capilar', 'Shampoo hidratación 400 ml', 'RET-CAP-002', 'Para cabello seco o teñido.', 'Sedal', 11000, 22900, true),
      ('Cuidado capilar', 'Shampoo keratina 350 ml', 'RET-CAP-003', 'Reconstrucción y brillo.', 'Pantene', 14000, 27900, true),
      ('Cuidado capilar', 'Acondicionador nutritivo 400 ml', 'RET-CAP-004', 'Desenredo y suavidad.', 'Sedal', 12000, 23900, true),
      ('Cuidado capilar', 'Mascarilla capilar 300 ml', 'RET-CAP-005', 'Tratamiento semanal reparador.', 'Pantene', 16000, 31900, true),
      ('Cuidado capilar', 'Aceite capilar argán 100 ml', 'RET-CAP-006', 'Control frizz y puntas.', 'Elvive', 18000, 35900, true),
      ('Cuidado capilar', 'Jabón líquido corporal 500 ml', 'RET-CAP-007', 'Fórmula suave pH balanceado.', 'Nivea', 9000, 18900, true),
      ('Cuidado capilar', 'Crema corporal hidratante 400 ml', 'RET-CAP-008', 'Hidratación 48 h piel seca.', 'Nivea', 15000, 29900, true),
      ('Cuidado capilar', 'Gel de baño familiar 1 L', 'RET-CAP-009', 'Aroma neutro, alto rendimiento.', 'Protex', 11000, 21900, true),
      ('Cuidado capilar', 'Desmaquillante bifásico 200 ml', 'RET-CAP-010', 'Ojos y rostro, waterproof.', 'L''Oréal', 22000, 42900, true),
      ('Cuidado capilar', 'Protector solar facial SPF 50', 'RET-CAP-011', 'Fluido ligero uso diario.', 'Eucerin', 48000, 89900, true),
      ('Cuidado capilar', 'Kit viaje shampoo + acondicionador', 'RET-CAP-012', 'Frascos 100 ml, ideal maleta.', 'Dove', 14000, 26900, true),
      -- Perfumería
      ('Perfumería', 'Perfume mujer floral 50 ml', 'RET-PER-001', 'Notas florales y vainilla.', 'Lattafa', 65000, 129900, true),
      ('Perfumería', 'Perfume hombre amaderado 100 ml', 'RET-PER-002', 'Frescura cítrica y base madera.', 'Antonio Banderas', 72000, 144900, true),
      ('Perfumería', 'Body mist mujer 250 ml', 'RET-PER-003', 'Spray corporal ligero.', 'Victoria Secret', 38000, 74900, true),
      ('Perfumería', 'Desodorante roll-on 50 ml', 'RET-PER-004', 'Protección 48 h sin alcohol.', 'Rexona', 6000, 12900, true),
      ('Perfumería', 'Desodorante aerosol 150 ml', 'RET-PER-005', 'Aroma sport hombre.', 'Axe', 9000, 17900, true),
      ('Perfumería', 'Crema facial hidratante 50 ml', 'RET-PER-006', 'Día, piel mixta.', 'Nivea', 22000, 41900, true),
      ('Perfumería', 'Labial mate tono nude', 'RET-PER-007', 'Larga duración.', 'Maybelline', 12000, 24900, true),
      ('Perfumería', 'Base líquida tono medio', 'RET-PER-008', 'Cobertura media natural.', 'Maybelline', 28000, 54900, true),
      ('Perfumería', 'Esmalte uñas rojo clásico', 'RET-PER-009', 'Secado rápido.', 'Vogue', 5000, 9900, true),
      ('Perfumería', 'Agua de tocador infantil 100 ml', 'RET-PER-010', 'Aroma suave hipoalergénico.', 'Johnson', 18000, 34900, true),
      ('Perfumería', 'Set regalo perfume + crema', 'RET-PER-011', 'Caja regalo temporada.', 'Lattafa', 95000, 189900, true),
      ('Perfumería', 'Locion after shave 100 ml', 'RET-PER-012', 'Calma irritación post afeitado.', 'Gillette', 24000, 45900, true),
      -- Accesorios celular
      ('Accesorios celular', 'Case silicona iPhone 15', 'RET-CEL-001', 'Funda flexible anti golpes.', 'Spigen', 12000, 29900, true),
      ('Accesorios celular', 'Case transparente iPhone 14', 'RET-CEL-002', 'TPU anti amarillamiento.', 'Baseus', 10000, 24900, true),
      ('Accesorios celular', 'Case libro Galaxy S24', 'RET-CEL-003', 'Con tapa y soporte.', 'Samsung', 18000, 39900, true),
      ('Accesorios celular', 'Case armor Xiaomi Redmi Note 13', 'RET-CEL-004', 'Esquinas reforzadas.', 'Nillkin', 14000, 32900, true),
      ('Accesorios celular', 'Protector pantalla templado 6.1"', 'RET-CEL-005', 'Cristal 9H kit 2 unidades.', 'Nillkin', 8000, 19900, true),
      ('Accesorios celular', 'Protector pantalla templado 6.7"', 'RET-CEL-006', 'Instalación fácil sin burbujas.', 'Spigen', 9000, 21900, true),
      ('Accesorios celular', 'Cable USB-C 1 m carga rápida', 'RET-CEL-007', 'Nylon trenzado 60 W.', 'Anker', 14000, 34900, true),
      ('Accesorios celular', 'Cable Lightning 1 m', 'RET-CEL-008', 'Certificado MFi.', 'Belkin', 22000, 44900, true),
      ('Accesorios celular', 'Pop socket diseño mármol', 'RET-CEL-009', 'Soporte adhesivo reusable.', 'PopSockets', 15000, 32900, true),
      ('Accesorios celular', 'Anillo soporte magnético', 'RET-CEL-010', 'Para auto y escritorio.', 'Baseus', 18000, 39900, true),
      ('Accesorios celular', 'Estuche organizador cables', 'RET-CEL-011', 'Viaje, varios compartimentos.', 'UGREEN', 25000, 49900, true),
      ('Accesorios celular', 'Funda tarjetero adhesiva', 'RET-CEL-012', '2 tarjetas en el case.', 'Spigen', 12000, 27900, true),
      ('Accesorios celular', 'Limpia pantalla kit spray', 'RET-CEL-013', 'Spray + microfibra.', 'Whoosh', 16000, 32900, true),
      ('Accesorios celular', 'Case silicona iPhone 13 mini', 'RET-CEL-014', 'Colores surtidos.', 'ESR', 11000, 26900, true)
    ) AS t(cat_name, prod_name, sku, descr, brand, cost, price, iva)
  ),
  numbered AS (
    SELECT c.*, row_number() OVER (ORDER BY c.sku) AS rn
    FROM catalog c
  ),
  ins AS (
    INSERT INTO products (
      organization_id, name, sku, description, brand, category_id,
      base_cost, base_price, apply_iva, image_url
    )
    SELECT
      v_org_id,
      n.prod_name,
      n.sku,
      n.descr,
      n.brand,
      cat.id,
      n.cost,
      n.price,
      n.iva,
      'https://picsum.photos/seed/' || lower(replace(n.sku, '-', '')) || '/800/800'
    FROM numbered n
    INNER JOIN categories cat
      ON cat.organization_id = v_org_id AND cat.name = n.cat_name
    WHERE n.rn <= v_product_cap
    RETURNING id, sku
  )
  SELECT COUNT(*)::int INTO v_inserted FROM ins;

  IF v_inserted < 62 AND v_product_cap < 62 THEN
    RAISE NOTICE 'Plan permite máx. % productos; se insertaron % del catálogo retail.', v_product_cap, v_inserted;
  END IF;

  -- Stock en todas las sucursales de la org (más unidades en Berea Shopping)
  FOR v_br IN
    SELECT b.id AS bid FROM branches b WHERE b.organization_id = v_org_id
  LOOP
    FOR r IN
      SELECT p.id, p.sku
      FROM products p
      WHERE p.organization_id = v_org_id
        AND p.sku LIKE 'RET-%'
    LOOP
      v_prod_id := r.id;
      v_sku := r.sku;
      IF v_br.bid = v_branch_id THEN
        stock_qty := 8 + (abs(hashtext(v_sku)) % 42);
      ELSE
        stock_qty := 4 + (abs(hashtext(v_sku || v_br.bid::text)) % 18);
      END IF;

      INSERT INTO inventory (product_id, branch_id, location, quantity, min_stock)
      VALUES (
        v_prod_id,
        v_br.bid,
        'local',
        stock_qty,
        CASE WHEN v_sku LIKE 'RET-ZAP-%' OR v_sku LIKE 'RET-ROP-%' THEN 4 ELSE 6 END
      )
      ON CONFLICT (product_id, branch_id, location)
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        min_stock = EXCLUDED.min_stock,
        updated_at = NOW();
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Productos eliminados (catálogo anterior): %', v_deleted_products;
  RAISE NOTICE 'Productos retail insertados: % (SKU RET-*)', v_inserted;
  RAISE NOTICE 'Stock cargado en sucursales de la org. Lista en: %', v_branch_label;
  RAISE NOTICE 'Categorías: Ropa, Zapatos, Cuidado capilar, Perfumería, Accesorios celular';
END $$;
