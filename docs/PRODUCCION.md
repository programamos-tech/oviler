# Checklist para salir a producción

Pasos a seguir para desplegar Oviler (Next.js + Supabase) en producción.

---

## 1. Supabase (proyecto en la nube)

1. Crear un proyecto en [supabase.com](https://supabase.com/dashboard) (o usar uno existente).
2. En **Settings → API** anota:
   - **Project URL** (ej. `https://xxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (solo para backend/Edge Functions; no exponer en el cliente)
3. Aplicar migraciones a la base de datos de producción:
   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```
   O ejecutar manualmente los SQL de `supabase/migrations/` en el SQL Editor.
4. (Opcional) Si necesitas datos iniciales: ejecutar `supabase/seed.sql` o adaptarlo y ejecutarlo una vez.

---

## 2. Extensiones y cron (purga de actividades)

Para que el muro de actividades borre registros de más de 90 días de forma automática:

1. **Extensiones:** En el Dashboard → **Database → Extensions** activar:
   - **pg_cron**
   - **pg_net**

2. **Vault:** En **SQL Editor** ejecutar una vez (sustituir valores reales):
   ```sql
   select vault.create_secret('https://TU_PROJECT_REF.supabase.co', 'project_url');
   select vault.create_secret('TU_ANON_KEY', 'anon_key');
   ```
   (`TU_PROJECT_REF` y `TU_ANON_KEY` son los de Settings → API.)

3. **Edge Function:** Desplegar la función de purga:
   ```bash
   supabase functions deploy purge-activities
   ```

4. **Cron:** Asegurarte de que la migración del cron está aplicada (`20240210230000_purge_activities_cron.sql`). Si usas `supabase db push`, ya está. Si no, ejecuta ese SQL en el Editor. El job se ejecuta cada día a las 03:00 UTC.

---

## 3. Variables de entorno (Next.js)

En tu hosting (Vercel, etc.) configura:

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL del proyecto de producción |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

Opcional (solo si la app usa service role en API routes):

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (no exponer en cliente) |

---

## 4. Desplegar la app Next.js

- **Vercel:** Conectar el repo, definir las variables de entorno anteriores y desplegar.
- **Otro hosting:** `npm run build` y servir con `npm run start`; configurar las mismas variables de entorno.

---

## 5. Auth (si aplica)

- En **Supabase Dashboard → Authentication → URL Configuration** añadir la **Site URL** y **Redirect URLs** de tu dominio de producción (ej. `https://tu-dominio.com`, `https://tu-dominio.com/**`).

---

## Resumen rápido

| Paso | Dónde | Qué hacer |
|------|--------|------------|
| 1 | Supabase | Crear proyecto, aplicar migraciones (y seed si hace falta) |
| 2a | Dashboard | Activar extensiones **pg_cron** y **pg_net** |
| 2b | SQL Editor | Crear secretos Vault: `project_url`, `anon_key` |
| 2c | CLI | `supabase functions deploy purge-activities` |
| 2d | Migraciones | Asegurar que está aplicada la migración del cron |
| 3 | Hosting | Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| 4 | Hosting | Desplegar la app (build + start o Vercel) |
| 5 | Dashboard Auth | Configurar Site URL y Redirect URLs de producción |

Cuando todo esté aplicado, la purga de actividades se ejecutará sola cada día a las 03:00 UTC y el resto dependerá de tu app y dominio.
