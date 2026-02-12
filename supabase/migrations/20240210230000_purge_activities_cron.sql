-- Programar purga de actividades >90 días vía Edge Function (pg_cron + pg_net).
-- Requisitos: extensiones pg_cron y pg_net habilitadas (Dashboard → Database → Extensions).
-- Antes de aplicar, crear secretos en Vault (SQL Editor o Dashboard → Vault):
--   select vault.create_secret('https://TU_PROJECT_REF.supabase.co', 'project_url');
--   select vault.create_secret('TU_ANON_KEY', 'anon_key');

select cron.schedule(
  'purge-activities-90-days',
  '0 3 * * *',  -- todos los días a las 03:00 UTC
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/purge-activities',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
