import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ token: string }> }

/**
 * Seguimiento público de pedido por token (sin autenticación).
 */
export async function GET(_request: Request, { params }: Params) {
  const { token } = await params
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!token || !uuidRe.test(token)) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  try {
    const admin = createAdminClient()
    const { data: sale, error } = await admin
      .from('sales')
      .select(
        'id, invoice_number, total, status, payment_pending, payment_proof_url, is_delivery, delivery_fee, created_at, public_tracking_token, branch_id'
      )
      .eq('public_tracking_token', token)
      .eq('channel', 'web_catalog')
      .maybeSingle()

    if (error || !sale) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const { data: branchRow } = await admin
      .from('branches')
      .select('id, name, logo_url, payment_nequi, payment_bancolombia, payment_llave, catalog_slug, catalog_enabled')
      .eq('id', sale.branch_id)
      .maybeSingle()

    const { data: items } = await admin
      .from('sale_items')
      .select('quantity, unit_price, discount_amount, product_id')
      .eq('sale_id', sale.id)

    const productIds = [...new Set((items ?? []).map((i) => i.product_id))]
    const { data: prodRows } = await admin.from('products').select('id, name').in('id', productIds)
    const nameById = new Map((prodRows ?? []).map((p) => [p.id, p.name]))

    const lines = (items ?? []).map((row) => ({
      name: nameById.get(row.product_id) ?? 'Producto',
      quantity: row.quantity,
      unit_price: row.unit_price,
      line_total: row.quantity * row.unit_price - (row.discount_amount ?? 0),
    }))

    return NextResponse.json({
      invoice_number: sale.invoice_number,
      total: sale.total,
      status: sale.status,
      payment_pending: sale.payment_pending,
      payment_proof_url: sale.payment_proof_url,
      is_delivery: sale.is_delivery,
      delivery_fee: sale.delivery_fee,
      created_at: sale.created_at,
      branch: branchRow
        ? {
            name: branchRow.name,
            logo_url: branchRow.logo_url,
            payment_nequi: branchRow.payment_nequi,
            payment_bancolombia: branchRow.payment_bancolombia,
            payment_llave: branchRow.payment_llave,
            catalog_slug:
              branchRow.catalog_enabled &&
              branchRow.catalog_slug &&
              String(branchRow.catalog_slug).trim() !== ''
                ? String(branchRow.catalog_slug).trim()
                : null,
          }
        : null,
      items: lines,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
