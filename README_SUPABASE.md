# Configuración de Supabase para NOU

## Opción A: Supabase local (recomendado para desarrollo)

Necesitas **Docker** instalado y en ejecución.

Si ya tienes otro proyecto Supabase local corriendo y da error de puerto:
`npx supabase stop --project-id <otro-proyecto>` y vuelve a intentar.

```bash
# 1. Levantar Supabase local (API, Auth, DB, Studio)
npx supabase start

# 2. Copiar la URL y la anon key que imprime el comando y pegarlas en .env.local:
#    API URL: http://127.0.0.1:54321
#    anon key: (la que muestre "anon" en la tabla)
```

En `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<la anon key que muestra supabase start>
```

- **Studio (DB UI):** http://127.0.0.1:54323  
- **Parar:** `npx supabase stop`

---

## Opción B: Supabase en la nube

### 1. Crear proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta o inicia sesión
2. Crea un nuevo proyecto
3. Anota la URL del proyecto y la API Key (anon/public key)

### 2. Configurar variables de entorno

1. Copia `.env.local.example` a `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edita `.env.local` y agrega tus credenciales de Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
   ```

### 3. Ejecutar el schema SQL

1. Ve al SQL Editor en tu proyecto de Supabase
2. Abre el archivo `supabase/schema.sql`
3. Copia y pega todo el contenido en el SQL Editor
4. Ejecuta el script (botón "Run" o Cmd/Ctrl + Enter)

### 4. Configurar Storage para logos

1. Ve a Storage en el dashboard de Supabase
2. Crea un nuevo bucket llamado `logos`
3. Configura las políticas RLS:
   - Policy name: "Users can upload logos for their organization"
   - Policy: 
     ```sql
     CREATE POLICY "Users can upload logos for their organization"
     ON storage.objects FOR INSERT
     WITH CHECK (
       bucket_id = 'logos' AND
       (storage.foldername(name))[1] IN (
         SELECT id::text FROM users WHERE id = auth.uid()
       )
     );
     ```
   - Policy para lectura:
     ```sql
     CREATE POLICY "Users can view logos from their organization"
     ON storage.objects FOR SELECT
     USING (
       bucket_id = 'logos' AND
       (storage.foldername(name))[1] IN (
         SELECT id::text FROM users WHERE id = auth.uid()
       )
     );
     ```

### 5. Verificar configuración

1. Reinicia el servidor de desarrollo: `npm run dev`
2. Intenta registrarte en `/registro`
3. Completa el onboarding en `/onboarding`
4. Deberías ser redirigido al dashboard

## Estructura de la base de datos

- **organizations**: Tenant principal (quien paga)
- **users**: Usuarios vinculados a auth.users
- **branches**: Sucursales pertenecientes a una organización
- **user_branches**: Relación muchos a muchos entre usuarios y sucursales
- **products**: Productos de la organización
- **inventory**: Stock por sucursal
- **sales**: Ventas por sucursal
- **customers**: Clientes de la organización

## Límites de planes

- **Basic**: 1 sucursal, usuarios ilimitados
- **Intermediate**: 5 sucursales, 10 usuarios
- **Advanced**: 10 sucursales, 20 usuarios

Los límites se validan automáticamente con triggers en la base de datos.
