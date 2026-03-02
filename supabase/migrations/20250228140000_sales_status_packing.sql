-- Estado "Empacando" para flujo de pedidos: Creado → Alistando → Empacando → Despachado → Finalizado.
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_status_check;

ALTER TABLE sales
  ADD CONSTRAINT sales_status_check
  CHECK (status IN (
    'completed',
    'cancelled',
    'pending',
    'preparing',
    'packing',
    'on_the_way',
    'delivered'
  ));
