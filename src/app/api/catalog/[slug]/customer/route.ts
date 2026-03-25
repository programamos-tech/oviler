import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBranchByCatalogSlug } from '@/lib/catalog-server'
import { normalizeCedulaForUniqueness } from '@/lib/customer-cedula'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

/**
 * GET ?cedula= — busca cliente por cédula en la sucursal del catálogo y devuelve direcciones.
 */
export async function GET(request: Request, { params }: Params) {
  const { slug } = await params
  const raw = new URL(request.url).searchParams.get('cedula') ?? ''
  const cedulaNorm = normalizeCedulaForUniqueness(raw)
  if (!cedulaNorm) {
    return NextResponse.json({ customer: null, addresses: [] })
  }

  try {
    const admin = createAdminClient()
    const branch = await getBranchByCatalogSlug(admin, slug)
    if (!branch) {
      return NextResponse.json({ error: 'Catálogo no disponible' }, { status: 404 })
    }

    const { data: customer } = await admin
      .from('customers')
      .select('id, name, phone, email, cedula')
      .eq('organization_id', branch.organization_id)
      .eq('branch_id', branch.id)
      .eq('cedula_norm', cedulaNorm)
      .maybeSingle()

    if (!customer) {
      return NextResponse.json({ customer: null, addresses: [] })
    }

    const { data: addresses } = await admin
      .from('customer_addresses')
      .select('id, label, address, reference_point, is_default, display_order')
      .eq('customer_id', customer.id)
      .order('display_order', { ascending: true })

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        cedula: customer.cedula,
      },
      addresses: addresses ?? [],
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
