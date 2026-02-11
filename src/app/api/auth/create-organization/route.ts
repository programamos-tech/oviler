import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email } = body as { name?: string; email?: string }

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Faltan name o email' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado. Inicia sesión primero.' },
        { status: 401 }
      )
    }

    const admin = createAdminClient()

    const { data: orgData, error: orgError } = await admin
      .from('organizations')
      .insert({
        name: `${name}'s Organization`,
        plan_type: 'basic',
        max_branches: 1,
        max_users: 999999,
      })
      .select()
      .single()

    if (orgError || !orgData) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json(
        { error: orgError?.message || 'Error al crear la organización' },
        { status: 500 }
      )
    }

    const { error: userError } = await admin.from('users').insert({
      id: user.id,
      organization_id: orgData.id,
      email,
      name,
      role: 'owner',
      status: 'active',
    })

    if (userError) {
      console.error('Error creating user record:', userError)
      return NextResponse.json(
        { error: userError.message || 'Error al crear el usuario' },
        { status: 500 }
      )
    }

    return NextResponse.json({ organization_id: orgData.id })
  } catch (err) {
    console.error('create-organization error:', err)
    return NextResponse.json(
      { error: 'Error inesperado' },
      { status: 500 }
    )
  }
}
