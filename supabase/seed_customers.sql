-- Seed: 30 clientes de prueba para la primera organización.
-- Ejecutar: copia y pega en el SQL Editor del dashboard de Supabase (o usa la org que tengas).
-- Si usas otra organización, cambia v_org_id por el UUID de tu organización.

DO $$
DECLARE
  v_org_id UUID := 'f3e44998-8d9a-4012-a8d2-f437095e405f'::UUID;
  v_customer_id UUID;
  names TEXT[] := ARRAY[
    'María García López', 'Carlos Rodríguez Pérez', 'Ana Martínez Sánchez', 'Luis Hernández Díaz',
    'Laura Fernández Ruiz', 'José López Gómez', 'Carmen González Vega', 'Miguel Ángel Torres',
    'Elena Ramírez Castro', 'Francisco Jiménez Mora', 'Isabel Ruiz Navarro', 'Antonio Serrano Reyes',
    'Rosa Vargas Mendoza', 'Javier Moreno Ortega', 'Patricia Romero Soto', 'David Álvarez Campos',
    'Sandra Gil Delgado', 'Roberto Blanco Fuentes', 'Mónica Cabrera Ríos', 'Andrés Núñez Cortés',
    'Cliente Final', 'Tienda El Ahorro', 'Droguería Central', 'Supermercado La 14',
    'Ferretería Don José', 'Panadería La Esquina', 'Restaurante El Rincón', 'Farmacia San Pablo',
    'Papelería Estudiantil', 'Carnicería El Buen Corte'
  ];
  emails TEXT[] := ARRAY[
    'maria.garcia@mail.com', 'carlos.rodriguez@mail.com', 'ana.martinez@mail.com', 'luis.hernandez@mail.com',
    'laura.fernandez@mail.com', 'jose.lopez@mail.com', 'carmen.gonzalez@mail.com', 'miguel.torres@mail.com',
    'elena.ramirez@mail.com', 'francisco.jimenez@mail.com', 'isabel.ruiz@mail.com', 'antonio.serrano@mail.com',
    'rosa.vargas@mail.com', 'javier.moreno@mail.com', 'patricia.romero@mail.com', 'david.alvarez@mail.com',
    'sandra.gil@mail.com', 'roberto.blanco@mail.com', 'monica.cabrera@mail.com', 'andres.nunez@mail.com',
    'cliente@final.com', 'ahorro@tienda.com', 'central@drogueria.com', 'contacto@la14.com',
    'ventas@ferreteria.com', 'pedidos@panaderia.com', 'reservas@elrincon.com', 'info@farmaciasanpablo.com',
    'estudiantil@papeleria.com', 'pedidos@elbuencorte.com'
  ];
  i INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
    RAISE NOTICE 'No existe la organización. Usa el UUID de tu organización en v_org_id.';
    RETURN;
  END IF;

  FOR i IN 1..30 LOOP
    INSERT INTO customers (organization_id, name, cedula, email, phone)
    VALUES (
      v_org_id,
      names[i],
      (1000000000 + (i * 123456))::TEXT,
      emails[i],
      '3' || LPAD((100000000 + i * 111111)::TEXT, 9, '0')
    )
    RETURNING id INTO v_customer_id;

    -- Una dirección por cliente para que la lista se vea completa
    INSERT INTO customer_addresses (customer_id, label, address, reference_point, is_default, display_order)
    VALUES (
      v_customer_id,
      CASE WHEN i % 3 = 0 THEN 'Oficina' WHEN i % 3 = 1 THEN 'Casa' ELSE 'Almacén' END,
      'Cra ' || (i + 1) || ' #' || (i * 2) || '-' || (i * 3) || ' Zona ' || i,
      'Ref: Punto ' || i,
      true,
      0
    );
  END LOOP;

  RAISE NOTICE 'Seed completado: 30 clientes de prueba creados.';
END $$;
