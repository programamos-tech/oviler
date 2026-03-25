const key = (slug: string) => `nou_catalog_cart_${slug}`

export type CartLine = { product_id: string; quantity: number }

export function loadCart(slug: string): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(key(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (l): l is CartLine =>
        l &&
        typeof l === 'object' &&
        typeof (l as CartLine).product_id === 'string' &&
        typeof (l as CartLine).quantity === 'number'
    )
  } catch {
    return []
  }
}

export function saveCart(slug: string, lines: CartLine[]) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(key(slug), JSON.stringify(lines))
}

export function clearCart(slug: string) {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(key(slug))
}
