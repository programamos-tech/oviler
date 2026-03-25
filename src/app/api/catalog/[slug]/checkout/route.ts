import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBranchByCatalogSlug, resolveSaleUserIdForCatalog } from '@/lib/catalog-server'
import { catalogSalePrice } from '@/lib/catalog-price'
import { formatCedulaForStorage, normalizeCedulaForUniqueness } from '@/lib/customer-cedula'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

type CartLine = { product_id: string; quantity: number }

type Body = {
  items: CartLine[]
  customer_name: string
  cedula: string
  phone: string
  email?: string | null
  /** Dirección existente del cliente */
  delivery_address_id?: string | null
  /** Si no hay dirección previa o elige nueva */
  address_label?: string
  address?: string
  reference_point?: string
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const items = Array.isArray(body.items) ? body.items : []
  const customerName = (body.customer_name ?? '').trim()
  const cedulaRaw = body.cedula ?? ''
  const cedulaStored = formatCedulaForStorage(cedulaRaw)
  const cedulaNorm = normalizeCedulaForUniqueness(cedulaRaw)
  const phone = (body.phone ?? '').trim()

  if (!customerName || !cedulaStored || !cedulaNorm || !phone) {
    return NextResponse.json({ error: 'Nombre, cédula y teléfono son obligatorios.' }, { status: 400 })
  }
  if (items.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío.' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const branch = await getBranchByCatalogSlug(admin, slug)
    if (!branch) {
      return NextResponse.json({ error: 'Catálogo no disponible' }, { status: 404 })
    }

    const deliveryFee = Math.max(0, Math.floor(Number(branch.catalog_delivery_fee_cop) || 0))

    const userId = await resolveSaleUserIdForCatalog(admin, branch.organization_id)
    if (!userId) {
      return NextResponse.json({ error: 'No se pudo registrar el pedido (sin usuario dueño).' }, { status: 500 })
    }

    const productIds = [...new Set(items.map((i) => i.product_id))]
    const { data: products, error: prodErr } = await admin
      .from('products')
      .select('id, organization_id, base_price, apply_iva, name')
      .in('id', productIds)
      .eq('organization_id', branch.organization_id)

    if (prodErr || !products?.length) {
      return NextResponse.json({ error: 'Productos no válidos.' }, { status: 400 })
    }

    const productById = new Map(products.map((p) => [p.id, p]))
    const { data: invRows } = await admin
      .from('inventory')
      .select('product_id, quantity')
      .eq('branch_id', branch.id)
      .in('product_id', productIds)

    const stock = new Map((invRows ?? []).map((r) => [r.product_id, r.quantity ?? 0]))

    let subtotal = 0
    const lineDetails: { product_id: string; quantity: number; unit_price: number; name: string }[] = []

    for (const line of items) {
      const q = Math.floor(Number(line.quantity))
      if (q < 1) continue
      const p = productById.get(line.product_id)
      if (!p) {
        return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 400 })
      }
      const available = stock.get(line.product_id) ?? 0
      if (q > available) {
        return NextResponse.json(
          { error: `Stock insuficiente para "${p.name}". Disponible: ${available}.` },
          { status: 400 }
        )
      }
      const unit = catalogSalePrice(p.base_price, Boolean(p.apply_iva))
      subtotal += unit * q
      lineDetails.push({ product_id: line.product_id, quantity: q, unit_price: unit, name: p.name })
    }

    if (lineDetails.length === 0) {
      return NextResponse.json({ error: 'No hay líneas válidas en el pedido.' }, { status: 400 })
    }

    const total = subtotal + deliveryFee

    let customerId: string
    const { data: existing } = await admin
      .from('customers')
      .select('id')
      .eq('organization_id', branch.organization_id)
      .eq('branch_id', branch.id)
      .eq('cedula_norm', cedulaNorm)
      .maybeSingle()

    if (existing?.id) {
      customerId = existing.id
      await admin
        .from('customers')
        .update({
          name: customerName,
          cedula: cedulaStored,
          phone: phone || null,
          email: (body.email ?? '').trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)
    } else {
      const { data: created, error: cErr } = await admin
        .from('customers')
        .insert({
          organization_id: branch.organization_id,
          branch_id: branch.id,
          name: customerName,
          cedula: cedulaStored,
          phone: phone || null,
          email: (body.email ?? '').trim() || null,
        })
        .select('id')
        .single()
      if (cErr || !created?.id) {
        console.error(cErr)
        const msg =
          cErr && typeof cErr === 'object' && 'code' in cErr && (cErr as { code: string }).code === '23505'
            ? 'Ya existe un cliente con esta cédula en esta sucursal.'
            : 'No se pudo crear el cliente.'
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      customerId = created.id
    }

    let addressId: string | null = null
    if (body.delivery_address_id) {
      const { data: addr } = await admin
        .from('customer_addresses')
        .select('id')
        .eq('id', body.delivery_address_id)
        .eq('customer_id', customerId)
        .maybeSingle()
      if (addr?.id) addressId = addr.id
    }

    if (!addressId) {
      const addrText = (body.address ?? '').trim()
      if (!addrText) {
        return NextResponse.json({ error: 'La dirección de entrega es obligatoria.' }, { status: 400 })
      }
      const label = (body.address_label ?? 'Entrega').trim() || 'Entrega'
      const { data: newAddr, error: aErr } = await admin
        .from('customer_addresses')
        .insert({
          customer_id: customerId,
          label,
          address: addrText,
          reference_point: (body.reference_point ?? '').trim() || null,
          is_default: true,
          display_order: 0,
        })
        .select('id')
        .single()
      if (aErr || !newAddr?.id) {
        console.error(aErr)
        return NextResponse.json({ error: 'No se pudo guardar la dirección.' }, { status: 500 })
      }
      addressId = newAddr.id
    }

    const { count } = await admin
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branch.id)
    const nextNum = (count ?? 0) + 1
    const invoiceNumber = nextNum >= 1000 ? String(nextNum) : String(nextNum).padStart(3, '0')

    const { data: sale, error: saleErr } = await admin
      .from('sales')
      .insert({
        branch_id: branch.id,
        user_id: userId,
        customer_id: customerId,
        invoice_number: invoiceNumber,
        total,
        payment_method: 'transfer',
        status: 'pending',
        is_delivery: true,
        delivery_address_id: addressId,
        delivery_fee: deliveryFee,
        delivery_paid: false,
        payment_pending: true,
        channel: 'web_catalog',
      })
      .select('id, public_tracking_token')
      .single()

    if (saleErr || !sale?.id || !sale.public_tracking_token) {
      console.error(saleErr)
      return NextResponse.json({ error: 'No se pudo crear el pedido.' }, { status: 500 })
    }

    const saleItems = lineDetails.map((l) => ({
      sale_id: sale.id,
      product_id: l.product_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
      discount_percent: 0,
      discount_amount: 0,
    }))

    const { error: itemsErr } = await admin.from('sale_items').insert(saleItems)
    if (itemsErr) {
      console.error(itemsErr)
      await admin.from('sales').delete().eq('id', sale.id)
      return NextResponse.json({ error: 'No se pudieron guardar los ítems del pedido.' }, { status: 500 })
    }

    return NextResponse.json({
      sale_id: sale.id,
      tracking_token: sale.public_tracking_token,
      tracking_path: `/t/pedido/${sale.public_tracking_token}`,
      total,
      subtotal,
      delivery_fee: deliveryFee,
      payment: {
        nequi: branch.payment_nequi,
        bancolombia: branch.payment_bancolombia,
        llave: branch.payment_llave,
      },
      branch_name: branch.name,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
