# Solución: Crear usuarios sin límites de email

## Problema
El límite de rate limit de emails de Supabase está impidiendo crear usuarios cuando se necesita.

## Soluciones disponibles

### Opción 1: Usar el endpoint admin (RECOMENDADO)
He creado un endpoint `/api/admin/create-user` que crea usuarios directamente usando el admin client, evitando completamente el envío de emails.

**Cómo usarlo:**
```bash
POST /api/admin/create-user
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "name": "Nombre Usuario",
  "organization_id": "uuid-de-organizacion" // Opcional
}
```

**Ventajas:**
- ✅ No envía emails automáticamente
- ✅ No tiene límites de rate limit
- ✅ Confirma el email automáticamente (`email_confirm: true`)
- ✅ Puede crear usuarios en masa

### Opción 2: Crear usuarios desde Supabase Dashboard
1. Ve a **Supabase Dashboard → Authentication → Users**
2. Click en **"Add user"** → **"Create new user"**
3. Completa email y password
4. Marca **"Auto Confirm User"** para evitar envío de email
5. Después, crea el registro en la tabla `users` manualmente o usa el endpoint admin

### Opción 3: Configurar SMTP personalizado
En **Supabase Dashboard → Settings → Auth → Email**:
1. Configura un servidor SMTP (SendGrid, AWS SES, etc.)
2. Esto aumenta o elimina los límites de rate limit
3. Requiere configuración adicional pero es la solución más profesional

### Opción 4: Deshabilitar completamente el envío de emails
En **Supabase Dashboard → Settings → Auth → Email**:
1. Desactiva todas las notificaciones por email
2. Los usuarios se crearán sin confirmación de email
3. ⚠️ Menos seguro pero evita completamente los límites

## Implementación actual

El código de registro (`/registro`) ahora tiene un **fallback automático**:
1. Intenta crear usuario con `signUp()` normal
2. Si falla por rate limit, automáticamente intenta crear con `/api/admin/create-user`
3. Si ambos fallan, muestra un mensaje claro al usuario

## Crear usuarios programáticamente

Puedes crear usuarios desde tu código usando el endpoint admin:

```typescript
const response = await fetch('/api/admin/create-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'nuevo@usuario.com',
    password: 'password123',
    name: 'Nombre Usuario',
    organization_id: 'uuid-org' // Opcional
  })
})
```

## Notas importantes

- El endpoint `/api/admin/create-user` usa `service_role` key, por lo que bypass RLS
- Los usuarios creados con este método tienen `email_confirm: true` automáticamente
- Si proporcionas `organization_id`, se crea automáticamente el registro en la tabla `users`
- Si no proporcionas `organization_id`, solo se crea el usuario en `auth.users`
