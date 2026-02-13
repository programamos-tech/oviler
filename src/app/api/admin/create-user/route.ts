import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Endpoint para crear usuarios directamente usando admin client.
 * Esto evita el flujo de signUp que envía emails automáticamente.
 * 
 * Requiere autenticación previa (solo para usuarios con rol 'owner' o 'admin').
 * 
 * POST /api/admin/create-user
 * Body: { email, password, name, organization_id }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, organization_id } = body as {
      email?: string
      password?: string
      name?: string
      organization_id?: string
    }

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Faltan email, password o name' },
        { status: 400 }
      )
    }

    const emailNorm = String(email).trim().toLowerCase();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials')
      return NextResponse.json(
        {
          error: 'Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. Cópiala desde Supabase → Project Settings → API.',
        },
        { status: 500 }
      )
    }

    const admin = createAdminClient()

    // 1. Crear usuario en auth.users usando admin client (no envía email automáticamente)
    // email_confirm: true confirma el email sin enviar email de confirmación
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true, // Confirmar email automáticamente sin enviar email
      user_metadata: {
        name,
      },
    })

    if (authError || !authData.user) {
      const msg = authError?.message ?? ''
      const isDuplicate =
        authError?.code === 'user_already_exists' ||
        /already exists|already registered|duplicate|ya existe/i.test(msg)
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Este correo ya está registrado.' },
          { status: 409 }
        )
      }
      console.error('Error creating auth user with admin client:', {
        error: authError,
        code: authError?.code,
        message: authError?.message,
      })
      return NextResponse.json(
        {
          error: authError?.message || 'Error al crear el usuario en auth',
          code: authError?.code,
        },
        { status: 500 }
      )
    }

    console.log('User created successfully with admin client:', {
      userId: authData.user.id,
      email: authData.user.email,
    })

    // 2. Si se proporciona organization_id, crear registro en tabla users
    if (organization_id) {
      const { error: userError } = await admin.from('users').insert({
        id: authData.user.id,
        organization_id,
        email: emailNorm,
        name,
        role: 'cashier', // Rol por defecto, puede cambiarse después
        status: 'active',
      })

      if (userError) {
        console.error('Error creating user record:', userError)
        // Intentar eliminar el usuario de auth si falla crear el registro
        await admin.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { error: userError.message || 'Error al crear el registro del usuario' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      user_id: authData.user.id,
      email: authData.user.email,
      message: 'Usuario creado exitosamente',
    })
  } catch (err) {
    console.error('create-user error:', err)
    return NextResponse.json(
      { error: 'Error inesperado' },
      { status: 500 }
    )
  }
}
