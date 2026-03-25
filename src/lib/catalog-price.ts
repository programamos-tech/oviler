/** Misma lógica que inventario / ventas para precio con IVA. */
export const CATALOG_IVA_RATE = 0.19

export function catalogSalePrice(basePrice: number | null | undefined, applyIva: boolean): number {
  const base = Number(basePrice) || 0
  return applyIva ? base + Math.round(base * CATALOG_IVA_RATE) : base
}
