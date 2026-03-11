# Enfoque: Tienda primero, bodega si aplica

## Manifiesto

**Objetivo:** Un sistema para gestionar **mi tienda** (ventas, productos, clientes, caja y reportes). Si el comercio tiene bodega, se habilita como módulo opcional (inventario por ubicación, alistamiento, despachos).

- El día a día es **venta en físico en mostrador**; los pedidos con envío y la bodega son opciones.
- Lenguaje y flujos asumen **comercio/tienda** por defecto; bodega no es el centro.
- **Venta en físico** no lleva alistamiento ni despacho; **venta con envío** sí (creado → alistamiento → alistado → despachado → entregado → finalizado).

---

## Dashboard (vista principal)

El dashboard debe ser la **vista de reportes** del negocio: números que el dueño quiere ver al abrir la app.

### Métricas acordadas

| Métrica | Descripción |
|--------|-------------|
| **Total ingresos** | Ingresos totales en el período (todas las formas de pago). |
| **Efectivo** | Ingresos por pago en efectivo. |
| **Transferencia** | Ingresos por transferencia. |
| **Crédito** | Ventas a crédito (cuando aplique). |
| **Ingreso bruto** | Ventas antes de descuentos/devoluciones (según definición del negocio). |
| **Ingreso neto** | Ventas después de descuentos, devoluciones, anulaciones. |
| **Facturas anuladas** | Cantidad y/o monto de facturas/ventas anuladas en el período. |
| **Stock de productos** | Vista resumida: bajo stock, productos sin stock, valorizado (opcional). |
| **Garantías gestionadas** | Cantidad y/o resumen de garantías (entregadas, pendientes, rechazadas). |

**Opinión:** Tiene sentido. Agruparía en bloques:

1. **Caja / ingresos:** Total ingresos, Efectivo, Transferencia, Crédito, Ingreso bruto, Ingreso neto.
2. **Ajustes / control:** Facturas anuladas.
3. **Inventario (si aplica):** Stock de productos (alertas, valorizado).
4. **Postventa:** Garantías gestionadas.

El período (hoy, semana, mes, rango) debe ser selector común para todas las métricas. Opcional: comparativa con período anterior.

---

## Flujo de ventas (definido)

- **Venta en físico (en tienda):**  
  Creado → En alistamiento (opcional, según si usan preparación en mostrador) → **Finalizado**.  
  **No** alistamiento tipo bodega, **no** despacho ni entregado. Stock se descuenta al marcar Finalizado (ya implementado).

- **Venta con envío:**  
  Se mantiene el flujo actual: Creado → En alistamiento → Alistado → Despachado → Entregado → Finalizado.  
  Aquí sí hay alistamiento, transportador e impresión de “a despachar”.

Si en el futuro se quiere “alistamiento” en tienda (ej. pedido para recoger luego), se puede añadir como opción sin despacho.

---

## Lista corta de cambios concretos

### Producto y copy

- [ ] Revisar todos los textos que digan “pedido”, “despacho”, “alistamiento” y en vistas por defecto (sin bodega) usar “venta”, “entrega” solo cuando sea con envío.
- [ ] Menú/navegación: ítem principal “Ventas” (o “Tienda”); “Bodega” / “Inventario por ubicación” como sección secundaria o bajo “Configuración” cuando bodega esté deshabilitada.
- [ ] Onboarding: preguntas “¿Tienes bodega?”, “¿Haces envíos?”; según respuestas, mostrar u ocultar módulos (bodega, despacho, alistamiento).

### Dashboard

- [ ] Definir dashboard como “Reportes” o “Resumen” con las métricas: Total ingresos, Efectivo, Transferencia, Crédito, Ingreso bruto, Ingreso neto, Facturas anuladas, Stock (resumen), Garantías gestionadas.
- [ ] Selector de período (hoy, semana, mes, personalizado) y, si hay datos, comparativa con período anterior.
- [ ] Bloque “Garantías” solo visible si el módulo garantías está habilitado.

### Ventas

- [ ] Ya hecho: venta en físico sin estados Despachado/Entregado; stock se descuenta al Finalizar.
- [ ] Dejar claro en UI: “Venta en tienda” vs “Venta con envío” (ej. etiqueta o filtro) para que no se mezclen flujos.

### Inventario y bodega

- [ ] Si “solo tienda”: inventario por sucursal (stock por tienda), sin obligar ubicaciones ni picking.
- [ ] Si “tiene bodega”: habilitar ubicaciones, alistamiento, despacho, transferencias.

### Configuración

- [ ] Toggle o modo “Tengo bodega” / “Solo tienda” (por organización o por sucursal) que controle visibilidad de flujos y reportes de bodega.

---

## Resumen

- **Dashboard = vista de reportes:** ingresos (total, efectivo, transferencia, crédito), bruto/neto, anuladas, stock, garantías; con período y opcional comparativa.
- **Ventas:** físico = sin alistamiento/despacho; con envío = flujo completo con alistamiento y despacho.
- **Resto:** copy y menú orientados a “tienda”; bodega y garantías como módulos opcionales con toggles claros.
