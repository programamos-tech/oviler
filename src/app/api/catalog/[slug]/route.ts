import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBranchByCatalogSlug } from '@/lib/catalog-server'
import { catalogSalePrice } from '@/lib/catalog-price'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

/**
 * GET catálogo público: sucursal (sin cuentas de pago), categorías y productos con stock.
 */
export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params
  try {
    const admin = createAdminClient()
    const branch = await getBranchByCatalogSlug(admin, slug)
    if (!branch) {
      return NextResponse.json({ error: 'Catálogo no disponible' }, { status: 404 })
    }

    const { data: products, error: pErr } = await admin
      .from('products')
      .select('id, name, sku, description, brand, base_price, apply_iva, image_url, category_id')
      .eq('organization_id', branch.organization_id)
      .order('name')

    if (pErr) {
      console.error(pErr)
      return NextResponse.json({ error: 'No se pudo cargar el catálogo' }, { status: 500 })
    }

    const { data: catRows } = await admin
      .from('categories')
      .select('id, name, display_order')
      .eq('organization_id', branch.organization_id)

    const catById = new Map((catRows ?? []).map((c) => [c.id, c]))

    const { data: invRows } = await admin
      .from('inventory')
      .select('product_id, quantity')
      .eq('branch_id', branch.id)

    const qtyByProduct = new Map<string, number>()
    for (const row of invRows ?? []) {
      qtyByProduct.set(row.product_id, row.quantity ?? 0)
    }

    type Cat = { id: string; name: string; display_order: number }
    const categoryMap = new Map<string, Cat>()

    const items = (products ?? [])
      .map((p) => {
        const qty = qtyByProduct.get(p.id) ?? 0
        const cat = p.category_id ? catById.get(p.category_id) : undefined
        if (cat?.id) {
          categoryMap.set(cat.id, {
            id: cat.id,
            name: cat.name,
            display_order: cat.display_order ?? 0,
          })
        }
        const unitPrice = catalogSalePrice(p.base_price, Boolean(p.apply_iva))
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          description: p.description,
          brand: p.brand,
          base_price: p.base_price,
          apply_iva: p.apply_iva,
          unit_price: unitPrice,
          image_url: p.image_url,
          category_id: p.category_id,
          category: cat
            ? { id: cat.id, name: cat.name, display_order: cat.display_order ?? 0 }
            : null,
          stock: qty,
        }
      })
      .filter((p) => p.stock > 0)

    const categories = Array.from(categoryMap.values()).sort(
      (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)
    )

    return NextResponse.json({
      branch: {
        id: branch.id,
        name: branch.name,
        logo_url: branch.logo_url,
        catalog_delivery_fee_cop: Math.max(0, Math.floor(Number(branch.catalog_delivery_fee_cop) || 0)),
      },
      categories,
      products: items,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
