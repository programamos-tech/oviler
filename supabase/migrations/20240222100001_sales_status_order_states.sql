-- Estados de venta/pedido: completada/anulada (retail) o pendiente → preparación → en camino → entregado (pedidos).
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_status_check;

ALTER TABLE sales
  ADD CONSTRAINT sales_status_check
  CHECK (status IN (
    'completed',
    'cancelled',
    'pending',
    'preparing',
    'on_the_way',
    'delivered'
  ));

-- Las ventas existentes siguen siendo 'completed' o 'cancelled'. No cambiar default para no afectar retail.
-- En modo pedidos la app enviará status 'pending' al crear.
