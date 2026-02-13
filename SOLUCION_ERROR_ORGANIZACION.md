# Solución: Error al crear la organización

## Problema
Al intentar crear un usuario en producción aparece el error: "Error al crear la organización. Por favor intenta de nuevo."

## Causas posibles

### 1. Variable de entorno faltante (MÁS PROBABLE)
En producción (Vercel, Netlify, etc.) falta la variable `SUPABASE_SERVICE_ROLE_KEY`.

**Solución:**
1. Ve a tu plataforma de hosting (Vercel, etc.)
2. Ve a **Settings → Environment Variables**
3. Agrega estas variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://haykaglpailcifcybjfv.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhheWthZ2xwYWlsY2lmY3liamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjkwMDAsImV4cCI6MjA4NjU0NTAwMH0.Io8d9QQokrGkxOHcwZaUkjXiY6xnSyRg1unLrl-WDmQ`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhheWthZ2xwYWlsY2lmY3liamZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk2OTAwMCwiZXhwIjoyMDg2NTQ1MDAwfQ.KLjo5Jg3G6wZfQuI4gBTcxb_IOVl0xBUPhNES9AwvLg`
4. **IMPORTANTE:** Marca `SUPABASE_SERVICE_ROLE_KEY` como **solo servidor** (no exponer al cliente)
5. Redespliega la aplicación

### 2. Verificar logs del servidor
Revisa los logs de tu plataforma de hosting para ver el error exacto. El código ahora muestra más detalles:
- Si falta alguna variable de entorno
- El código de error de Supabase
- Detalles y hints del error

### 3. Verificar políticas RLS en Supabase
Aunque el admin client debería bypass RLS, verifica que las tablas `organizations` y `users` existan y tengan RLS habilitado.

**En Supabase Dashboard:**
1. Ve a **Database → Tables**
2. Verifica que existan las tablas `organizations` y `users`
3. Verifica que RLS esté habilitado (debería estar)

## Cómo verificar que funciona

1. Intenta crear un nuevo usuario desde `/registro`
2. Revisa los logs del servidor para ver si hay errores más específicos
3. Si el error persiste, comparte el mensaje exacto del log

## Notas importantes

- `SUPABASE_SERVICE_ROLE_KEY` es crítica para crear organizaciones porque bypass RLS
- Esta key NO debe estar en el código del cliente, solo en variables de entorno del servidor
- Si cambias las variables de entorno, necesitas redesplegar la app
