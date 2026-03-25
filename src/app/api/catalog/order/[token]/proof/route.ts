import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ token: string }> }

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * POST multipart: file — sube comprobante para el pedido identificado por token en la URL.
 */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!token || !uuidRe.test(token)) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Formulario inválido' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo no debe superar 5 MB.' }, { status: 400 })
  }
  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG o WebP.' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { data: sale, error: sErr } = await admin
      .from('sales')
      .select('id, branch_id, payment_proof_url')
      .eq('public_tracking_token', token)
      .eq('channel', 'web_catalog')
      .maybeSingle()

    if (sErr || !sale) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (sale.payment_proof_url) {
      return NextResponse.json({ error: 'Ya se subió un comprobante para este pedido.' }, { status: 409 })
    }

    const { data: br, error: bErr } = await admin
      .from('branches')
      .select('organization_id')
      .eq('id', sale.branch_id)
      .single()

    if (bErr || !br?.organization_id) {
      return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }

    const orgId = br.organization_id
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
    const path = `${orgId}/${sale.id}_${Date.now()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await admin.storage.from('payment-proofs').upload(path, buf, {
      contentType: mime,
      upsert: false,
    })
    if (upErr) {
      console.error(upErr)
      return NextResponse.json({ error: 'No se pudo subir el archivo.' }, { status: 500 })
    }

    const { error: updErr } = await admin
      .from('sales')
      .update({ payment_proof_url: path, updated_at: new Date().toISOString() })
      .eq('id', sale.id)

    if (updErr) {
      console.error(updErr)
      await admin.storage.from('payment-proofs').remove([path])
      return NextResponse.json({ error: 'No se pudo registrar el comprobante.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, path })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
