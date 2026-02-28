-- Seed: 50 clientes de prueba (solo customers + una dirección por cliente).
-- Ejecutar: copia y pega en el SQL Editor del dashboard de Supabase.
-- Usa la organización del usuario con el email indicado (cámbialo si usas otro correo).

DO $seed$
DECLARE
  v_org_id UUID;
  v_user_email TEXT := 'andresruss.st@gmail.com';
  v_customer_id UUID;
  v_names TEXT[] := ARRAY[
    'María García López', 'Carlos Rodríguez Pérez', 'Ana Martínez Sánchez', 'Luis Hernández Díaz',
    'Laura Fernández Ruiz', 'José López Gómez', 'Carmen González Vega', 'Miguel Ángel Torres',
    'Elena Ramírez Castro', 'Francisco Jiménez Mora', 'Isabel Ruiz Navarro', 'Antonio Serrano Reyes',
    'Rosa Vargas Mendoza', 'Javier Moreno Ortega', 'Patricia Romero Soto', 'David Álvarez Campos',
    'Sandra Gil Delgado', 'Roberto Blanco Fuentes', 'Mónica Cabrera Ríos', 'Andrés Núñez Cortés',
    'Cliente Final', 'Tienda El Ahorro', 'Droguería Central', 'Supermercado La 14',
    'Ferretería Don José', 'Panadería La Esquina', 'Restaurante El Rincón', 'Farmacia San Pablo',
    'Papelería Estudiantil', 'Carnicería El Buen Corte', 'Hogar María', 'Clínica Dental Sonrisa',
    'Gimnasio Power', 'Floristería Jardín', 'Lavandería Express', 'Pizzería Napoli',
    'Sushi Bar Sakura', 'Heladería Dolce', 'Café Literario', 'Bar La Esquina',
    'Hotel Plaza', 'Constructora Edificar', 'Transportes Rápido', 'Abogados & Asociados',
    'Contadores Pro', 'Diseño Web Studio', 'Repuestos Auto', 'Librería Nacional',
    'Óptica Visión', 'Veterinaria Patitas'
  ];
  i INT;
BEGIN
  -- Resolver organización por email del usuario (el que usas en la app)
  SELECT u.organization_id INTO v_org_id
  FROM users u
  LEFT JOIN user_branches ub ON ub.user_id = u.id
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(v_user_email))
  LIMIT 1;
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id
    FROM users
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_user_email))
    LIMIT 1;
  END IF;
  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No se encontró usuario con email %. Cambia v_user_email en el script.', v_user_email;
    RETURN;
  END IF;

  FOR i IN 1..50 LOOP
    INSERT INTO customers (organization_id, name, cedula, email, phone, active)
    VALUES (
      v_org_id,
      v_names[i],
      (1000000000 + (i * 123456))::TEXT,
      'cliente' || LPAD(i::TEXT, 2, '0') || '@ejemplo.com',
      '3' || LPAD((100000000 + i * 111111)::TEXT, 9, '0'),
      true
    )
    RETURNING id INTO v_customer_id;

    INSERT INTO customer_addresses (customer_id, label, address, reference_point, is_default, display_order)
    VALUES (
      v_customer_id,
      CASE WHEN i % 3 = 0 THEN 'Oficina' WHEN i % 3 = 1 THEN 'Casa' ELSE 'Almacén' END,
      'Cra ' || (i + 1) || ' #' || (i * 2) || '-' || (i * 3) || ', Zona ' || i,
      'Ref: Punto ' || i,
      true,
      0
    );
  END LOOP;

  RAISE NOTICE 'Seed completado: 50 clientes creados en la organización %.', v_org_id;
END $seed$;
