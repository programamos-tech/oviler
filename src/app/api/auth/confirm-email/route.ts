import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Confirma el email de un usuario recién creado (p. ej. tras registro sin confirmación).
 * Solo permite confirmar usuarios creados en los últimos 15 minutos.
 * POST /api/auth/confirm-email
 * Body: { userId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { userId } = body as { userId?: string }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      )
    }

    const admin = createAdminClient()
    const { data: user, error: fetchError } = await admin.auth.admin.getUserById(userId)

    if (fetchError || !user?.user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const created = user.user.created_at ? new Date(user.user.created_at).getTime() : 0
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000
    if (created < fifteenMinutesAgo) {
      return NextResponse.json(
        { error: 'Solo se puede confirmar un usuario recién creado' },
        { status: 400 }
      )
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (updateError) {
      console.error('confirm-email updateUserById:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Error al confirmar el email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('confirm-email error:', err)
    return NextResponse.json(
      { error: 'Error inesperado' },
      { status: 500 }
    )
  }
}
