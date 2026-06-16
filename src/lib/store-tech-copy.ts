/**
 * Copy del ERP — vertical tienda de tecnología (periféricos, equipos, accesorios, postventa).
 * Centraliza títulos, subtítulos, placeholders, empty states y labels del dashboard.
 * Para otro rubro: sustituir este archivo o añadir una capa de selección de vertical.
 */

export const STORE_TECH_COPY = {
  nav: {
    sidebar: {
      resumen: { label: "Panel de tienda" },
      ventas: { label: "Facturas" },
      clientes: { label: "Clientes" },
      garantias: { label: "Garantías y RMA" },
      creditos: { label: "Financiación" },
      inventario: { label: "Equipos y stock" },
      colaboradores: { label: "Equipo de tienda" },
      actividades: { label: "Bitácora" },
      egresos: { label: "Gastos de tienda" },
      sucursales: { label: "Sucursales" },
      configuracion: { label: "Configuración" },
    },
    mobile: {
      garantias: "Garantías y RMA",
      creditos: "Financiación",
      egresos: "Gastos de tienda",
      actividades: "Bitácora",
      inventario: "Equipos y stock",
      /** Una palabra — barra inferior en tablet */
      short: {
        inicio: "Inicio",
        inventario: "Stock",
        ventas: "Facturas",
        clientes: "Clientes",
        garantias: "Garantías",
        creditos: "Financiación",
        egresos: "Gastos",
        actividades: "Bitácora",
        roles: "Roles",
        sucursales: "Sucursales",
        cuenta: "Cuenta",
        catalogo: "Catálogo",
        cierres: "Cierres",
        bodega: "Bodega",
      },
    },
    /** Etiquetas de módulo para breadcrumbs y nav agrupado */
    modules: {
      comercial: "COMERCIAL",
      operacion: "OPERACIÓN",
      configuracion: "CONFIGURACIÓN",
      inventario: "Equipos y stock",
      garantias: "Garantías y RMA",
      creditos: "Financiación",
      egresos: "Gastos de tienda",
      clientes: "Clientes",
      ventas: "Facturas",
      actividades: "Bitácora",
      roles: "Equipo de tienda",
    },
    descriptions: {
      reportes: "Indicadores del mostrador",
      ventas: "Facturas de equipos y accesorios",
      clientes: "Historial de compras y contacto",
      garantias: "Cambios, devoluciones y revisión",
      creditos: "Crédito en equipos y abonos",
      productos: "Catálogo técnico, stock y referencias",
      roles: "Vendedores y permisos del equipo",
      actividades: "Movimientos recientes de la tienda",
      egresos: "Proveedores, arriendo y gastos operativos",
      sucursales: "Puntos de venta de la organización",
      cuenta: "Perfil del propietario y avatar",
    },
    helpFooter: {
      title: "¿Necesitas ayuda?",
      subtitle: "WhatsApp · 315 280 2343",
    },
  },

  workspace: {
    reportes: "Panel de tienda",
    ventas: "Facturas de mostrador",
    ventasNueva: "Nueva factura",
    ventasDetalle: "Detalle de factura",
    clientes: "Clientes",
    clientesNueva: "Nuevo cliente",
    clientesEditar: "Editar cliente",
    clientesDetalle: "Cliente",
    inventario: "Equipos y accesorios",
    inventarioNuevo: "Nuevo equipo o accesorio",
    inventarioEditar: "Editar producto",
    inventarioDetalle: "Producto",
    garantias: "Garantías y RMA",
    garantiasNueva: "Nueva garantía",
    garantiasDetalle: "Garantía",
    creditos: "Financiación de equipos",
    creditosNuevo: "Nueva venta a crédito",
    creditosDetalle: "Detalle de crédito",
    creditosCliente: "Financiación del cliente",
    egresos: "Gastos de la tienda",
    egresosNuevo: "Registrar gasto",
    egresosDetalle: "Gasto",
    actividades: "Bitácora de tienda",
    roles: "Equipo de tienda",
    rolesNuevo: "Nuevo colaborador",
    panel: "Panel de tienda",
  },

  dashboard: {
    greetingToday: "Así va la tienda hoy",
    greetingDayPrefix: "Resumen del",
    salesKpiToday: "Facturación hoy",
    salesKpiPeriod: "Facturación del período",
    marginKpiToday: "Utilidad en equipos hoy",
    marginKpiPeriod: "Utilidad en equipos",
    cashKpi: "Caja efectivo",
    transferKpi: "Caja transferencia",
    stockKpi: "Valor en inventario",
    topProducts: "Top equipos y accesorios",
    salesSummary: "Ventas del mostrador",
    paymentMix: "Formas de pago",
    recentOrders: "Últimas facturas",
    recentOrdersLink: "Ver todas",
    recentOrdersEmpty: "No hay facturas en el período.",
    recentOrdersColumnOrder: "Factura",
    activities: "Actividades recientes",
    last7Days: "Últimos 7 días",
    thisPeriod: "Este período",
    expensesToday: "Gastos de hoy",
    expensesPeriod: "Gastos del período",
    infoTipSales: "Facturación del período",
    infoTipStock: "Valor en inventario",
  },

  channels: {
    store: "Mostrador",
    online: "Catálogo web",
    delivery: "Domicilio",
    other: "Otros",
    noSales: "Sin ventas",
  },

  ventas: {
    sectionTitle: "Facturas de mostrador",
    newButton: "Nueva factura",
    confirmButton: "Confirmar factura",
    emptyTitle: "Aún no hay facturas registradas",
    emptyHint: "Registra la venta de un equipo o accesorio para verla aquí.",
    emptyFiltered: "Ningún documento coincide con la búsqueda o los filtros",
    searchPlaceholder: "Factura, cliente o referencia…",
    productSearch: "Buscar por nombre, referencia o SKU",
    productsHeading: "Equipos y accesorios facturados",
    productsEmpty: "Sin equipos ni accesorios en esta factura",
    addProductTitle: "Agregar equipo o accesorio",
    consumerFinal: "Consumidor final",
  },

  inventario: {
    title: "Equipos y accesorios",
    subtitle: "Catálogo de la tienda: referencias, marcas, stock en mostrador y bodega.",
    newButton: "Nuevo producto",
    searchPlaceholder: "Nombre, referencia o SKU (ej. Mouse Pro X, TECL-MEC-01)",
    searchAriaLabel: "Buscar por nombre, referencia o SKU",
    columnProduct: "Equipo / accesorio",
    columnCode: "Referencia",
    emptyTitle: "Aún no hay equipos ni accesorios",
    emptyHint: "Registra tu primer producto en el catálogo técnico.",
    emptyFiltered: "Ningún producto coincide con tu búsqueda o filtros",
    emptyFilteredHint: "Ajusta la búsqueda, el estado de stock o la categoría.",
    nuevo: {
      title: "Nuevo equipo o accesorio",
      subtitle: "Alta en catálogo: datos, marca, precio y stock en un solo lugar.",
      breadcrumb: "Nuevo producto",
      namePlaceholder: "Ej. Teclado mecánico RGB 87 teclas",
      skuPlaceholder: "Ej. TECL-MEC-RGB-87",
      descriptionPlaceholder: "Ej. Switch red, USB-C, layout US, garantía 12 meses",
      brandPlaceholder: "Ej. Logitech, Razer, HyperX, Corsair",
    },
    categorias: {
      placeholder: "Ej. Periféricos, Telefonía, Gaming…",
      empty: "Las categorías por defecto de tienda tech se cargan al abrir esta página. También puedes agregar las tuyas arriba.",
    },
    stockNotePlaceholder: "Ej. Entrada por compra a proveedor tech",
  },

  garantias: {
    title: "Garantías y servicio postventa",
    subtitle: "Reclamaciones, cambios, devoluciones y equipos en revisión.",
    newButton: "Nueva garantía",
    searchPlaceholder: "Buscar por ID, cliente, equipo o factura…",
    emptyTitle: "Aún no hay garantías registradas",
    emptyHint: "Registra la primera reclamación de un equipo vendido.",
    emptyFiltered: "Ninguna garantía coincide con la búsqueda o filtros",
    emptyFilteredHint: "Prueba cambiando la búsqueda, el estado o el tipo de garantía.",
    issuePlaceholder:
      "Ej. No enciende, botón defectuoso, falla de conexión, ruido en altavoz…",
    resolutionPlaceholder:
      "Ej. Se cambió el producto por uno nuevo. Serial registrado. Entrega al cliente.",
    rejectPlaceholder: "Ej. El equipo no presenta defecto de fábrica; desgaste por uso.",
  },

  creditos: {
    title: "Financiación de equipos",
    subtitle: "Ventas a crédito por cliente. Entra al detalle para ver cuotas y registrar abonos.",
    newButton: "Nueva venta a crédito",
    searchPlaceholder: "Buscar cliente…",
    emptyTitle: "Aún no hay equipos financiados",
    emptyHint: "Crea un crédito vinculado a un cliente y al equipo vendido.",
    productSearch: "Buscar por nombre, referencia o SKU",
    notesPlaceholder: "Notas del crédito: cuotas, inicial, equipo financiado…",
    noAbonos: "Aún no hay abonos registrados.",
  },

  clientes: {
    title: "Clientes",
    subtitle: "Clientes de la tienda: compras, garantías abiertas y saldos en financiación.",
    newButton: "Nuevo cliente",
    searchPlaceholder: "Buscar por nombre, cédula, email o teléfono…",
    emptyTitle: "Aún no tienes clientes",
    emptyHint: "Registra clientes que compran equipos, accesorios o financiación.",
    topProducts: "Equipos que ha comprado",
    noVentas: "Aún no hay facturas registradas para este cliente.",
  },

  egresos: {
    title: "Gastos de la tienda",
    subtitle: "Salidas de dinero: proveedores, arriendo, publicidad y gastos operativos.",
    newButton: "Registrar gasto",
    breadcrumb: "Gastos de tienda",
    searchPlaceholder: "Buscar por concepto o notas…",
    conceptPlaceholder: "Escribe el concepto",
    conceptCustomHint: "Ej. Compra accesorios proveedor, arriendo local, publicidad",
    notesPlaceholder: "Detalle adicional si lo necesitas",
    emptyAll: "Aún no hay gastos registrados",
    emptyFiltered: (paymentLabel: string) => `No hay gastos con pago "${paymentLabel}"`,
  },

  actividades: {
    title: "Bitácora de tienda",
    subtitle: "Ventas, stock, garantías y movimientos recientes del equipo.",
    emptyTitle: "Aún no hay actividades",
    commentPlaceholder: "Escribe un comentario…",
  },

  expenses: {
    kindInventory: "Compra de mercancía",
    kindOperating: "Gasto operativo",
  },

  imei: {
    requiresLabel: "Stock por IMEI (equipos serializados)",
    requiresHint:
      "Cada unidad física se identifica con su IMEI al cargar stock y al vender.",
    requiresCreateTitle: "Stock por IMEI",
    requiresCreateBody:
      "Guarda el producto sin cantidad. Luego, en Actualizar stock, pega un IMEI por unidad; cada uno suma 1 al inventario.",
    requiresCreateLink: "Actualizar stock",
    registerTitle: "Registrar IMEIs en stock",
    registerHint: "Ingresa un IMEI por línea. Cada IMEI válido suma 1 unidad al stock al confirmar.",
    registerPlaceholder: "Ej.\n356789012345678\n356789012345679",
    availableInStock: "IMEIs disponibles en mostrador",
    selectImei: "Seleccionar IMEI",
    assignRequired: "Asigna el IMEI de cada unidad antes de confirmar la factura.",
    invalidImei: "IMEI inválido: debe tener 15 dígitos.",
    duplicateImei: "Ese IMEI ya está registrado en tu tienda.",
    onInvoice: "IMEI",
    warrantyLink: "Equipo (IMEI)",
    lookupPlaceholder: "Buscar por IMEI…",
    soldTo: "Vendido en factura",
    notInStock: "No hay IMEIs en stock para este producto.",
    removedTitle: "Historial de bajas",
    removedSubtitle: "Unidades dadas de baja en esta sucursal (quedan registradas con motivo).",
    removedEmpty: "No hay bajas registradas para este producto.",
    removedAt: "Fecha",
    removedReason: "Motivo",
    removedBy: "Usuario",
    movementEntrada: "Entrada",
    movementBaja: "Baja",
    movementTransferir: "Transferir",
    movementEntradaHint: "Pega los IMEIs de las unidades que llegaron; cada uno suma 1 al stock.",
    movementBajaHint: "Selecciona o pega los IMEIs que sales del inventario (error de carga, devolución a proveedor, etc.).",
    movementTransferirHint: "Mueve unidades entre local y bodega sin cambiar el stock total.",
    selectUnitsTitle: "Unidades en stock",
    selectUnitsEmpty: "No hay unidades en stock en esta sucursal.",
    transferDestino: "Destino",
    removeCount: "Se darán de baja",
    transferCount: "Se transferirán",
    bajaReasonPlaceholder: "Ej. Devolución a proveedor, IMEI mal cargado",
    bajaReasonRequired: "Indica por qué das de baja estas unidades (obligatorio).",
    bajaReasonMissing: "Escribe el motivo de la baja antes de confirmar.",
    imeiNotInStock: "Ese IMEI no está en stock para este producto.",
  },
} as const;

export type StoreTechCopy = typeof STORE_TECH_COPY;

/** Saludo del dashboard según si se ve el día de hoy */
export function dashboardGreetingSubtitle(isViewingToday: boolean, formattedDay?: string): string {
  if (isViewingToday) return STORE_TECH_COPY.dashboard.greetingToday;
  if (formattedDay) return `${STORE_TECH_COPY.dashboard.greetingDayPrefix} ${formattedDay}`;
  return STORE_TECH_COPY.dashboard.greetingDayPrefix;
}

export function dashboardSalesKpiLabel(isToday: boolean): string {
  return isToday ? STORE_TECH_COPY.dashboard.salesKpiToday : STORE_TECH_COPY.dashboard.salesKpiPeriod;
}

export function dashboardMarginKpiLabel(isToday: boolean): string {
  return isToday ? STORE_TECH_COPY.dashboard.marginKpiToday : STORE_TECH_COPY.dashboard.marginKpiPeriod;
}

export function dashboardExpensesLabel(isToday: boolean): string {
  return isToday ? STORE_TECH_COPY.dashboard.expensesToday : STORE_TECH_COPY.dashboard.expensesPeriod;
}
